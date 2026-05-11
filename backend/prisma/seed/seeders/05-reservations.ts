import { prisma } from "../utils/prisma";
import { randomInt, randomItem, pastDate, futureDate, weightedRandom } from "../utils/faker";
import { SeedRestaurant, SeedUser, SeedReservation } from "../types";
import { Prisma } from "@prisma/client";

const TIME_SLOTS = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];
const SPECIAL_REQUESTS = [
  "Window table please",
  "Celebrating a birthday — surprise cake would be wonderful",
  "One guest has a nut allergy",
  "Anniversary dinner, would appreciate a quiet table",
  null,
  null,
  null,
  null,
  null,
  null, // most have no special requests
];

export async function seedReservations(restaurants: SeedRestaurant[], customers: SeedUser[]): Promise<SeedReservation[]> {
  console.log("  Seeding reservations...");

  const reservations: Prisma.ReservationCreateManyInput[] = [];

  for (const customer of customers) {
    // each customer has 1–5 past reservations and 0–2 upcoming
    const pastCount = randomInt(1, 5);
    const futureCount = randomInt(0, 2);

    const selectedRestaurants = [...restaurants]
      .sort(() => Math.random() - 0.5)
      .slice(0, pastCount + futureCount);

    // past reservations
    for (let i = 0; i < pastCount; i++) {
      const restaurant = selectedRestaurants[i];
      if (!restaurant) continue;
      const statusWeights = [0.02, 0.88, 0.07, 0.03]; // PENDING, COMPLETED, CANCELLED, NO_SHOW
      const statuses = ["PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
      const status = statuses[weightedRandom(statusWeights)];

      reservations.push({
        userId: customer.id,
        restaurantId: restaurant.id,
        date: pastDate(randomInt(1, 180)),
        time: randomItem(TIME_SLOTS),
        partySize: randomInt(1, 6),
        specialRequests: randomItem(SPECIAL_REQUESTS),
        status,
        firestoreId: `fs_${customer.id.slice(0, 8)}_${restaurant.id.slice(0, 8)}_${i}`,
      });
    }

    // upcoming reservations
    for (let i = 0; i < futureCount; i++) {
      const restaurant = selectedRestaurants[pastCount + i];
      if (!restaurant) continue;

      reservations.push({
        userId: customer.id,
        restaurantId: restaurant.id,
        date: futureDate(randomInt(1, 30)),
        time: randomItem(TIME_SLOTS),
        partySize: randomInt(1, 6),
        specialRequests: randomItem(SPECIAL_REQUESTS),
        status: "CONFIRMED",
        firestoreId: `fs_future_${customer.id.slice(0, 8)}_${i}`,
      });
    }
  }

  await prisma.reservation.createMany({ data: reservations });
  console.log(`  ✓ ${reservations.length} reservations created`);

  return prisma.reservation.findMany({
    where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: { user: true, restaurant: true },
  });
}
