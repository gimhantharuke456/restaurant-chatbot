/**
 * Idempotent cleanup for duplicate Restaurant rows.
 *
 * seedRestaurants() (seeders/02-restaurants.ts) uses createMany with a
 * freshly-generated id on every run, so running the seed more than once
 * without a full db reset leaves N copies of every restaurant, all pointing
 * at the same adminId. Since the portal looks up "my restaurant" via
 * `restaurant.findFirst({ where: { adminId } })` with no orderBy, it can
 * land on whichever duplicate happens to come back first — one that may
 * have none of the admin's actual reservations, making them "disappear".
 *
 * This script finds every adminId with more than one restaurant, keeps the
 * duplicate with the most reservations as canonical (ties broken by the
 * oldest), re-points every restaurant-scoped row from the others onto it,
 * and deletes the now-empty duplicates. Safe to run on every `npm run dev`
 * start: a no-op once there are no duplicates left.
 */
import { prisma } from "../../lib/db";

async function dedupeRestaurants(): Promise<void> {
  const restaurants = await prisma.restaurant.findMany({ orderBy: { createdAt: "asc" } });

  const byAdmin = new Map<string, typeof restaurants>();
  for (const r of restaurants) {
    const list = byAdmin.get(r.adminId) ?? [];
    list.push(r);
    byAdmin.set(r.adminId, list);
  }

  const duplicateGroups = [...byAdmin.values()].filter((group) => group.length > 1);
  if (duplicateGroups.length === 0) {
    console.log("[dedupe-restaurants] no duplicates found");
    return;
  }

  for (const group of duplicateGroups) {
    const counts = await Promise.all(
      group.map((r) => prisma.reservation.count({ where: { restaurantId: r.id } })),
    );

    let canonicalIndex = 0;
    for (let i = 1; i < group.length; i++) {
      if (counts[i] > counts[canonicalIndex]) canonicalIndex = i;
    }
    const canonical = group[canonicalIndex];
    const losers = group.filter((_, i) => i !== canonicalIndex);

    for (const loser of losers) {
      await prisma.menuItem.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.reservation.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.review.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.reviewReply.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.waitlist.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.promotion.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });
      await prisma.complaint.updateMany({ where: { restaurantId: loser.id }, data: { restaurantId: canonical.id } });

      // Favorite has @@unique([userId, restaurantId]) — a user could in
      // theory have favorited both the loser and the canonical duplicate.
      // Drop the loser's row rather than let the re-point violate the
      // constraint.
      const loserFavorites = await prisma.favorite.findMany({ where: { restaurantId: loser.id } });
      for (const fav of loserFavorites) {
        const clash = await prisma.favorite.findUnique({
          where: { userId_restaurantId: { userId: fav.userId, restaurantId: canonical.id } },
        });
        if (clash) {
          await prisma.favorite.delete({ where: { id: fav.id } });
        } else {
          await prisma.favorite.update({ where: { id: fav.id }, data: { restaurantId: canonical.id } });
        }
      }

      // RestaurantHoliday has @@unique([restaurantId, date]) — same
      // collision handling as Favorite above.
      const loserHolidays = await prisma.restaurantHoliday.findMany({ where: { restaurantId: loser.id } });
      for (const holiday of loserHolidays) {
        const clash = await prisma.restaurantHoliday.findUnique({
          where: { restaurantId_date: { restaurantId: canonical.id, date: holiday.date } },
        });
        if (clash) {
          await prisma.restaurantHoliday.delete({ where: { id: holiday.id } });
        } else {
          await prisma.restaurantHoliday.update({ where: { id: holiday.id }, data: { restaurantId: canonical.id } });
        }
      }

      await prisma.restaurant.delete({ where: { id: loser.id } });
    }

    console.log(
      `[dedupe-restaurants] merged ${losers.length} duplicate(s) of "${canonical.name}" into ${canonical.id}`,
    );
  }
}

dedupeRestaurants()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[dedupe-restaurants] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
