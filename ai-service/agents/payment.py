from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..config.settings import settings
from ..knowledge.prompts import PAYMENT_SYSTEM_PROMPT

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)


def handle_payment(state: dict) -> dict:
    messages = state["messages"]
    user_message = messages[-1].content

    response = llm.invoke([
        SystemMessage(content=PAYMENT_SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ])

    return {
        **state,
        "final_response": response.content,
    }
