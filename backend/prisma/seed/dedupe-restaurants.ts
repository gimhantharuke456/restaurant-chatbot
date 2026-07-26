/**
 * Idempotent cleanup for duplicate Restaurant and MenuItem rows.
 *
 * seedRestaurants() / seedMenuItems() (seeders/02-restaurants.ts,
 * 03-menu-items.ts) use createMany with a freshly-generated id on every
 * run, so running the seed more than once without a full db reset leaves N
 * copies of every restaurant (all pointing at the same adminId) and N
 * copies of every menu item per restaurant. Two user-facing consequences:
 * the portal's `restaurant.findFirst({ where: { adminId } })` (no orderBy)
 * can land on whichever duplicate restaurant happens to come back first —
 * one that may have none of the admin's actual reservations — and the AI
 * chat's menu agent would show the same dish repeated N times.
 *
 * This script finds every adminId with more than one restaurant, keeps the
 * duplicate with the most reservations as canonical (ties broken by the
 * oldest), re-points every restaurant-scoped row from the others onto it,
 * and deletes the now-empty duplicates. It then collapses duplicate menu
 * items (same restaurant + name) down to one each. Safe to run on every
 * `npm run dev` start: a no-op once there's nothing left to merge.
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

async function dedupeMenuItems(): Promise<void> {
  const items = await prisma.menuItem.findMany({ orderBy: { createdAt: "asc" } });

  const byRestaurantAndName = new Map<string, typeof items>();
  for (const item of items) {
    const key = `${item.restaurantId}::${item.name}`;
    const list = byRestaurantAndName.get(key) ?? [];
    list.push(item);
    byRestaurantAndName.set(key, list);
  }

  let removed = 0;
  for (const group of byRestaurantAndName.values()) {
    if (group.length <= 1) continue;

    // Prefer a duplicate that already has an image over the (arbitrary)
    // oldest one, so a future image backfill isn't undone by this script.
    const canonical = group.find((i) => i.imageUrl) ?? group[0];
    const losers = group.filter((i) => i.id !== canonical.id);

    await prisma.menuItem.deleteMany({ where: { id: { in: losers.map((i) => i.id) } } });
    removed += losers.length;
  }

  console.log(
    removed > 0
      ? `[dedupe-restaurants] removed ${removed} duplicate menu item(s)`
      : "[dedupe-restaurants] no duplicate menu items found",
  );
}

dedupeRestaurants()
  .then(() => dedupeMenuItems())
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[dedupe-restaurants] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
