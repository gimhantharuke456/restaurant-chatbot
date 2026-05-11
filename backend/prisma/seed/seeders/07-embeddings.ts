import { prisma } from "../utils/prisma";
import { generateEmbedding } from "../utils/embeddings";
import { Restaurant, MenuItem } from "@prisma/client";

export async function seedEmbeddings(restaurants: Restaurant[], menuItems: MenuItem[]): Promise<void> {
  console.log("  Generating embeddings (this may take a minute)...");

  let count = 0;

  // embed restaurants
  for (const restaurant of restaurants) {
    const text = [
      restaurant.name,
      restaurant.description,
      restaurant.cuisineTypes.join(", "),
      restaurant.area,
      restaurant.priceRange.replace("_", " ").toLowerCase(),
    ].join(". ");

    const vector = await generateEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;

    await prisma.$executeRawUnsafe(`
      UPDATE "Restaurant"
      SET embedding = '${vectorStr}'::vector
      WHERE id = '${restaurant.id}'
    `);
    count++;
    if (count % 5 === 0)
      process.stdout.write(
        `  embedding ${count}/${restaurants.length + menuItems.length}...\r`,
      );
  }

  // embed menu items
  for (const item of menuItems) {
    const text = [
      item.name,
      item.description,
      item.category,
      item.dietaryInfo.join(", "),
    ]
      .filter(Boolean)
      .join(". ");

    const vector = await generateEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;

    await prisma.$executeRawUnsafe(`
      UPDATE "MenuItem"
      SET embedding = '${vectorStr}'::vector
      WHERE id = '${item.id}'
    `);
    count++;
    if (count % 10 === 0)
      process.stdout.write(
        `  embedding ${count}/${restaurants.length + menuItems.length}...\r`,
      );
  }

  console.log(
    `\n  ✓ ${restaurants.length} restaurant embeddings + ${menuItems.length} menu item embeddings generated`,
  );
}
