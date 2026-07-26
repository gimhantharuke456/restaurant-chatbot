from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings
from tools.trace import record, now

GENERAL_SYSTEM_PROMPT = """You are a helpful AI assistant for a restaurant discovery and reservation platform.

You help customers with:
- General questions about how the platform works
- Information about restaurant bookings, payments, and reservations
- Account-related questions (how to update profile, manage favorites, etc.)
- Greeting and casual conversation to guide them toward restaurant discovery or reservations

Platform capabilities you can describe:
- Search restaurants by cuisine, area, price range, or name
- Get personalized restaurant recommendations
- Make, modify, or cancel reservations
- Pre-order food and pay online via Stripe
- Save favorite restaurants and organize into collections
- View reservation history and dining insights

Keep responses concise, friendly, and helpful. If the user seems to want a recommendation or search, invite them to ask.
Always respond in the same language the user is writing in."""

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.5,
)


def handle_general(state: dict) -> dict:
    messages = state["messages"]
    user_message = messages[-1].content

    history_lines = [
        f"{'User' if m.type == 'human' else 'Assistant'}: {m.content}"
        for m in messages[:-1][-6:]
    ]
    history_text = "\n".join(history_lines) if history_lines else "(no prior history)"

    t0 = now()
    response = llm.invoke([
        SystemMessage(content=GENERAL_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation history:\n{history_text}\n\nUser: {user_message}"),
    ])
    record(state, "llm_call", "General Response Generation", started_at=t0)

    return {**state, "final_response": response.content}
