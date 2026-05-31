import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      cuisineTypes: true,
      area: true,
    },
  });

  console.log(`Found ${restaurants.length} restaurants to embed.`);

  let success = 0;
  let failed = 0;

  for (const r of restaurants) {
    try {
      await axios.post(`${AI_SERVICE_URL}/embed/restaurant/${r.id}`, {
        name: r.name,
        description: r.description ?? "",
        cuisine_types: r.cuisineTypes,
        area: r.area,
      });
      console.log(`✓ ${r.name}`);
      success++;
    } catch (err: any) {
      console.error(`✗ ${r.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} embedded, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
