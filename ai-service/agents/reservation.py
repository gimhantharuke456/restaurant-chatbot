import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from knowledge.prompts import RESERVATION_SYSTEM_PROMPT
from tools.firestore_tools import get_availability, lookup_restaurant_by_name

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)

_EXTRACT_PROMPT = """Extract ALL accumulated reservation details from the FULL conversation below.
Merge information from every turn — do not lose details mentioned in earlier messages.
Return JSON only:
{
  "action": "BOOK | MODIFY | CANCEL | CHECK",
  "restaurant_name": "",
  "restaurant_id": "",
  "date": "YYYY-MM-DD or empty",
  "time": "HH:MM or empty",
  "party_size": null,
  "special_requests": ""
}"""


def _build_conversation_text(messages: list) -> str:
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"User: {m.content}")
        elif isinstance(m, AIMessage):
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


def handle_reservation(state: dict) -> dict:
    messages = state["messages"]
    conversation = _build_conversation_text(messages)

    # Extract accumulated details from FULL conversation
    extract_response = llm.invoke([
        SystemMessage(content=_EXTRACT_PROMPT),
        HumanMessage(content=conversation),
    ])

    try:
        raw = extract_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        details = json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        details = {"action": "CHECK"}

    # Auto-resolve restaurant_id from name when the LLM didn't extract one
    if not details.get("restaurant_id") and details.get("restaurant_name"):
        match = lookup_restaurant_by_name(details["restaurant_name"])
        if match:
            details["restaurant_id"] = match["restaurant_id"]

    context: dict = {"details": details, "available_slots": []}

    if details.get("action") == "BOOK" and details.get("restaurant_id") and details.get("date"):
        slots = get_availability(details["restaurant_id"], details["date"])
        context["available_slots"] = [s for s in slots if s.get("available")]

    # Pass full conversation so the response LLM has all context
    response = llm.invoke([
        SystemMessage(content=RESERVATION_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation so far:\n{conversation}\n\nExtracted details: {json.dumps(details)}\nContext: {json.dumps(context)}"),
    ])

    return {
        **state,
        "reservation_details": details,
        "final_response": response.content,
    }
