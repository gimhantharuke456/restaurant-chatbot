import os
import warnings
import traceback
import logging
from contextlib import asynccontextmanager

# Suppress LangChain deprecation warnings for ChatVertexAI — the package still
# works correctly; migration to langchain-google-genai is tracked separately.
warnings.filterwarnings("ignore", category=DeprecationWarning, module="langchain")
warnings.filterwarnings("ignore", message=".*ChatVertexAI.*", category=Warning)
warnings.filterwarnings("ignore", message=".*on_event.*", category=DeprecationWarning)

from config.settings import settings
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage

from schemas.models import (
    ChatRequest,
    ChatResponse,
    EmbedRequest,
    PortalAIRequest,
    PortalAIResponse,
    ChatTitleRequest,
    ChatTitleResponse,
)
from chain.pipeline import run_pipeline
from config.neo4j import close_driver


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_driver()


app = FastAPI(title="Restaurant Chatbot AI Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

        result = await run_pipeline({
            "user_id": user_id,
            "session_id": request.session_id,
            "messages": history,
            "intent": None,
            "current_agent": None,
            "search_results": None,
            "recommendation_results": None,
            "reservation_details": None,
            "payment_details": None,
            "menu_results": None,
            "final_response": None,
            "error": None,
            "auth_token": auth_token,
            "lat": request.lat,
            "lng": request.lng,
        })

        return ChatResponse(
            session_id=request.session_id,
            message=result.get("final_response") or "I couldn't process that request. Please try again.",
            intent=result.get("intent"),
            data=result.get("search_results") or result.get("recommendation_results") or result.get("menu_results"),
            guest_limit_reached=False,
        )
    except Exception as e:
        logger.error("Chat handler error: %s", str(e))
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/demo/chat", response_model=ChatResponse)
async def demo_chat(request: ChatRequest):
    """Unauthenticated endpoint for the agent-demo dashboard. Runs the exact
    same orchestrator + specialist-agent pipeline as /chat, but always
    returns the step-by-step trace and is never subject to the guest message
    limit. No auth_token is forwarded, so reservation/payment actions will
    correctly surface their real 'sign in required' branch rather than
    actually mutating data — safe to demo without a real account."""
    try:
        history = [
            HumanMessage(content=m.content) if m.role == "user"
            else AIMessage(content=m.content)
            for m in request.history
        ]
        history.append(HumanMessage(content=request.message))

        result = await run_pipeline({
            "user_id": request.user_id or f"demo_{request.session_id}",
            "session_id": request.session_id,
            "messages": history,
            "intent": None,
            "current_agent": None,
            "search_results": None,
            "recommendation_results": None,
            "reservation_details": None,
            "payment_details": None,
            "menu_results": None,
            "final_response": None,
            "error": None,
            "auth_token": None,
            "trace": [],
            "lat": request.lat,
            "lng": request.lng,
        })

        return ChatResponse(
            session_id=request.session_id,
            message=result.get("final_response") or "I couldn't process that request. Please try again.",
            intent=result.get("intent"),
            data=result.get("search_results") or result.get("recommendation_results") or result.get("menu_results"),
            guest_limit_reached=False,
            trace=result.get("trace") or [],
        )
    except Exception as e:
        logger.error("Demo chat handler error: %s", str(e))
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


_TITLE_SYSTEM_PROMPT = """Summarize the start of this conversation into a short chat title.
Rules: 3-6 words, no punctuation at the end, no quotes, title case, capture the topic
(e.g. the restaurant/cuisine/occasion/action being discussed). Respond with ONLY the title."""


@app.post("/chat/title", response_model=ChatTitleResponse)
async def generate_chat_title(request: ChatTitleRequest):
    """Generates a short title from a session's first exchange (first user
    message + first assistant reply), so chat history lists don't just show
    'New chat' for everything. Best-effort — callers should fall back to a
    truncated user message if this errors."""
    from langchain_google_vertexai import ChatVertexAI
    from langchain_core.messages import SystemMessage, HumanMessage as LCHumanMessage

    llm = ChatVertexAI(
        model_name=settings.gemini_model,
        project=settings.vertex_project_id,
        location=settings.vertex_location,
        temperature=0.2,
        # gemini-2.5-flash spends part of its output budget on internal
        # reasoning tokens before the visible answer — a low limit here
        # (e.g. 20) burns the whole budget on that and returns empty
        # content. 200 leaves enough headroom for a reliable short title.
        max_output_tokens=200,
    )

    try:
        response = llm.invoke([
            SystemMessage(content=_TITLE_SYSTEM_PROMPT),
            LCHumanMessage(
                content=f"User: {request.user_message}\nAssistant: {request.assistant_message}"
            ),
        ])
        title = response.content.strip().strip('"\'').rstrip(".!?")
        if not title:
            title = request.user_message[:60]
    except Exception as e:
        logger.error("Chat title generation error: %s", str(e))
        title = request.user_message[:60]

    return ChatTitleResponse(title=title[:80])


@app.post("/portal/message", response_model=PortalAIResponse)
async def portal_message(request: PortalAIRequest):
    """AI assistant for restaurant panel — answers business questions using provided analytics context."""
    from langchain_google_vertexai import ChatVertexAI
    from langchain_core.messages import SystemMessage, HumanMessage as LCHumanMessage
    from config.settings import settings
    import json

    ctx = request.context or {}
    context_lines = []
    if ctx.get("restaurantName"):
        context_lines.append(f"Restaurant: {ctx['restaurantName']}")
    if ctx.get("avgRating") is not None:
        context_lines.append(f"Average rating: {ctx['avgRating']}")
    if ctx.get("totalRevenue") is not None:
        context_lines.append(f"Total revenue (LKR): {ctx['totalRevenue']}")
    if ctx.get("totalReservations") is not None:
        context_lines.append(f"Total reservations: {ctx['totalReservations']}")
    if ctx.get("activeReservations") is not None:
        context_lines.append(f"Active reservations: {ctx['activeReservations']}")
    if ctx.get("peakHours"):
        top = ctx["peakHours"][:3]
        context_lines.append("Peak hours: " + ", ".join(f"{h['time']} ({h['count']} bookings)" for h in top))
    if ctx.get("topMenuItems"):
        top = ctx["topMenuItems"][:5]
        context_lines.append("Top menu items: " + ", ".join(f"{i['name']} (x{i['count']}, LKR {i['revenue']})" for i in top))
    if ctx.get("statusBreakdown"):
        breakdown = ", ".join(f"{s['status']}: {s['count']}" for s in ctx["statusBreakdown"])
        context_lines.append(f"Reservation status breakdown: {breakdown}")

    context_text = "\n".join(context_lines) if context_lines else "No analytics data available."

    history_lines = [
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in request.history[-6:]
    ]
    history_text = "\n".join(history_lines) if history_lines else ""

    system_prompt = f"""You are an AI business assistant for a restaurant management platform.
Answer the restaurant owner's questions based on their restaurant data below.
Be concise, specific, and data-driven. If the data doesn't contain the answer, say so honestly.

Current restaurant data:
{context_text}"""

    user_content = f"{history_text}\nUser: {request.message}" if history_text else request.message

    llm = ChatVertexAI(
        model_name=settings.gemini_model,
        project=settings.vertex_project_id,
        location=settings.vertex_location,
        temperature=0.3,
    )

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        LCHumanMessage(content=user_content),
    ])

    return PortalAIResponse(message=response.content)


@app.post("/embed/restaurant/{restaurant_id}")
async def embed_restaurant(restaurant_id: str, data: EmbedRequest):
    from tools.search_tools import generate_and_store_embedding
    await generate_and_store_embedding(restaurant_id, data.model_dump())
    return {"status": "embedded", "restaurant_id": restaurant_id}
