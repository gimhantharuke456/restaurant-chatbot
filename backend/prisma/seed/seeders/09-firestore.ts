import { db } from "../utils/firestore";
import { randomInt } from "../utils/faker";
import { Restaurant } from "@prisma/client";

interface TimeSlot {
  time: string;
  totalTables: number;
  bookedTables: number;
  available: boolean;
}

function generateSlots(date: Date): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const times = isWeekend
    ? [
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
        "20:00",
        "20:30",
        "21:00",
        "21:30",
      ]
    : [
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

  return times.map((time) => {
    const totalTables = randomInt(4, 8);
    // simulate some already-booked slots from existing reservations
    const bookedTables =
      Math.random() > 0.6 ? randomInt(0, Math.floor(totalTables * 0.6)) : 0;

    return {
      time,
      totalTables,
      bookedTables,
      available: bookedTables < totalTables,
    };
  });
}

export async function seedFirestore(restaurants: Restaurant[]): Promise<void> {
  console.log("  Seeding Firestore availability...");

  const today = new Date();
  const DAYS_AHEAD = 60;
  let docCount = 0;

  const batch = db.batch();
  let batchSize = 0;
  const MAX_BATCH = 400; // Firestore batch limit is 500

  for (const restaurant of restaurants) {
    // restaurant document
    const restaurantRef = db.collection("restaurants").doc(restaurant.id);
    batch.set(
      restaurantRef,
      {
        name: restaurant.name,
        area: restaurant.area,
        isOpen: true,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    batchSize++;

    const openingHours = restaurant.openingHours as Record<string, string>;

    for (let d = 0; d < DAYS_AHEAD; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];

      const slots = generateSlots(date);
      const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
        date.getDay()
      ];
      const hours = openingHours[dayOfWeek];
      const isClosed = hours === "closed";

      const availRef = restaurantRef.collection("availability").doc(dateStr);
      batch.set(availRef, {
        slots: isClosed ? [] : slots,
        isClosed,
        date: dateStr,
      });
      batchSize++;
      docCount++;

      // commit batch when approaching limit
      if (batchSize >= MAX_BATCH) {
        await batch.commit();
        batchSize = 0;
        process.stdout.write(`  firestore: ${docCount} docs written...\r`);
      }
    }
  }

  // commit remaining
  if (batchSize > 0) await batch.commit();

  console.log(
    `\n  ✓ ${docCount} Firestore availability documents created for ${restaurants.length} restaurants over ${DAYS_AHEAD} days`,
  );
}
