import json
from datetime import datetime
from zoneinfo import ZoneInfo
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from knowledge.prompts import RECOMMENDATION_SYSTEM_PROMPT
from tools.neo4j_tools import get_user_preferences
from tools.search_tools import semantic_search
from tools.weather_tools import get_current_weather
from tools.trace import record, now

_COLOMBO_TZ = ZoneInfo("Asia/Colombo")


def _time_of_day(hour: int) -> str:
    if hour < 11:
        return "morning"
    if hour < 15:
        return "lunch"
    if hour < 18:
        return "afternoon"
    if hour < 22:
        return "evening"
    return "late night"


async def _situational_context() -> dict:
    """Time-of-day, day-of-week, and (if configured) current weather in
    Colombo — folded into every recommendation path so the LLM can favor,
    e.g., a lively dinner spot on Friday evening or an indoor place when
    it's raining, without the user having to say so."""
    local_now = datetime.now(_COLOMBO_TZ)
    context = {
        "time_of_day": _time_of_day(local_now.hour),
        "day_of_week": local_now.strftime("%A"),
        "is_weekend": local_now.weekday() >= 5,
    }
    weather = await get_current_weather()
    if weather:
        context["weather"] = f"{weather['condition'].lower()}, {weather['temp_c']}°C"
    return context

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

_EXTRACT_PREFS_PROMPT = """Extract any stated cuisine preferences and occasion from the ENTIRE conversation
below, including the very latest message — the user may state their taste in their first message
(e.g. "suggest a romantic Italian place") rather than waiting to be asked.
Return JSON only:
{
  "cuisines": ["list of cuisine types mentioned, or empty"],
  "occasion": "occasion mentioned or empty"
}"""


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
    lat, lng = state.get("lat"), state.get("lng")

    t0 = now()
    user_prefs = get_user_preferences(user_id)
    record(
        state, "tool_call", "Neo4j Preference Lookup", started_at=t0,
        preferenceCount=len(user_prefs["preferences"]), visitedCount=len(user_prefs["visited"]),
    )

    situational = await _situational_context()
    if lat is not None and lng is not None:
        situational["user_location_shared"] = True
    record(state, "tool_call", "Situational Context (time/day/weather)", **situational)

    # If we have Neo4j history, use it directly
    if user_prefs["preferences"]:
        top_cuisines = [p["cuisine"] for p in user_prefs["preferences"][:3]]
        query = f"restaurants serving {', '.join(top_cuisines)} cuisine in Colombo"
        results = await semantic_search(query=query, limit=8, lat=lat, lng=lng)
        record(state, "tool_call", "Semantic Search (personalised)", query=query, resultCount=len(results))
        visited_ids = {r["id"] for r in user_prefs["visited"]}
        fresh = [r for r in results if r["id"] not in visited_ids][:3]
        context = {
            "user_preferences": user_prefs["preferences"],
            "visited_restaurants": user_prefs["visited"],
            "recommendations": fresh,
            "situational_context": situational,
        }
        response = llm.invoke([
            SystemMessage(content=RECOMMENDATION_SYSTEM_PROMPT),
            HumanMessage(content=f"User: {user_message}\n\nContext:\n{json.dumps(context, default=str)}"),
        ])
        return {**state, "recommendation_results": fresh, "final_response": response.content}

    # No Neo4j history — ALWAYS try to extract stated preferences from the
    # full conversation so far (including the very latest message), rather
    # than only after clarifying questions have already been asked. Gating
    # extraction behind "already asked" meant a first message like "suggest
    # a romantic Italian place" was ignored outright and the clarifying
    # questions were asked anyway.
    conversation = _conversation_text(messages)
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
        prefs = {}

    cuisines = prefs.get("cuisines") or []
    occasion = (prefs.get("occasion") or "").strip()
    record(state, "extraction", "Extract Stated Preferences", cuisines=cuisines, occasion=occasion)

    already_asked = _clarifying_questions_already_asked(messages[:-1])

    if cuisines or occasion:
        query_parts = []
        if cuisines:
            query_parts.append(f"{', '.join(cuisines)} cuisine")
        if occasion:
            query_parts.append(f"for {occasion}")
        query = f"restaurants in Colombo serving {' '.join(query_parts)}"

        results = await semantic_search(query=query, limit=5, lat=lat, lng=lng)
        context = {
            "user_preferences": [{"cuisine": c} for c in cuisines],
            "occasion": occasion,
            "visited_restaurants": [],
            "recommendations": results[:3],
            "situational_context": situational,
        }
        response = llm.invoke([
            SystemMessage(content=RECOMMENDATION_SYSTEM_PROMPT),
            HumanMessage(content=f"User: {user_message}\n\nContext:\n{json.dumps(context, default=str)}"),
        ])
        return {**state, "recommendation_results": results[:3], "final_response": response.content}

    # Nothing extractable. Ask the clarifying questions — but only ONCE per
    # conversation. If we already asked and still got nothing usable back,
    # don't repeat the same question again (that's the loop this was fixing)
    # — fall back to a generic well-reviewed recommendation instead.
    if not already_asked:
        return {**state, "final_response": _NEW_USER_RESPONSE}

    results = await semantic_search(query="popular highly rated restaurants in Colombo", limit=5, lat=lat, lng=lng)
    context = {
        "user_preferences": [],
        "occasion": "",
        "visited_restaurants": [],
        "recommendations": results[:3],
        "situational_context": situational,
    }
    response = llm.invoke([
        SystemMessage(
            content=RECOMMENDATION_SYSTEM_PROMPT
            + "\n\nThe user didn't give a clear cuisine or occasion even after being asked. "
              "Don't ask again — recommend a few generally well-reviewed options instead, and "
              "mention they can always narrow it down later with a cuisine or occasion."
        ),
        HumanMessage(content=f"User: {user_message}\n\nContext:\n{json.dumps(context, default=str)}"),
    ])
    return {**state, "recommendation_results": results[:3], "final_response": response.content}
