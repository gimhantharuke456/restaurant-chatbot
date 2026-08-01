from graph.graph import compiled_graph


async def run_pipeline(state: dict) -> dict:
    result = await compiled_graph.ainvoke(state)
    return result
