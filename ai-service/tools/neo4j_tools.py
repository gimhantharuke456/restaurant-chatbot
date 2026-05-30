from ..config.neo4j import get_session


def get_user_preferences(user_id: str) -> dict:
    with get_session() as session:
        pref_result = session.run(
            """
            MATCH (u:User {id: $user_id})-[r:PREFERS]->(c:Cuisine)
            RETURN c.name AS cuisine, r.weight AS weight
            ORDER BY r.weight DESC LIMIT 5
            """,
            user_id=user_id,
        )
        preferences = [{"cuisine": r["cuisine"], "weight": r["weight"]} for r in pref_result]

        visited_result = session.run(
            """
            MATCH (u:User {id: $user_id})-[:VISITED]->(res:Restaurant)
            RETURN res.id AS id, res.name AS name LIMIT 10
            """,
            user_id=user_id,
        )
        visited = [{"id": r["id"], "name": r["name"]} for r in visited_result]

    return {"preferences": preferences, "visited": visited}


def update_user_preference(user_id: str, cuisine: str, weight_delta: float = 0.1) -> None:
    with get_session() as session:
        session.run(
            """
            MERGE (u:User {id: $user_id})
            MERGE (c:Cuisine {name: $cuisine})
            MERGE (u)-[r:PREFERS]->(c)
            ON CREATE SET r.weight = $weight
            ON MATCH  SET r.weight = r.weight + $delta
            """,
            user_id=user_id,
            cuisine=cuisine,
            weight=weight_delta,
            delta=weight_delta,
        )


def record_visit(user_id: str, restaurant_id: str, restaurant_name: str, cuisine: str) -> None:
    with get_session() as session:
        session.run(
            """
            MERGE (u:User {id: $user_id})
            MERGE (r:Restaurant {id: $restaurant_id, name: $name})
            MERGE (u)-[:VISITED]->(r)
            """,
            user_id=user_id,
            restaurant_id=restaurant_id,
            name=restaurant_name,
        )
    update_user_preference(user_id, cuisine, weight_delta=0.15)


def get_occasion_cuisines(occasion: str) -> list[dict]:
    with get_session() as session:
        result = session.run(
            """
            MATCH (o:Occasion {id: $occasion})-[s:SUITS]->(c:Cuisine)
            RETURN c.name AS cuisine, s.weight AS weight
            ORDER BY s.weight DESC
            """,
            occasion=occasion,
        )
        return [{"cuisine": r["cuisine"], "weight": r["weight"]} for r in result]
