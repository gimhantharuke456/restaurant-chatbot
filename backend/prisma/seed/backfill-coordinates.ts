/**
 * Idempotent backfill for Restaurant.latitude/longitude.
 *
 * These columns have existed on the schema for a while but nothing ever
 * populated them, so "near me" distance sorting had no coordinates to sort
 * by. There's no geocoding API key configured, but the platform only
 * operates in a small fixed set of named Colombo-area zones, so an
 * area-name → approximate coordinate lookup is precise enough for
 * city-scale "near me" ranking. Safe to run on every `npm run dev` start:
 * a no-op once every restaurant already has coordinates.
 */
import { prisma } from "../../lib/db";

const AREA_COORDS: Record<string, [number, number]> = {
  "Colombo 01": [6.9344, 79.8428],
  "Colombo 02": [6.9271, 79.8449],
  "Colombo 03": [6.9147, 79.8483],
  "Colombo 04": [6.8905, 79.8565],
  "Colombo 05": [6.8824, 79.8677],
  "Colombo 06": [6.8747, 79.8608],
  "Colombo 07": [6.9034, 79.8637],
  "Colombo 10": [6.9280, 79.8635],
  "Mount Lavinia": [6.8389, 79.8653],
  "Nugegoda": [6.8728, 79.8890],
  "Rajagiriya": [6.9095, 79.8925],
};

async function backfillCoordinates(): Promise<void> {
  const missing = await prisma.restaurant.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, area: true },
  });

  if (missing.length === 0) {
    console.log("[backfill-coordinates] all restaurants already have coordinates");
    return;
  }

  let updated = 0;
  let unmatched = 0;
  for (const r of missing) {
    const coords = AREA_COORDS[r.area];
    if (!coords) {
      unmatched += 1;
      continue;
    }
    await prisma.restaurant.update({
      where: { id: r.id },
      data: { latitude: coords[0], longitude: coords[1] },
    });
    updated += 1;
  }

  console.log(`[backfill-coordinates] set coordinates on ${updated} restaurant(s)`);
  if (unmatched > 0) {
    console.warn(`[backfill-coordinates] ${unmatched} restaurant(s) have an unrecognised area — skipped`);
  }
}

backfillCoordinates()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[backfill-coordinates] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
