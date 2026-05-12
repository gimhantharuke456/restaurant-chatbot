import { seedUsers } from "./seeders/01-users";
import { seedRestaurants } from "./seeders/02-restaurants";
import { seedMenuItems } from "./seeders/03-menu-items";
import { seedReviews } from "./seeders/04-reviews";
import { seedReservations } from "./seeders/05-reservations";
import { seedPayments } from "./seeders/06-payments";
import { seedNeo4j } from "./seeders/08-neo4j";
import { seedFirestore } from "./seeders/09-firestore";
import { SeedUser, SeedReservation } from "./types";
import { prisma } from "../../lib/db";

async function main() {
  console.log("\n🌱 Starting knowledge base seeding...\n");
  const start = Date.now();

  try {
    // ── PostgreSQL ──────────────────────────────────────
    console.log("📦 PostgreSQL");

    const users = await seedUsers();
    const adminUsers = users.filter((u) => u.role === "RESTAURANT_ADMIN");
    const customers = users.filter((u) => u.role === "CUSTOMER");

    const restaurants = await seedRestaurants(adminUsers);
    const menuItems = await seedMenuItems(restaurants);
    await seedReviews(restaurants, customers, menuItems);
    const reservations = await seedReservations(restaurants, customers);
    await seedPayments(reservations);

    // ── Neo4j ───────────────────────────────────────────
    console.log("\n🕸️  Neo4j");
    const allReservations: SeedReservation[] =
      await prisma.reservation.findMany({
        include: { user: true, restaurant: true },
      });
    await seedNeo4j(restaurants, customers, allReservations);

    // ── Firestore ───────────────────────────────────────
    console.log("\n🔥 Firestore");
    await seedFirestore(restaurants);

    // ── Summary ─────────────────────────────────────────
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log("\n✅ Seeding complete!\n");

    const stats = {
      users: await prisma.user.count(),
      restaurants: await prisma.restaurant.count(),
      menuItems: await prisma.menuItem.count(),
      reviews: await prisma.review.count(),
      reservations: await prisma.reservation.count(),
      payments: await prisma.payment.count(),
    };

    console.log("📊 Summary:");
    console.table(stats);
    console.log(`\n⏱  Time: ${elapsed}s`);
  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
