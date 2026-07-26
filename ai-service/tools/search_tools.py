import math
import asyncpg
from langchain_google_vertexai import VertexAIEmbeddings

from config.settings import settings

_embeddings = None


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
    """Re-rank already-relevant candidates by proximity, attaching distanceKm.
    Rows without coordinates sort last (rather than being dropped) so results
    still degrade gracefully for the small number of restaurants whose area
    isn't in the coordinate backfill lookup."""
    with_distance = []
    without_distance = []
    for row in rows:
        lat2, lng2 = row.get("latitude"), row.get("longitude")
        if lat2 is None or lng2 is None:
            without_distance.append(row)
            continue
        row = {**row, "distanceKm": round(_haversine_km(lat, lng, lat2, lng2), 1)}
        with_distance.append(row)
    with_distance.sort(key=lambda r: r["distanceKm"])
    return (with_distance + without_distance)[:limit]


def get_embeddings() -> VertexAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = VertexAIEmbeddings(
            model_name=settings.gemini_embedding_model,
            project=settings.vertex_project_id,
            location=settings.vertex_location,
        )
    return _embeddings


async def _get_conn():
    return await asyncpg.connect(settings.database_url)


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


async def _fake_search(
    query: str, limit: int, filters: dict, lat: float | None = None, lng: float | None = None
) -> list[dict]:
    """Structured filter search — no vector/embedding column needed."""
    # Fetch a wider candidate pool when we'll re-rank by distance afterward,
    # so proximity re-sorting has more than `limit` rows to choose from.
    fetch_limit = limit * 3 if lat is not None and lng is not None else limit
    conn = await _get_conn()
    try:
        where_clauses = ['"isActive" = true']
        params: list = []

        if filters.get("cuisine"):
            params.append(f"%{filters['cuisine'].lower()}%")
            where_clauses.append(f'LOWER("cuisineTypes"::text) LIKE ${len(params)}')

        if filters.get("area"):
            params.append(f"%{filters['area'].lower()}%")
            where_clauses.append(f'LOWER(area) LIKE ${len(params)}')

        if filters.get("price_range"):
            params.append(filters["price_range"].upper())
            where_clauses.append(f'"priceRange" = ${len(params)}')

        # keyword fallback: search name/description/area with individual words
        keywords = [w for w in query.lower().split() if len(w) > 3
                    and w not in {"give", "find", "show", "list", "want", "need", "good", "best",
                                  "restaurant", "restaurants", "some", "near", "with", "that", "have"}]
        if keywords:
            kw_clauses = []
            for kw in keywords[:3]:
                params.append(f"%{kw}%")
                idx = len(params)
                kw_clauses.append(
                    f'(LOWER(name) LIKE ${idx} OR LOWER(COALESCE(description,\'\')) LIKE ${idx} OR LOWER(area) LIKE ${idx})'
                )
            where_clauses.append(f"({' OR '.join(kw_clauses)})")

        params.append(fetch_limit)
        where_sql = " AND ".join(where_clauses)

        rows = await conn.fetch(f"""
            SELECT
                id, name, description, address, area,
                "cuisineTypes", "priceRange", "avgRating", "imageUrls",
                latitude, longitude,
                1.0 AS similarity
            FROM "Restaurant"
            WHERE {where_sql}
            ORDER BY COALESCE("avgRating", 0) DESC
            LIMIT ${len(params)}
        """, *params)

        # if keyword filter returned nothing, retry without keyword filter
        if not rows and keywords:
            params_no_kw: list = []
            base_clauses = ['"isActive" = true']
            if filters.get("cuisine"):
                params_no_kw.append(f"%{filters['cuisine'].lower()}%")
                base_clauses.append(f'LOWER("cuisineTypes"::text) LIKE ${len(params_no_kw)}')
            if filters.get("area"):
                params_no_kw.append(f"%{filters['area'].lower()}%")
                base_clauses.append(f'LOWER(area) LIKE ${len(params_no_kw)}')
            if filters.get("price_range"):
                params_no_kw.append(filters["price_range"].upper())
                base_clauses.append(f'"priceRange" = ${len(params_no_kw)}')
            params_no_kw.append(fetch_limit)
            rows = await conn.fetch(f"""
                SELECT
                    id, name, description, address, area,
                    "cuisineTypes", "priceRange", "avgRating", "imageUrls",
                    latitude, longitude,
                    1.0 AS similarity
                FROM "Restaurant"
                WHERE {" AND ".join(base_clauses)}
                ORDER BY COALESCE("avgRating", 0) DESC
                LIMIT ${len(params_no_kw)}
            """, *params_no_kw)

        results = [dict(row) for row in rows]
        if lat is not None and lng is not None:
            return _sort_by_distance(results, lat, lng, limit)
        return results
    finally:
        await conn.close()


async def lookup_restaurant_by_name(name: str) -> dict | None:
    """Return the first restaurant whose name contains `name` (case-insensitive)."""
    conn = await _get_conn()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, name, area, "cuisineTypes", "priceRange", "imageUrls", "avgRating"
            FROM "Restaurant"
            WHERE LOWER(name) LIKE $1 AND "isActive" = true
            LIMIT 1
            """,
            f"%{name.lower().strip()}%",
        )
        return dict(row) if row else None
    finally:
        await conn.close()


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

    # Fetch a wider candidate pool when we'll re-rank by distance afterward,
    # so proximity re-sorting has more than `limit` rows to choose from.
    fetch_limit = limit * 3 if lat is not None and lng is not None else limit

    query_embedding = get_embeddings().embed_query(query)
    conn = await _get_conn()

    try:
        where_clauses = [
            '"isActive" = true',
            '"isVerified" = true',
            'embedding IS NOT NULL',
        ]
        params: list = [query_embedding, fetch_limit]

        if filters.get("cuisine"):
            params.append(f"%{filters['cuisine'].lower()}%")
            where_clauses.append(f'LOWER("cuisineTypes"::text) LIKE ${len(params)}')

        if filters.get("area"):
            params.append(f"%{filters['area'].lower()}%")
            where_clauses.append(f'LOWER(area) LIKE ${len(params)}')

        if filters.get("price_range"):
            params.append(filters["price_range"].upper())
            where_clauses.append(f'"priceRange" = ${len(params)}')

        where_sql = " AND ".join(where_clauses)

        rows = await conn.fetch(f"""
            SELECT
                id, name, description, address, area,
                "cuisineTypes", "priceRange", "avgRating", "imageUrls",
                latitude, longitude,
                1 - (embedding <=> $1::vector) AS similarity
            FROM "Restaurant"
            WHERE {where_sql}
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        """, *params)

        results = [dict(row) for row in rows]
        if lat is not None and lng is not None:
            return _sort_by_distance(results, lat, lng, limit)
        return results
    finally:
        await conn.close()
