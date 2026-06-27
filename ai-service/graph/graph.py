from langgraph.graph import StateGraph, END

from graph.state import AgentState
from agents.orchestrator import orchestrate
from agents.discovery import search_restaurants
from agents.recommendation import recommend_restaurants
from agents.reservation import handle_reservation
from agents.payment import handle_payment
from agents.general import handle_general

_ROUTE_MAP = {
    "SEARCH": "discovery",
    "RECOMMEND": "recommendation",
    "RESERVE": "reservation",
    "PAYMENT": "payment",
    "GENERAL": "general",
}


def _route(state: AgentState) -> str:
    return _ROUTE_MAP.get(state.get("intent", "GENERAL"), "general")


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("orchestrator", orchestrate)
    g.add_node("discovery", search_restaurants)
    g.add_node("recommendation", recommend_restaurants)
    g.add_node("reservation", handle_reservation)
    g.add_node("payment", handle_payment)
    g.add_node("general", handle_general)

    g.set_entry_point("orchestrator")

    g.add_conditional_edges(
        "orchestrator",
        _route,
        {
            "discovery": "discovery",
            "recommendation": "recommendation",
            "reservation": "reservation",
            "payment": "payment",
            "general": "general",
        },
    )

    for node in ("discovery", "recommendation", "reservation", "payment", "general"):
        g.add_edge(node, END)

    return g.compile()


agent_graph = build_graph()
