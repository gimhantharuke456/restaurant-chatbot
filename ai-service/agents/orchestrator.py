import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from knowledge.prompts import ORCHESTRATOR_SYSTEM_PROMPT
from tools.trace import record, now

_BOOKING_MARKER = "Booking ref:"
_PAYMENT_LINK_MARKER = "Payment link:"

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.3,
)


def orchestrate(state: dict) -> dict:
    t0 = now()
    messages = state["messages"]
    user_message = messages[-1].content

    # Build a short history string (last 6 turns) for context
    history_lines = [
        f"{m.type}: {m.content}"
        for m in messages[:-1][-6:]
    ]
    history_text = "\n".join(history_lines) if history_lines else "(no prior history)"

    response = llm.invoke([
        SystemMessage(content=ORCHESTRATOR_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation history:\n{history_text}\n\nLatest user message: {user_message}"),
    ])

    raw = response.content.strip()

    # Strip markdown code fences if the model wraps the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    entities: dict = {}
    try:
        parsed = json.loads(raw)
        intent = parsed.get("intent", "GENERAL")
        final_response = parsed.get("response", "")
        entities = parsed.get("entities", {}) or {}
    except (json.JSONDecodeError, AttributeError):
        intent = "GENERAL"
        final_response = response.content

    record(
        state, "orchestrator", "Intent Classification", started_at=t0,
        intent=intent, entities=entities, userMessage=user_message,
    )

    # After a booking is confirmed, force payment/ordering flow until the
    # payment link is sent — regardless of what the user typed.
    ai_messages = [m for m in messages if isinstance(m, AIMessage)]
    booking_confirmed = any(_BOOKING_MARKER in m.content for m in ai_messages)
    payment_sent = any(_PAYMENT_LINK_MARKER in m.content for m in ai_messages)

    if booking_confirmed and not payment_sent:
        intent = "PAYMENT"
        final_response = ""  # payment agent generates the response
        record(
            state, "orchestrator", "Forced Payment Follow-up",
            reason="A booking was confirmed earlier in this conversation and no payment link has been sent yet.",
        )

    return {
        **state,
        "intent": intent,
        "current_agent": intent,
        "final_response": final_response,
    }
