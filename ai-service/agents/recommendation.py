import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

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

_EXTRACT_PREFS_PROMPT = """Extract any stated cuisine preferences and occasion from the conversation.
Return JSON only:
{
  "cuisines": ["list of cuisine types mentioned, or empty"],
  "occasion": "occasion mentioned or empty",
  "preferences_stated": true or false
}
If the user has answered questions about cuisine or occasion, set preferences_stated to true."""


def _conversation_text(messages: list) -> str:
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"User: {m.content}")
        elif isinstance(m, AIMessage):
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


def _clarifying_questions_already_asked(messages: list) -> bool:
    for m in messages:
        if isinstance(m, AIMessage) and "What type of cuisine" in m.content:
            return True
    return False


async def recommend_restaurants(state: dict) -> dict:
    user_id = state["user_id"]
    messages = state["messages"]
    user_message = messages[-1].content

    user_prefs = get_user_preferences(user_id)

    # If we have Neo4j history, use it directly
    if user_prefs["preferences"]:
        top_cuisines = [p["cuisine"] for p in user_prefs["preferences"][:3]]
        query = f"restaurants serving {', '.join(top_cuisines)} cuisine in Colombo"
        results = await semantic_search(query=query, limit=8)
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
        return {**state, "recommendation_results": fresh, "final_response": response.content}

    # No Neo4j history — try to extract preferences from the conversation
    conversation = _conversation_text(messages)
    already_asked = _clarifying_questions_already_asked(messages[:-1])

    if already_asked:
        # User has answered the clarifying questions — extract and use their stated preferences
        extract_response = llm.invoke([
            SystemMessage(content=_EXTRACT_PREFS_PROMPT),
            HumanMessage(content=conversation),
        ])
        try:
            raw = extract_response.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1].lstrip("json").strip()
            prefs = json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            prefs = {"cuisines": [], "occasion": "", "preferences_stated": False}

        if prefs.get("preferences_stated") and (prefs.get("cuisines") or prefs.get("occasion")):
            cuisines = prefs.get("cuisines", [])
            occasion = prefs.get("occasion", "")
            query_parts = []
            if cuisines:
                query_parts.append(f"{', '.join(cuisines)} cuisine")
            if occasion:
                query_parts.append(f"for {occasion}")
            query = f"restaurants in Colombo serving {' '.join(query_parts)}"

            results = await semantic_search(query=query, limit=5)
            context = {
                "user_preferences": [{"cuisine": c} for c in cuisines],
                "occasion": occasion,
                "visited_restaurants": [],
                "recommendations": results[:3],
            }
            response = llm.invoke([
                SystemMessage(content=RECOMMENDATION_SYSTEM_PROMPT),
                HumanMessage(content=f"User: {user_message}\n\nContext:\n{json.dumps(context, default=str)}"),
            ])
            return {**state, "recommendation_results": results[:3], "final_response": response.content}

    # Clarifying questions not yet asked (or answers not extractable) — ask them
    return {**state, "final_response": _NEW_USER_RESPONSE}
