import { prisma } from "../utils/prisma";
import { randomInt, randomItem, pastDate, weightedRandom } from "../utils/faker";
import { SeedRestaurant, SeedUser, SeedMenuItem } from "../types";
import { Prisma } from "@prisma/client";

const REVIEW_TEMPLATES = {
  5: [
    "Absolutely incredible. The {dish} was the best I've ever had in Colombo. Service was flawless.",
    "A perfect evening. The food, ambience, and staff were all exceptional. Already booked again.",
    "This is why {restaurant} has the reputation it does. Every dish was a masterpiece.",
    "Blown away. The {dish} alone is worth the trip. Five stars without hesitation.",
  ],
  4: [
    "Really enjoyed our evening here. The {dish} was outstanding and the service was attentive.",
    "Great experience overall. A couple of minor misses but the highs were very high.",
    "Solid food and a lovely atmosphere. The {dish} is a must-order.",
    "Very good restaurant. Will definitely return. The {dish} was the highlight.",
  ],
  3: [
    "Decent food but nothing particularly memorable. The {dish} was good, but pricey for what it is.",
    "Mixed experience. Great {dish} but the service was a bit slow on a busy night.",
    "Average visit. Food was fine but the portions were smaller than expected for the price.",
    "Okay restaurant. The {dish} was good. Wouldn't rush back but might give it another try.",
  ],
  2: [
    "Disappointed. Expected much more given the reputation. The {dish} was underwhelming.",
    "Overpriced for the quality. Service was inattentive and the food took a very long time.",
    "Won't be back. The {dish} had no flavour and the staff seemed uninterested.",
  ],
};

export async function seedReviews(
  restaurants: SeedRestaurant[],
  customers: SeedUser[],
  menuItems: SeedMenuItem[],
) {
  console.log("  Seeding reviews...");

  const reviews: Prisma.ReviewCreateManyInput[] = [];

  for (const restaurant of restaurants) {
    const restaurantMenuItems = menuItems.filter(
      (m) => m.restaurantId === restaurant.id,
    );
    const reviewCount = randomInt(8, 25);
    const reviewers = [...customers]
      .sort(() => Math.random() - 0.5)
      .slice(0, reviewCount);

    for (const reviewer of reviewers) {
      // weight ratings toward high end (realistic distribution)
      const ratingWeights = [0.03, 0.05, 0.12, 0.35, 0.45];
      const ratingIndex = weightedRandom(ratingWeights);
      const rating = ratingIndex + 1;

      const templates =
        REVIEW_TEMPLATES[rating as keyof typeof REVIEW_TEMPLATES] ||
        REVIEW_TEMPLATES[3];
      const template = randomItem(templates);
      const sampleDish =
        randomItem(restaurantMenuItems)?.name || "house special";
      const comment = template
        .replace("{dish}", sampleDish)
        .replace("{restaurant}", restaurant.name);

      reviews.push({
        userId: reviewer.id,
        restaurantId: restaurant.id,
        rating,
        comment,
        createdAt: pastDate(randomInt(1, 365)),
      });
    }
  }

  await prisma.review.createMany({ data: reviews });

  // update avgRating and totalReviews on each restaurant
  for (const restaurant of restaurants) {
    const stats = await prisma.review.aggregate({
      where: { restaurantId: restaurant.id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        avgRating: parseFloat((stats._avg.rating || 4.0).toFixed(1)),
        totalReviews: stats._count.rating,
      },
    });
  }

  console.log(`  ✓ ${reviews.length} reviews created, ratings updated`);
  return reviews;
}
