import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings
from knowledge.prompts import DISCOVERY_SYSTEM_PROMPT
from tools.search_tools import semantic_search
from tools.trace import record, now

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


async def search_restaurants(state: dict) -> dict:
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

    t0 = now()
    results = await semantic_search(query=query_text, limit=5, filters=active_filters)
    record(
        state, "tool_call", "Semantic Search (pgvector)", started_at=t0,
        query=query_text, filters=active_filters, resultCount=len(results),
    )

    if results:
        final_response = "__RESTAURANT_LIST__"
    else:
        final_response = "I couldn't find any restaurants matching your search. Try different keywords or broaden your filters."

    return {
        **state,
        "search_results": results,
        "final_response": final_response,
    }
