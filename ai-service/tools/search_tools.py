import asyncpg
from langchain_google_vertexai import VertexAIEmbeddings

from ..config.settings import settings

_embeddings = None


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


async def semantic_search(query: str, limit: int = 5, filters: dict | None = None) -> list[dict]:
    if filters is None:
        filters = {}

    query_embedding = get_embeddings().embed_query(query)
    conn = await _get_conn()

    try:
        where_clauses = [
            '"isActive" = true',
            '"isVerified" = true',
            'embedding IS NOT NULL',
        ]
        params: list = [query_embedding, limit]

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
                1 - (embedding <=> $1::vector) AS similarity
            FROM "Restaurant"
            WHERE {where_sql}
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        """, *params)

        return [dict(row) for row in rows]
    finally:
        await conn.close()
