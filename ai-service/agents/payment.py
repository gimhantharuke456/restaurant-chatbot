import json
from typing import Optional

from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from knowledge.prompts import PAYMENT_SYSTEM_PROMPT
from tools.search_tools import lookup_restaurant_by_name
from tools.payment_tools import get_restaurant_menu, get_reservation_details, create_checkout_session

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)

_BOOKING_MARKER = "Booking ref:"
_PAYMENT_LINK_MARKER = "Payment link:"
SERVICE_CHARGE_RATE = 0.10


# ── helpers ───────────────────────────────────────────────────────────────────

def _build_conversation_text(messages: list) -> str:
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"User: {m.content}")
        elif isinstance(m, AIMessage):
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


def _find_booking_ref(messages: list) -> Optional[str]:
    for m in messages:
        if isinstance(m, AIMessage) and _BOOKING_MARKER in m.content:
            idx = m.content.index(_BOOKING_MARKER) + len(_BOOKING_MARKER)
            return m.content[idx:].strip().split()[0].rstrip(".,")
    return None


def _find_payment_link(messages: list) -> Optional[str]:
    for m in messages:
        if isinstance(m, AIMessage) and _PAYMENT_LINK_MARKER in m.content:
            idx = m.content.index(_PAYMENT_LINK_MARKER) + len(_PAYMENT_LINK_MARKER)
            return m.content[idx:].strip().split()[0].rstrip(".,")
    return None


def _group_by_category(items: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list] = {}
    for item in items:
        cat = item.get("category", "Other")
        grouped.setdefault(cat, []).append(item)
    return grouped


def _format_menu(grouped: dict[str, list[dict]]) -> str:
    lines: list[str] = []
    for cat in sorted(grouped.keys()):
        lines.append(f"\n{cat.upper()}")
        lines.append("─" * 30)
        for item in grouped[cat]:
            dietary = item.get("dietaryInfo", [])
            tags = f"  [{', '.join(dietary)}]" if isinstance(dietary, list) and dietary else ""
            desc = f"\n    {item['description']}" if item.get("description") else ""
            lines.append(f"  • {item['name']}{tags} — LKR {item['price']:,.0f}{desc}")
    return "\n".join(lines)


def _format_bill(order_items: list[dict]) -> str:
    subtotal = sum(i["price"] * i["quantity"] for i in order_items)
    service = round(subtotal * SERVICE_CHARGE_RATE)
    total = subtotal + service
    lines = ["ORDER SUMMARY", "=" * 38]
    for item in order_items:
        lines.append(f"{item['name']} × {item['quantity']}   LKR {item['price'] * item['quantity']:,.0f}")
    lines += [
        "─" * 38,
        f"Subtotal              LKR {subtotal:,.0f}",
        f"Service charge (10%)  LKR {service:,.0f}",
        "=" * 38,
        f"TOTAL                 LKR {total:,.0f}",
    ]
    return "\n".join(lines)


# ── LLM-based order state extraction ─────────────────────────────────────────

_ORDER_STATE_PROMPT = """Analyze the conversation and extract ordering state. Return valid JSON only.

Available menu items for matching (use EXACT prices and IDs from this list):
{menu_json}

Return:
{{
  "menu_presented": true/false,
  "order_items": [{{"menu_item_id": "id or null", "name": "exact menu item name", "price": 0.0, "quantity": 1, "category": "category"}}],
  "order_confirmed": true/false,
  "wants_to_skip": true/false
}}

Rules:
- "menu_presented": true if any AI message shows a formatted menu listing with prices
- "order_items": match what the user requested to the nearest menu item; use DB price (not user-stated); empty list if no items requested yet
- "order_confirmed": true ONLY when user clearly confirms the BILL SUMMARY with "yes", "confirm", "ok", "proceed" or equivalent — NOT when just placing an order
- "wants_to_skip": true if user says they don't want to order food / wants to skip menu / just wants to pay deposit"""

