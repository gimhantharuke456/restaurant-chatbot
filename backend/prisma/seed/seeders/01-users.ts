import { randomSLName } from "../constants/sri-lankan-names";
import { randomInt } from "../utils/faker";
import { SeedUser } from "../types";
import { prisma } from "../../../lib/db";
import { Prisma, PriceRange } from "../../../generated/prisma/client";

// 20 restaurant admins + 60 customers = 80 users total
export async function seedUsers(): Promise<SeedUser[]> {
  console.log("  Seeding users...");

  const users: Prisma.UserCreateManyInput[] = [];

  // 20 restaurant admin accounts (one per restaurant)
  for (let i = 0; i < 20; i++) {
    const { name } = randomSLName();
    const email = `admin${i + 1}@restaurant${i + 1}.lk`;

    users.push({
      firebaseUid: `admin_firebase_uid_${i + 1}`,
      email,
      name,
      phone: `+9477${randomInt(1000000, 9999999)}`,
      role: "RESTAURANT_ADMIN",
    });
  }

  // 60 customer accounts
  for (let i = 0; i < 60; i++) {
    const { name, firstName, lastName } = randomSLName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com`;

    users.push({
      firebaseUid: `customer_firebase_uid_${i + 1}`,
      email,
      name,
      phone: `+9477${randomInt(1000000, 9999999)}`,
      role: "CUSTOMER",
    });
  }

  // 1 system admin
  users.push({
    firebaseUid: "system_admin_uid",
    email: "admin@restaurantchatbot.lk",
    name: "System Administrator",
    phone: "+94771234567",
    role: "SYSTEM_ADMIN",
  });

  await prisma.user.createMany({ data: users, skipDuplicates: true });

  const created = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`  ✓ ${created.length} users created`);
  return created;
}
