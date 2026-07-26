import time
import httpx

from config.settings import settings

# Colombo, Sri Lanka — the platform's single-city footprint (see seed data).
_LAT, _LON = 6.9271, 79.8612
_CACHE_TTL_SECONDS = 1800  # 30 min — weather doesn't need to be fresher than that
_cache: dict = {"expires_at": 0, "value": None}


async def get_current_weather() -> dict | None:
    """Returns {"condition": str, "temp_c": float} for Colombo, or None if
    unavailable (no API key configured, or the request failed) — callers
    must treat weather as optional context, never a hard dependency."""
    if not settings.openweather_api_key:
        return None

    now = time.time()
    if _cache["value"] is not None and _cache["expires_at"] > now:
        return _cache["value"]

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": _LAT,
                    "lon": _LON,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    try:
        result = {
            "condition": data["weather"][0]["main"],
            "temp_c": round(data["main"]["temp"]),
        }
    except (KeyError, IndexError):
        return None

    _cache["value"] = result
    _cache["expires_at"] = now + _CACHE_TTL_SECONDS
    return result
