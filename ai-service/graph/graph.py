from langgraph.graph import StateGraph, END

from graph.state import AgentState
from agents.orchestrator import orchestrate
from agents.discovery import search_restaurants
from agents.recommendation import recommend_restaurants
from agents.reservation import handle_reservation
from agents.payment import handle_payment
from agents.menu import show_menu
from agents.general import handle_general


def _route(state: AgentState) -> str:
    return state.get("intent") or "GENERAL"


def build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    g.add_node("orchestrator", orchestrate)
    g.add_node("search", search_restaurants)
    g.add_node("recommend", recommend_restaurants)
    g.add_node("reserve", handle_reservation)
    g.add_node("payment", handle_payment)
    g.add_node("menu", show_menu)
    g.add_node("general", handle_general)

    g.set_entry_point("orchestrator")

    g.add_conditional_edges(
        "orchestrator",
        _route,
        {
            "SEARCH":    "search",
            "RECOMMEND": "recommend",
            "RESERVE":   "reserve",
            "PAYMENT":   "payment",
            "MENU":      "menu",
            "GENERAL":   "general",
        },
    )

    for node in ("search", "recommend", "reserve", "payment", "menu", "general"):
        g.add_edge(node, END)

    return g


compiled_graph = build_graph().compile()
