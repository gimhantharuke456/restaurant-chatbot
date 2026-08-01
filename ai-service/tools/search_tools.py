import json
import math
import difflib
import asyncpg
from langchain_google_vertexai import VertexAIEmbeddings

from config.settings import settings

_embeddings = None

# ── distance helpers ──────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _sort_by_distance(rows: list[dict], lat: float, lng: float, limit: int) -> list[dict]:
    with_dist, without_dist = [], []
    for row in rows:
        lat2, lng2 = row.get("latitude"), row.get("longitude")
        if lat2 is None or lng2 is None:
            without_dist.append(row)
        else:
            with_dist.append({**row, "distanceKm": round(_haversine_km(lat, lng, lat2, lng2), 1)})
    with_dist.sort(key=lambda r: r["distanceKm"])
    return (with_dist + without_dist)[:limit]


# ── fuzzy matching ────────────────────────────────────────────────────────────

def _fuzzy_match(text: str, query: str, threshold: float = 0.65) -> bool:
    """True if query fuzzy-matches text — handles typos, partial words, substrings."""
    if not text or not query:
        return False
    t, q = text.lower().strip(), query.lower().strip()
    if q in t or t in q:
        return True
    # word-level: any query word that is a substring of any text word (or vice versa)
    q_words = [w for w in q.split() if len(w) > 2]
    t_words = [w for w in t.split() if len(w) > 2]
    for qw in q_words:
        for tw in t_words:
            if qw in tw or tw in qw:
                return True
    # difflib ratio for short strings / single-word comparisons
    ratio = difflib.SequenceMatcher(None, q, t).ratio()
    return ratio >= threshold


def _restaurant_matches(restaurant: dict, filters: dict) -> bool:
    """Return True when restaurant passes ALL non-empty filters (fuzzy)."""
    cuisines_raw = restaurant.get("cuisineTypes") or "[]"
    try:
        cuisine_list: list[str] = json.loads(cuisines_raw)
    except (json.JSONDecodeError, TypeError):
        cuisine_list = []

    area = restaurant.get("area") or ""
    name = restaurant.get("name") or ""
    price = restaurant.get("priceRange") or ""

    if filters.get("cuisine"):
        q = filters["cuisine"]
        if not any(_fuzzy_match(c, q) for c in cuisine_list):
            return False

    if filters.get("area"):
        q = filters["area"]
        # match on area column OR restaurant name so "Nuga Gama" (a name) is found
        if not (_fuzzy_match(area, q) or _fuzzy_match(name, q)):
            return False

    if filters.get("price_range"):
        if price.upper() != filters["price_range"].upper():
            return False

    return True


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _get_conn():
    return await asyncpg.connect(settings.database_url)


async def _fetch_all_restaurants(conn) -> list[dict]:
    """Fetch every active restaurant — no SQL filtering, done in Python."""
    rows = await conn.fetch("""
        SELECT
            id, name, description, address, area,
            "cuisineTypes", "priceRange", "avgRating", "imageUrls",
            latitude, longitude
        FROM "Restaurant"
        WHERE "isActive" = true
        ORDER BY COALESCE("avgRating", 0) DESC
    """)
    return [dict(r) for r in rows]


# ── embedding helpers ─────────────────────────────────────────────────────────

def get_embeddings() -> VertexAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = VertexAIEmbeddings(
            model_name=settings.gemini_embedding_model,
            project=settings.vertex_project_id,
            location=settings.vertex_location,
        )
    return _embeddings


async def generate_and_store_embedding(restaurant_id: str, data: dict) -> None:
    text = " ".join(filter(None, [
        data.get("name", ""),
        data.get("description", ""),
        " ".join(data.get("cuisine_types", [])),
        data.get("area", ""),
    ]))
    embedding = get_embeddings().embed_query(text)
    conn = await _get_conn()
    try:
        await conn.execute(
            'UPDATE "Restaurant" SET embedding = $1 WHERE id = $2',
            embedding,
            restaurant_id,
        )
    finally:
        await conn.close()


# ── lookup by name (used by reservation agent) ────────────────────────────────

