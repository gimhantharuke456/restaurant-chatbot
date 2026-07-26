import json
from typing import Optional

import httpx
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config.settings import settings
from knowledge.prompts import RESERVATION_SYSTEM_PROMPT
from tools.firestore_tools import get_availability
from tools.search_tools import lookup_restaurant_by_name
from tools.trace import record, now

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.1,
)

_EXTRACT_PROMPT = """Extract ALL accumulated reservation details from the FULL conversation below.
Merge information from every turn — do not lose details mentioned in earlier messages.
Return JSON only:
{
  "action": "BOOK | MODIFY | CANCEL | CHECK",
  "restaurant_name": "",
  "restaurant_id": "",
  "date": "YYYY-MM-DD or empty",
  "time": "HH:MM or empty",
  "party_size": null,
  "special_requests": ""
}"""

# Marker embedded in confirmation messages so we know a booking was already created
_BOOKING_MARKER = "Booking ref:"


def _build_conversation_text(messages: list) -> str:
    lines = []
    for m in messages:
        if isinstance(m, HumanMessage):
            lines.append(f"User: {m.content}")
        elif isinstance(m, AIMessage):
            lines.append(f"Assistant: {m.content}")
    return "\n".join(lines)


def _find_existing_booking_ref(messages: list) -> Optional[str]:
    """Return the booking ID if a prior turn already confirmed a booking."""
    for m in messages:
        if isinstance(m, AIMessage) and _BOOKING_MARKER in m.content:
            idx = m.content.index(_BOOKING_MARKER) + len(_BOOKING_MARKER)
            return m.content[idx:].strip().split()[0].rstrip(".")
    return None


def _all_details_present(details: dict) -> bool:
    return bool(
        details.get("restaurant_id")
        and details.get("date")
        and details.get("time")
        and details.get("party_size")
    )


async def _call_backend_create_reservation(details: dict, auth_token: str) -> Optional[dict]:
    try:
        payload = {
            "restaurantId": details["restaurant_id"],
            "date": details["date"],
            "time": details["time"],
            "partySize": int(details["party_size"]),
        }
        if details.get("special_requests"):
            payload["specialRequests"] = details["special_requests"]

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.backend_url}/api/reservations",
                json=payload,
                headers={"Authorization": f"Bearer {auth_token}"},
            )

        if resp.status_code in (200, 201):
            return resp.json()

        print(f"Backend reservation API returned {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Backend reservation API error: {e}")
    return None


