import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..config.settings import settings
from ..knowledge.prompts import RESERVATION_SYSTEM_PROMPT
from ..tools.firestore_tools import get_availability

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)

_EXTRACT_PROMPT = """Extract reservation details from the user message as JSON:
{
  "action": "BOOK | MODIFY | CANCEL | CHECK",
  "restaurant_id": "",
  "date": "YYYY-MM-DD or empty",
  "time": "HH:MM or empty",
  "party_size": null,
  "special_requests": ""
}
Return only valid JSON."""


def handle_reservation(state: dict) -> dict:
    messages = state["messages"]
    user_message = messages[-1].content

    extract_response = llm.invoke([
        SystemMessage(content=_EXTRACT_PROMPT),
        HumanMessage(content=user_message),
    ])

    try:
        raw = extract_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        details = json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        details = {"action": "CHECK"}

    context: dict = {"details": details, "available_slots": []}

    # Fetch real availability when booking
    if details.get("action") == "BOOK" and details.get("restaurant_id") and details.get("date"):
        slots = get_availability(details["restaurant_id"], details["date"])
        context["available_slots"] = [s for s in slots if s.get("available")]

    response = llm.invoke([
        SystemMessage(content=RESERVATION_SYSTEM_PROMPT),
        HumanMessage(content=f"User: {user_message}\nContext: {json.dumps(context)}"),
    ])

    return {
        **state,
        "reservation_details": details,
        "final_response": response.content,
    }
