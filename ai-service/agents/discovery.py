import json
import asyncio
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..config.settings import settings
from ..knowledge.prompts import DISCOVERY_SYSTEM_PROMPT
from ..tools.search_tools import semantic_search

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.2,
)

_FILTER_PROMPT = (
    "Extract search filters from the user query as JSON with keys: "
    "cuisine, area, price_range, query_text. "
    "Use empty string for any field not mentioned. Return only valid JSON."
)


def search_restaurants(state: dict) -> dict:
    messages = state["messages"]
    user_message = messages[-1].content

    # Extract structured filters from natural language
    filter_response = llm.invoke([
        SystemMessage(content=_FILTER_PROMPT),
        HumanMessage(content=user_message),
    ])
    try:
        raw = filter_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        filters = json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        filters = {"query_text": user_message}

    query_text = filters.pop("query_text", user_message) or user_message
    active_filters = {k: v for k, v in filters.items() if v}

    results = asyncio.run(semantic_search(query=query_text, limit=5, filters=active_filters))
    results_text = json.dumps(results[:5], indent=2, default=str)

    # Let the LLM compose a natural language response from raw results
    response = llm.invoke([
        SystemMessage(content=DISCOVERY_SYSTEM_PROMPT),
        HumanMessage(content=f"User asked: {user_message}\n\nSearch results:\n{results_text}"),
    ])

    return {
        **state,
        "search_results": results,
        "final_response": response.content,
    }
