from pydantic import BaseModel
from typing import Optional, Any


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    message: str
    history: list[Message] = []
    lat: Optional[float] = None
    lng: Optional[float] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str
    intent: Optional[str] = None
    data: Optional[Any] = None
    guest_limit_reached: bool = False
    trace: Optional[list[dict]] = None


class EmbedRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cuisine_types: list[str] = []
    area: str


class PortalAIRequest(BaseModel):
    message: str
    history: list[Message] = []
    context: Optional[dict] = None  # restaurant analytics/stats passed from Express


class PortalAIResponse(BaseModel):
    message: str


class ChatTitleRequest(BaseModel):
    user_message: str
    assistant_message: str


class ChatTitleResponse(BaseModel):
    title: str
