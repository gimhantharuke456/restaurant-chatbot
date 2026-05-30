from pydantic import BaseModel
from typing import Optional, List, Any


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    session_id: str
    message: str
    intent: Optional[str] = None
    data: Optional[Any] = None


class EmbedRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cuisine_types: List[str] = []
    area: str
