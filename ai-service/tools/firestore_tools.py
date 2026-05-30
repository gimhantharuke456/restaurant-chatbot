import firebase_admin
from firebase_admin import credentials, firestore

from ..config.settings import settings

_initialized = False


def _ensure_init() -> None:
    global _initialized
    if not _initialized and not firebase_admin._apps:
        try:
            cred = credentials.Certificate(settings.google_application_credentials)
            firebase_admin.initialize_app(cred)
        except Exception:
            # Fall back to application default credentials (e.g. inside GCP)
            firebase_admin.initialize_app()
        _initialized = True


def _db():
    _ensure_init()
    return firestore.client()


def get_availability(restaurant_id: str, date: str) -> list[dict]:
    doc = (
        _db()
        .collection("restaurants")
        .document(restaurant_id)
        .collection("availability")
        .document(date)
        .get()
    )
    if doc.exists:
        return doc.to_dict().get("slots", [])
    return []


def update_slot(restaurant_id: str, date: str, time: str, delta: int) -> None:
    ref = (
        _db()
        .collection("restaurants")
        .document(restaurant_id)
        .collection("availability")
        .document(date)
    )
    doc = ref.get()
    if not doc.exists:
        return
    slots = doc.to_dict().get("slots", [])
    for slot in slots:
        if slot["time"] == time:
            slot["bookedTables"] = slot.get("bookedTables", 0) + delta
            slot["available"] = slot["bookedTables"] < slot["totalTables"]
    ref.update({"slots": slots})


def sync_reservation(reservation_id: str, data: dict) -> None:
    _db().collection("reservations").document(reservation_id).set(
        {**data, "updatedAt": firestore.SERVER_TIMESTAMP}
    )
