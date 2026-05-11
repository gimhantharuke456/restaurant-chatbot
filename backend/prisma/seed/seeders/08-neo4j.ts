import { runCypher, driver } from "../utils/neo4j";
import { CUISINE_TYPES } from "../constants/cuisine";
import { Restaurant, User } from "@prisma/client";
import { SeedReservation } from "../types";

export async function seedNeo4j(
  restaurants: Restaurant[],
  customers: User[],
  reservations: SeedReservation[],
): Promise<void> {
  console.log("  Seeding Neo4j graph...");

  // 1. clear existing data
  await runCypher("MATCH (n) DETACH DELETE n");

  // 2. seed Cuisine nodes
  for (const cuisine of CUISINE_TYPES) {
    await runCypher("MERGE (:Cuisine {id: $id, name: $name})", {
      id: cuisine.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: cuisine,
    });
  }

  // 3. seed Occasion nodes
  const occasions = [
    { id: "date", name: "Romantic Date" },
    { id: "family", name: "Family Dining" },
    { id: "business", name: "Business Lunch" },
    { id: "casual", name: "Casual Hangout" },
    { id: "celebration", name: "Celebration" },
    { id: "birthday", name: "Birthday" },
    { id: "anniversary", name: "Anniversary" },
  ];
  for (const occ of occasions) {
    await runCypher("MERGE (:Occasion {id: $id, name: $name})", occ);
  }

  // 4. seed Restaurant nodes (linked to cuisine)
  for (const restaurant of restaurants) {
    await runCypher(
      "MERGE (:Restaurant {id: $id, name: $name, area: $area, priceRange: $priceRange, avgRating: $avgRating})",
      {
        id: restaurant.id,
        name: restaurant.name,
        area: restaurant.area,
        priceRange: restaurant.priceRange,
        avgRating: restaurant.avgRating || 4.0,
      },
    );

    for (const cuisine of restaurant.cuisineTypes) {
      const cuisineId = cuisine.toLowerCase().replace(/[^a-z0-9]/g, "-");
      await runCypher(
        `
        MATCH (r:Restaurant {id: $restaurantId}), (c:Cuisine {id: $cuisineId})
        MERGE (r)-[:SERVES]->(c)
      `,
        { restaurantId: restaurant.id, cuisineId },
      );
    }
  }

  // 5. seed Occasion → Cuisine affinities
  const occasionAffinities: [string, string, number][] = [
    ["date", "italian", 0.9],
    ["date", "japanese", 0.85],
    ["date", "continental", 0.8],
    ["date", "seafood", 0.75],
    ["family", "sri-lankan", 0.95],
    ["family", "chinese", 0.85],
    ["family", "indian", 0.8],
    ["family", "bbq-&-grill", 0.75],
    ["business", "continental", 0.9],
    ["business", "japanese", 0.8],
    ["business", "italian", 0.75],
    ["business", "seafood", 0.7],
    ["casual", "bbq-&-grill", 0.9],
    ["casual", "sri-lankan", 0.85],
    ["casual", "thai", 0.8],
    ["casual", "chinese", 0.75],
    ["celebration", "seafood", 0.9],
    ["celebration", "continental", 0.85],
    ["celebration", "italian", 0.8],
    ["birthday", "bbq-&-grill", 0.85],
    ["birthday", "italian", 0.8],
    ["birthday", "desserts-&-cafe", 0.9],
    ["anniversary", "continental", 0.95],
    ["anniversary", "italian", 0.9],
    ["anniversary", "japanese", 0.85],
    ["anniversary", "seafood", 0.8],
  ];

  for (const [occasionId, cuisineId, weight] of occasionAffinities) {
    await runCypher(
      `
      MATCH (o:Occasion {id: $occasionId}), (c:Cuisine {id: $cuisineId})
      MERGE (o)-[:SUITS {weight: $weight}]->(c)
    `,
      { occasionId, cuisineId, weight },
    );
  }

  // 6. seed User nodes + preference graph from reservation history
  const completedReservations = reservations.filter(
    (r) => r.status === "COMPLETED",
  );

  // track which users have been created in Neo4j
  const seenUsers = new Set<string>();

  for (const reservation of completedReservations) {
    const userId = reservation.userId;
    const restaurant = reservation.restaurant;

    if (!seenUsers.has(userId)) {
      await runCypher("MERGE (:User {id: $id, name: $name})", {
        id: userId,
        name: reservation.user?.name || "Unknown",
      });
      seenUsers.add(userId);
    }

    // VISITED relationship
    await runCypher(
      `
      MATCH (u:User {id: $userId}), (r:Restaurant {id: $restaurantId})
      MERGE (u)-[v:VISITED]->(r)
      ON CREATE SET v.count = 1, v.lastVisit = $date
      ON MATCH SET v.count = v.count + 1, v.lastVisit = $date
    `,
      {
        userId,
        restaurantId: restaurant.id,
        date: reservation.date.toISOString(),
      },
    );

    // PREFERS relationship on cuisines
    for (const cuisine of restaurant.cuisineTypes) {
      const cuisineId = cuisine.toLowerCase().replace(/[^a-z0-9]/g, "-");
      await runCypher(
        `
        MATCH (u:User {id: $userId}), (c:Cuisine {id: $cuisineId})
        MERGE (u)-[p:PREFERS]->(c)
        ON CREATE SET p.weight = 0.15, p.interactions = 1
        ON MATCH SET p.weight = p.weight + 0.1, p.interactions = p.interactions + 1
      `,
        { userId, cuisineId },
      );
    }
  }

  console.log(
    `  ✓ Neo4j graph: ${CUISINE_TYPES.length} cuisines, ${occasions.length} occasions, ${restaurants.length} restaurants, ${seenUsers.size} users`,
  );
  await driver.close();
}
