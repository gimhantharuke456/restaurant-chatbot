import json
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..config.settings import settings
from ..knowledge.prompts import ORCHESTRATOR_SYSTEM_PROMPT

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.3,
)


def orchestrate(state: dict) -> dict:
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

    try:
        parsed = json.loads(raw)
        intent = parsed.get("intent", "GENERAL")
        final_response = parsed.get("response", "")
    except (json.JSONDecodeError, AttributeError):
        intent = "GENERAL"
        final_response = response.content

    return {
        **state,
        "intent": intent,
        "current_agent": intent,
        "final_response": final_response,
    }
