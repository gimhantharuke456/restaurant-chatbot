"""
LangChain-only orchestration pipeline — replaces LangGraph StateGraph.
Flow: orchestrate (classify intent) → route to specialist agent.
"""
import inspect

from agents.orchestrator import orchestrate
from agents.discovery import search_restaurants
from agents.recommendation import recommend_restaurants
from agents.reservation import handle_reservation
from agents.payment import handle_payment
from agents.general import handle_general

_ROUTE_MAP = {
    "SEARCH": search_restaurants,
    "RECOMMEND": recommend_restaurants,
    "RESERVE": handle_reservation,
    "PAYMENT": handle_payment,
    "GENERAL": handle_general,
}


async def run_pipeline(state: dict) -> dict:
    """Classify intent then dispatch to the appropriate specialist agent."""
    state = orchestrate(state)

    intent = state.get("intent", "GENERAL")
    agent_fn = _ROUTE_MAP.get(intent, handle_general)

    if inspect.iscoroutinefunction(agent_fn):
        state = await agent_fn(state)
    else:
        state = agent_fn(state)

    return state