async def _call_backend_cancel_reservation(reservation_id: str, auth_token: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{settings.backend_url}/api/reservations/{reservation_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        return resp.status_code in (200, 204)
    except Exception as e:
        print(f"[reservation] cancel API error: {e}")
        return False


async def _call_backend_modify_reservation(
    reservation_id: str,
    updates: dict,
    auth_token: str,
) -> Optional[dict]:
    payload = {}
    if updates.get("date"):
        payload["date"] = updates["date"]
    if updates.get("time"):
        payload["time"] = updates["time"]
    if updates.get("party_size"):
        payload["partySize"] = int(updates["party_size"])
    if updates.get("special_requests"):
        payload["specialRequests"] = updates["special_requests"]
    if not payload:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.put(
                f"{settings.backend_url}/api/reservations/{reservation_id}",
                json=payload,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[reservation] modify API error: {e}")
    return None


async def handle_reservation(state: dict) -> dict:
    messages = state["messages"]
    conversation = _build_conversation_text(messages)

    # Extract accumulated details from FULL conversation
    t0 = now()
    extract_response = llm.invoke([
        SystemMessage(content=_EXTRACT_PROMPT),
        HumanMessage(content=conversation),
    ])

    try:
        raw = extract_response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        details = json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        details = {"action": "CHECK"}

    record(state, "extraction", "Extract Reservation Details", started_at=t0, action=details.get("action"), details=details)

    # Auto-resolve restaurant_id from Postgres when not already extracted
    if not details.get("restaurant_id") and details.get("restaurant_name"):
        try:
            match = await lookup_restaurant_by_name(details["restaurant_name"])
            if match:
                details["restaurant_id"] = match["id"]
                print(f"[reservation] resolved restaurant_id={match['id']} for '{details['restaurant_name']}'")
            else:
                print(f"[reservation] no DB match for restaurant_name='{details['restaurant_name']}'")
        except Exception as e:
            print(f"[reservation] restaurant lookup error: {e}")

    context: dict = {"details": details, "available_slots": []}

    if details.get("action") == "BOOK" and details.get("restaurant_id") and details.get("date"):
        try:
            t1 = now()
            slots = get_availability(details["restaurant_id"], details["date"])
            context["available_slots"] = [s for s in slots if s.get("available")]
            record(
                state, "tool_call", "Firestore Availability Check", started_at=t1,
                date=details["date"], availableSlots=len(context["available_slots"]),
            )
        except Exception:
            pass

    # Create the reservation in the backend when all details are collected and
    # a booking hasn't already been confirmed in this conversation
    existing_ref = _find_existing_booking_ref(messages[:-1])
    booking_result = None
    auth_token = state.get("auth_token")

    print(f"[reservation] action={details.get('action')} all_present={_all_details_present(details)} "
          f"existing_ref={existing_ref} auth_token={'yes' if auth_token else 'NO'}")

    if (
        details.get("action") == "BOOK"
        and _all_details_present(details)
        and not existing_ref
        and auth_token
    ):
        t2 = now()
        booking_result = await _call_backend_create_reservation(details, auth_token)
        record(
            state, "backend_call", "POST /api/reservations", started_at=t2,
            success=bool(booking_result), reservationId=(booking_result or {}).get("id"),
        )
        if booking_result:
            context["booking_ref"] = booking_result.get("id")
            context["booking_confirmed"] = True
            print(f"[reservation] booking created: {booking_result.get('id')}")
        else:
            print("[reservation] booking API call failed — no result returned")
    elif details.get("action") == "CANCEL" and auth_token:
        reservation_id = existing_ref
        if not reservation_id:
            # Try fetching latest active reservation from backend
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        f"{settings.backend_url}/api/reservations",
                        headers={"Authorization": f"Bearer {auth_token}"},
                    )
                if resp.status_code == 200:
                    reservations = resp.json()
                    active = [r for r in reservations if r.get("status") in ("PENDING", "CONFIRMED")]
                    if active:
                        reservation_id = active[0].get("id")
            except Exception:
                pass
        if reservation_id:
            t3 = now()
            success = await _call_backend_cancel_reservation(reservation_id, auth_token)
            record(state, "backend_call", "DELETE /api/reservations/:id", started_at=t3, success=success, reservationId=reservation_id)
            context["cancel_success"] = success
            context["cancelled_reservation_id"] = reservation_id if success else None
            print(f"[reservation] cancel {'succeeded' if success else 'failed'} for {reservation_id}")
    elif details.get("action") == "MODIFY" and auth_token:
        reservation_id = existing_ref
        if reservation_id:
            t4 = now()
            modify_result = await _call_backend_modify_reservation(reservation_id, details, auth_token)
            record(state, "backend_call", "PUT /api/reservations/:id", started_at=t4, success=modify_result is not None, reservationId=reservation_id)
            context["modify_success"] = modify_result is not None
            context["modified_reservation"] = modify_result
            print(f"[reservation] modify {'succeeded' if modify_result else 'failed'} for {reservation_id}")
    elif not auth_token and details.get("action") in ("BOOK", "CANCEL", "MODIFY"):
        context["auth_required"] = True
        record(state, "auth_check", "Auth Required", action=details.get("action"))
        print("[reservation] SKIPPED action: auth_token is missing")

    # Pass full conversation + booking outcome to the response LLM
    system_prompt = RESERVATION_SYSTEM_PROMPT
    if booking_result:
        system_prompt += (
            f"\n\nThe reservation has been successfully created in the system. "
            f"Include exactly this line in your response: "
            f'"{_BOOKING_MARKER} {booking_result.get("id")}"\n\n'
            f"IMPORTANT: After confirming the booking, immediately invite the user to pre-order "
            f"food and beverages from the restaurant menu. Tell them you can show the menu, "
            f"help them choose items, calculate the total bill, and then send a secure payment "
            f"link. Ask: 'Would you like to see the menu and pre-order?' so they know to reply."
        )
    elif context.get("cancel_success"):
        system_prompt += "\n\nThe reservation has been successfully cancelled. Confirm this warmly and offer to help find a new restaurant."
    elif details.get("action") == "CANCEL" and not context.get("cancel_success") and auth_token:
        system_prompt += "\n\nCould not cancel the reservation automatically. Apologize and ask the user to contact support or try again."
    elif context.get("modify_success"):
        system_prompt += "\n\nThe reservation has been successfully modified. Confirm the new details clearly."
    elif context.get("auth_required"):
        system_prompt += "\n\nThe user needs to be logged in to perform this action. Politely ask them to sign in to continue."

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Conversation so far:\n{conversation}\n\nExtracted details: {json.dumps(details)}\nContext: {json.dumps(context)}"),
    ])

    return {
        **state,
        "reservation_details": details,
        "final_response": response.content,
    }
