"""Lightweight step recorder used to build a visualisable trace of a single
chat turn through the orchestrator + specialist agents, for the agent-demo
dashboard. Not used by the production /chat path's response shape unless the
caller asks for it — see main.py.
"""
import time
from typing import Any, Optional


def record(state: dict, step: str, label: str, started_at: Optional[float] = None, **fields: Any) -> None:
    trace = state.setdefault("trace", [])
    entry: dict = {"step": step, "label": label, **fields}
    if started_at is not None:
        entry["latencyMs"] = round((time.monotonic() - started_at) * 1000)
    trace.append(entry)


def now() -> float:
    return time.monotonic()
