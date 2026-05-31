import json
import asyncio
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings
from knowledge.prompts import RECOMMENDATION_SYSTEM_PROMPT
from tools.neo4j_tools import get_user_preferences
from tools.search_tools import semantic_search

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.4,
)

_NEW_USER_RESPONSE = (
    "I'd love to recommend some great restaurants for you! "
    "To personalise my suggestions, could you tell me:\n"
    "1. What type of cuisine do you enjoy? (e.g. Sri Lankan, Italian, Japanese)\n"
    "2. What's the occasion — a romantic date, family dinner, business lunch, or casual hangout?"
)


def recommend_restaurants(state: dict) -> dict:
    user_id = state["user_id"]
    messages = state["messages"]
    user_message = messages[-1].content

    user_prefs = get_user_preferences(user_id)

    # No history yet — ask clarifying questions instead of guessing
    if not user_prefs["preferences"]:
        return {**state, "final_response": _NEW_USER_RESPONSE}

    top_cuisines = [p["cuisine"] for p in user_prefs["preferences"][:3]]
    query = f"restaurants serving {', '.join(top_cuisines)} cuisine in Colombo"
    results = asyncio.run(semantic_search(query=query, limit=8))

    # Filter out places they've already visited
    visited_ids = {r["id"] for r in user_prefs["visited"]}
    fresh = [r for r in results if r["id"] not in visited_ids][:3]

    context = {
        "user_preferences": user_prefs["preferences"],
        "visited_restaurants": user_prefs["visited"],
        "recommendations": fresh,
    }

    response = llm.invoke([
        SystemMessage(content=RECOMMENDATION_SYSTEM_PROMPT),
        HumanMessage(content=f"User: {user_message}\n\nContext:\n{json.dumps(context, default=str)}"),
    ])

    return {
        **state,
        "recommendation_results": fresh,
        "final_response": response.content,
    }