_RESTAURANT_NAME_PROMPT = """Extract the restaurant name from the booking confirmation in this conversation.
Return ONLY the restaurant name — no quotes, no extra text."""


async def _extract_restaurant_name(messages: list) -> str:
    conv = _build_conversation_text(messages)
    try:
        resp = llm.invoke([
            SystemMessage(content=_RESTAURANT_NAME_PROMPT),
            HumanMessage(content=conv),
        ])
        return resp.content.strip().strip('"\'')
    except Exception:
        return ""


async def _extract_order_state(messages: list, menu_items: list[dict]) -> dict:
    conv = _build_conversation_text(messages)
    menu_json = json.dumps([
        {"id": m["id"], "name": m["name"], "price": m["price"], "category": m.get("category", "")}
        for m in menu_items
    ])
    prompt = _ORDER_STATE_PROMPT.format(menu_json=menu_json)
    try:
        resp = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content=conv),
        ])
        raw = resp.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[payment] order state extraction error: {e}")
        return {"menu_presented": False, "order_items": [], "order_confirmed": False, "wants_to_skip": False}


# ── agent entry point ─────────────────────────────────────────────────────────

async def handle_payment(state: dict) -> dict:
    messages = state["messages"]
    conversation = _build_conversation_text(messages)
    auth_token = state.get("auth_token")

    booking_ref = _find_booking_ref(messages)

    # No active booking — generic payment response
    if not booking_ref:
        resp = llm.invoke([
            SystemMessage(content=PAYMENT_SYSTEM_PROMPT),
            HumanMessage(content=conversation),
        ])
        return {**state, "final_response": resp.content}

    # Payment link already sent — just remind the user
    existing_link = _find_payment_link(messages[:-1])
    if existing_link:
        resp = llm.invoke([
            SystemMessage(
                content=PAYMENT_SYSTEM_PROMPT
                + f"\n\nA payment link was already sent earlier: {existing_link}\n"
                  "Remind the user that the link is valid for 24 hours and they can use it to complete payment."
            ),
            HumanMessage(content=conversation),
        ])
        return {**state, "final_response": resp.content}

    # Resolve restaurant + menu
    restaurant_name = await _extract_restaurant_name(messages)
    restaurant = await lookup_restaurant_by_name(restaurant_name) if restaurant_name else None
    menu_items: list[dict] = []
    if restaurant:
        menu_items = await get_restaurant_menu(restaurant["id"])

    print(
        f"[payment] booking={booking_ref} restaurant={restaurant_name!r} "
        f"menu_items={len(menu_items)} auth={'yes' if auth_token else 'NO'}"
    )

    order_state = await _extract_order_state(messages, menu_items)
    print(
        f"[payment] order_state: menu_shown={order_state['menu_presented']} "
        f"items={len(order_state['order_items'])} confirmed={order_state['order_confirmed']} "
        f"skip={order_state.get('wants_to_skip')}"
    )

    # ── State machine ─────────────────────────────────────────────

    # CASE A: Order confirmed → create checkout session
    if order_state["order_confirmed"] and order_state["order_items"]:
        if not auth_token:
            resp = llm.invoke([
                SystemMessage(content=PAYMENT_SYSTEM_PROMPT + "\n\nCould not create payment — auth missing. Ask user to refresh and try again."),
                HumanMessage(content=conversation),
            ])
            return {**state, "final_response": resp.content}

        result = await create_checkout_session(booking_ref, order_state["order_items"], auth_token)
        if result:
            bill = _format_bill(order_state["order_items"])
            system_prompt = (
                PAYMENT_SYSTEM_PROMPT
                + f"\n\nSuccessfully created payment.\n"
                  f"Bill:\n{bill}\n\n"
                  f"Payment URL: {result['paymentUrl']}\n"
                  f"Total: LKR {result['amount']:,.0f}\n\n"
                  f"Tell the user their order is confirmed and they can pay via the link below. "
                  f"Mention the link expires in 24 hours and a receipt email will be sent after payment.\n"
                  f"IMPORTANT: Your response MUST include this exact line:\n"
                  f"{_PAYMENT_LINK_MARKER} {result['paymentUrl']}"
            )
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=conversation),
            ])
            return {**state, "final_response": resp.content}
        else:
            resp = llm.invoke([
                SystemMessage(content=PAYMENT_SYSTEM_PROMPT + "\n\nPayment session creation failed. Apologize sincerely and suggest the user contact support or try again."),
                HumanMessage(content=conversation),
            ])
            return {**state, "final_response": resp.content}

    # CASE B: User wants to skip ordering — offer deposit
    if order_state.get("wants_to_skip") and auth_token:
        reservation = await get_reservation_details(booking_ref, auth_token)
        party_size = reservation.get("partySize", 2) if reservation else 2
        deposit_items = [{
            "menuItemId": None,
            "name": "Reservation Deposit",
            "price": 500.0,
            "quantity": party_size,
            "category": "Deposit",
        }]
        result = await create_checkout_session(booking_ref, deposit_items, auth_token)
        if result:
            system_prompt = (
                PAYMENT_SYSTEM_PROMPT
                + f"\n\nDeposit checkout created.\n"
                  f"Deposit: LKR 500 × {party_size} guests = LKR {500 * party_size:,}\n"
                  f"Service charge (10%): LKR {round(500 * party_size * 0.1):,}\n"
                  f"Total: LKR {result['amount']:,.0f}\n"
                  f"Payment URL: {result['paymentUrl']}\n\n"
                  f"IMPORTANT: Your response MUST include this exact line:\n"
                  f"{_PAYMENT_LINK_MARKER} {result['paymentUrl']}"
            )
            resp = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=conversation),
            ])
            return {**state, "final_response": resp.content}

    # CASE C: Items collected but not confirmed → show bill, ask to confirm
    if order_state["order_items"] and not order_state["order_confirmed"]:
        bill = _format_bill(order_state["order_items"])
        system_prompt = (
            PAYMENT_SYSTEM_PROMPT
            + f"\n\nPresent this bill summary to the user clearly and ask them to confirm before processing payment:\n\n{bill}"
        )
        resp = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=conversation),
        ])
        return {**state, "final_response": resp.content}

    # CASE D: Menu shown but no items selected yet
    if order_state["menu_presented"] and not order_state["order_items"]:
        grouped = _group_by_category(menu_items)
        menu_text = _format_menu(grouped) if grouped else ""
        system_prompt = (
            PAYMENT_SYSTEM_PROMPT
            + "\n\nThe menu was already shown but the user hasn't chosen anything. "
              "Politely ask them what they'd like to order — suggest they say something like 'Crab Curry × 2, Fresh Lime Juice × 3'."
              + (f"\n\nMenu for reference:\n{menu_text}" if menu_text else "")
        )
        resp = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=conversation),
        ])
        return {**state, "final_response": resp.content}

    # CASE E: Menu not shown yet → present menu (or no-menu fallback)
    if menu_items:
        grouped = _group_by_category(menu_items)
        menu_text = _format_menu(grouped)
        system_prompt = (
            PAYMENT_SYSTEM_PROMPT
            + f"\n\nIntroduce the menu for the restaurant and ask the user what they'd like to order. "
              f"Mention they can tell you items and quantities (e.g. 'Crab Curry × 2'). "
              f"Also let them know they can skip food ordering and just pay a reservation deposit if they prefer.\n\n"
              f"MENU:\n{menu_text}"
        )
    else:
        system_prompt = (
            PAYMENT_SYSTEM_PROMPT
            + "\n\nThis restaurant hasn't uploaded their menu yet. "
              "Offer a reservation deposit of LKR 500 per person. "
              "Ask the user if they'd like to proceed with the deposit payment or skip payment for now."
        )

    resp = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=conversation),
    ])
    return {**state, "final_response": resp.content}
