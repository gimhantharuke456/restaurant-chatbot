import json
import asyncio
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings
from knowledge.prompts import DISCOVERY_SYSTEM_PROMPT
from tools.search_tools import semantic_search

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

    if results:
        final_response = "__RESTAURANT_LIST__"
    else:
        final_response = "I couldn't find any restaurants matching your search. Try different keywords or broaden your filters."

    return {
        **state,
        "search_results": results,
        "final_response": final_response,
    }
