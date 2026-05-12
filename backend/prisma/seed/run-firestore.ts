import { prisma } from "../../lib/db";
import { seedFirestore } from "./seeders/09-firestore";

async function main() {
  const restaurants = await prisma.restaurant.findMany();
  await seedFirestore(restaurants);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
