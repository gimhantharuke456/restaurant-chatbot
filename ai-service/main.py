import os
import traceback
import logging
from config.settings import settings
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage

from schemas.models import ChatRequest, ChatResponse, EmbedRequest
from graph.graph import agent_graph
from config.neo4j import close_driver

app = FastAPI(title="Restaurant Chatbot AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def shutdown():
    close_driver()


@app.get("/health")
def health():
    return {"status": "ok"}


GUEST_MESSAGE_LIMIT = 3


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: str = Header(default=None)):
    try:
        is_guest = not request.user_id or request.user_id.strip() == ""

        if is_guest:
            guest_message_count = len([m for m in request.history if m.role == "user"]) + 1
            if guest_message_count > GUEST_MESSAGE_LIMIT:
                return ChatResponse(
                    session_id=request.session_id,
                    message="You've reached the free message limit. Please sign in or create an account to continue chatting.",
                    intent="AUTH_REQUIRED",
                    guest_limit_reached=True,
                )

        history = [
            HumanMessage(content=m.content) if m.role == "user"
            else AIMessage(content=m.content)
            for m in request.history
        ]
        history.append(HumanMessage(content=request.message))

        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization.split("Bearer ", 1)[1]

        user_id = request.user_id if not is_guest else f"guest_{request.session_id}"

        result = await agent_graph.ainvoke({
            "user_id": user_id,
            "session_id": request.session_id,
            "messages": history,
            "intent": None,
            "current_agent": None,
            "search_results": None,
            "recommendation_results": None,
            "reservation_details": None,
            "payment_details": None,
            "final_response": None,
            "error": None,
            "auth_token": auth_token,
        })

        return ChatResponse(
            session_id=request.session_id,
            message=result.get("final_response") or "I couldn't process that request. Please try again.",
            intent=result.get("intent"),
            data=result.get("search_results") or result.get("recommendation_results"),
            guest_limit_reached=False,
        )
    except Exception as e:
        logger.error("Chat handler error: %s", str(e))
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/restaurant/{restaurant_id}")
async def embed_restaurant(restaurant_id: str, data: EmbedRequest):
    from tools.search_tools import generate_and_store_embedding
    await generate_and_store_embedding(restaurant_id, data.model_dump())
    return {"status": "embedded", "restaurant_id": restaurant_id}