async def lookup_restaurant_by_name(name: str) -> dict | None:
    conn = await _get_conn()
    try:
        # Try exact substring first, then fuzzy via Python
        rows = await conn.fetch(
            """
            SELECT id, name, area, "cuisineTypes", "priceRange", "imageUrls", "avgRating"
            FROM "Restaurant"
            WHERE "isActive" = true
            """,
        )
        candidates = [dict(r) for r in rows]
        # exact substring (fast path)
        for r in candidates:
            if name.lower().strip() in (r.get("name") or "").lower():
                return r
        # fuzzy fallback
        for r in candidates:
            if _fuzzy_match(r.get("name") or "", name, threshold=0.7):
                return r
        return None
    finally:
        await conn.close()


# ── main search functions ─────────────────────────────────────────────────────

async def _fake_search(
    query: str, limit: int, filters: dict, lat: float | None = None, lng: float | None = None
) -> list[dict]:
    """Python-side filter search — no SQL WHERE filters, fuzzy matching in Python."""
    conn = await _get_conn()
    try:
        all_restaurants = await _fetch_all_restaurants(conn)
    finally:
        await conn.close()

    # Apply filters in Python (progressive relaxation)
    matched = [r for r in all_restaurants if _restaurant_matches(r, filters)]

    if not matched:
        # Relax one filter at a time
        for relaxed in [
            {k: v for k, v in filters.items() if k != "area"},
            {k: v for k, v in filters.items() if k != "cuisine"},
            {},
        ]:
            matched = [r for r in all_restaurants if _restaurant_matches(r, relaxed)]
            if matched:
                break

    # Also score against free-text query keywords for ranking
    stop = {"give", "find", "show", "list", "want", "need", "good", "best",
             "restaurant", "restaurants", "some", "near", "with", "that", "have", "tell", "about"}
    keywords = [w for w in query.lower().split() if len(w) > 2 and w not in stop]

    def _kw_score(r: dict) -> float:
        text = " ".join(filter(None, [
            r.get("name"), r.get("description"), r.get("area"),
        ])).lower()
        return sum(1 for kw in keywords if kw in text)

    matched.sort(key=lambda r: (_kw_score(r), r.get("avgRating") or 0), reverse=True)

    if lat is not None and lng is not None:
        return _sort_by_distance(matched, lat, lng, limit)
    return matched[:limit]


async def semantic_search(
    query: str,
    limit: int = 5,
    filters: dict | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> list[dict]:
    if filters is None:
        filters = {}

    if settings.use_fake_embeddings:
        return await _fake_search(query, limit, filters, lat=lat, lng=lng)

    # Fetch a large candidate pool from pgvector (no SQL filter clauses),
    # then apply fuzzy Python-side filtering so typos and partial matches work.
    fetch_limit = max(limit * 6, 30)
    query_embedding = get_embeddings().embed_query(query)
    conn = await _get_conn()

    try:
        rows = await conn.fetch("""
            SELECT
                id, name, description, address, area,
                "cuisineTypes", "priceRange", "avgRating", "imageUrls",
                latitude, longitude,
                1 - (embedding <=> $1::vector) AS similarity
            FROM "Restaurant"
            WHERE "isActive" = true AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        """, query_embedding, fetch_limit)
        candidates = [dict(r) for r in rows]
    finally:
        await conn.close()

    # Python-side fuzzy filter (progressive relaxation)
    matched = [r for r in candidates if _restaurant_matches(r, filters)]

    if not matched and filters:
        for relaxed in [
            {k: v for k, v in filters.items() if k != "area"},
            {k: v for k, v in filters.items() if k != "cuisine"},
            {},
        ]:
            matched = [r for r in candidates if _restaurant_matches(r, relaxed)]
            if matched:
                break

    # If vector search returned nothing (no embeddings at all), fall back to fake search
    if not matched:
        return await _fake_search(query, limit, filters, lat=lat, lng=lng)

    if lat is not None and lng is not None:
        return _sort_by_distance(matched, lat, lng, limit)
    return matched[:limit]
