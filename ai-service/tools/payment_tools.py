import json
from typing import Optional

import httpx

from config.settings import settings


async def get_restaurant_menu(restaurant_id: str) -> list[dict]:
    """Fetch available menu items for a restaurant from the backend (public endpoint)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.backend_url}/api/restaurants/{restaurant_id}/menu"
            )
        if resp.status_code == 200:
            items = resp.json()
            for item in items:
                if isinstance(item.get("dietaryInfo"), str):
                    try:
                        item["dietaryInfo"] = json.loads(item["dietaryInfo"])
                    except Exception:
                        item["dietaryInfo"] = []
            return items
    except Exception as e:
        print(f"[payment_tools] menu fetch error: {e}")
    return []


async def get_reservation_details(reservation_id: str, auth_token: str) -> Optional[dict]:
    """Fetch a specific reservation's details (includes restaurant + partySize)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.backend_url}/api/reservations/{reservation_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[payment_tools] reservation fetch error: {e}")
    return None


async def create_checkout_session(
    reservation_id: str,
    order_items: list[dict],
    auth_token: str,
) -> Optional[dict]:
    """
    Create a Stripe Checkout Session.
    order_items: [{ menuItemId, name, price, quantity, category }]
    Returns: { paymentUrl, paymentId, amount }
    """
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{settings.backend_url}/api/payments/checkout-session",
                json={"reservationId": reservation_id, "orderItems": order_items},
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        if resp.status_code in (200, 201):
            return resp.json()
        print(f"[payment_tools] checkout session {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[payment_tools] checkout session error: {e}")
    return None
