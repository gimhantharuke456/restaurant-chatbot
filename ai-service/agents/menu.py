from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from tools.search_tools import lookup_restaurant_by_name
from tools.payment_tools import get_restaurant_menu
from tools.trace import record, now

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)

MENU_LIST_SENTINEL = "__MENU_LIST__"

_EXTRACT_RESTAURANT_PROMPT = """Extract the name of the restaurant whose menu the user is asking about,
from their latest message and the recent conversation history below.
Return ONLY the restaurant name — no quotes, no extra text.
If no specific restaurant is named anywhere, return an empty string."""


def _build_conversation_text(messages: list) -> str:
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"User: {m.content}")
        elif isinstance(m, AIMessage):
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


async def show_menu(state: dict) -> dict:
    messages = state["messages"]
    # Last 6 turns is enough context to recover a restaurant named earlier
    # in the conversation (e.g. a prior search/recommend result) without
    # re-sending the whole history to the LLM.
    conversation = _build_conversation_text(messages[-6:])

    t0 = now()
    extract_response = llm.invoke([
        SystemMessage(content=_EXTRACT_RESTAURANT_PROMPT),
        HumanMessage(content=conversation),
    ])
    restaurant_name = extract_response.content.strip().strip('"\'')
    record(state, "extraction", "Extract Restaurant Name", started_at=t0, restaurantName=restaurant_name)

    if not restaurant_name:
        return {
            **state,
            "final_response": "Which restaurant's menu would you like to see? Just tell me the name.",
        }

    restaurant = await lookup_restaurant_by_name(restaurant_name)
    if not restaurant:
        return {
            **state,
            "final_response": (
                f'I couldn\'t find a restaurant called "{restaurant_name}". '
                "Could you double-check the name, or ask me to search for one?"
            ),
        }

    t1 = now()
    menu_items = await get_restaurant_menu(restaurant["id"])
    record(
        state, "tool_call", "Fetch Restaurant Menu", started_at=t1,
        restaurant=restaurant["name"], itemCount=len(menu_items),
    )

    if not menu_items:
        return {
            **state,
            "final_response": f"{restaurant['name']} hasn't uploaded their menu yet — check back soon!",
        }

    enriched_items = [
        {**item, "restaurantId": restaurant["id"], "restaurantName": restaurant["name"]}
        for item in menu_items
    ]

    return {
        **state,
        "menu_results": enriched_items,
        "final_response": MENU_LIST_SENTINEL,
    }
