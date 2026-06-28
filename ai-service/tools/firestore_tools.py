import firebase_admin
from firebase_admin import credentials, firestore

from config.settings import settings

_initialized = False


def _ensure_init() -> None:
    global _initialized
    if not _initialized and not firebase_admin._apps:
        # Build Firebase credentials from env vars (spare-parts-6c6af project).
        # Intentionally separate from the Vertex AI key used for Gemini.
        cert = {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cert)
        firebase_admin.initialize_app(cred)
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
