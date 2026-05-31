from langgraph.graph import StateGraph, END

from graph.state import AgentState
from agents.orchestrator import orchestrate
from agents.discovery import search_restaurants
from agents.recommendation import recommend_restaurants
from agents.reservation import handle_reservation
from agents.payment import handle_payment

_ROUTE_MAP = {
    "SEARCH": "discovery",
    "RECOMMEND": "recommendation",
    "RESERVE": "reservation",
    "PAYMENT": "payment",
}


def _route(state: AgentState) -> str:
    return _ROUTE_MAP.get(state.get("intent", "GENERAL"), END)


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("orchestrator", orchestrate)
    g.add_node("discovery", search_restaurants)
    g.add_node("recommendation", recommend_restaurants)
    g.add_node("reservation", handle_reservation)
    g.add_node("payment", handle_payment)

    g.set_entry_point("orchestrator")

    g.add_conditional_edges(
        "orchestrator",
        _route,
        {
            "discovery": "discovery",
            "recommendation": "recommendation",
            "reservation": "reservation",
            "payment": "payment",
            END: END,
        },
    )

    for node in ("discovery", "recommendation", "reservation", "payment"):
        g.add_edge(node, END)

    return g.compile()


# Module-level singleton — imported by main.py
agent_graph = build_graph()
