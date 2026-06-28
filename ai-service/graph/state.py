from typing import TypedDict, List, Optional, Annotated
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    # Identity
    user_id: str
    session_id: str

    # Conversation — uses operator.add so each node appends rather than overwrites
    messages: Annotated[List[BaseMessage], operator.add]

    # Routing
    intent: Optional[str]           # SEARCH | RECOMMEND | RESERVE | PAYMENT | GENERAL
    current_agent: Optional[str]

    # Agent outputs
    search_results: Optional[List[dict]]
    recommendation_results: Optional[List[dict]]
    reservation_details: Optional[dict]
    payment_details: Optional[dict]

    # Final answer written by whichever agent last ran
    final_response: Optional[str]

    # Error propagation
    error: Optional[str]

    # Auth token forwarded from the HTTP request — used to call the backend API
    auth_token: Optional[str]
