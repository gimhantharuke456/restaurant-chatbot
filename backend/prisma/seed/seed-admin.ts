import "dotenv/config";
import { adminAuth } from "../../src/config/firebase.js";
import { prisma } from "../../lib/db.js";

const ADMIN_EMAIL = "admin@agent.com";
const ADMIN_PASSWORD = "071656Ad@";
const ADMIN_NAME = "System Administrator";

async function main() {
  console.log("🔐 Seeding Firebase admin user...\n");

  // Create or update the Firebase Auth user
  let firebaseUid: string;
  try {
    const existing = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    await adminAuth.updateUser(existing.uid, { password: ADMIN_PASSWORD });
    firebaseUid = existing.uid;
    console.log(`  ✓ Updated existing Firebase user  (uid: ${firebaseUid})`);
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
    const created = await adminAuth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
      emailVerified: true,
    });
    firebaseUid = created.uid;
    console.log(`  ✓ Created Firebase user  (uid: ${firebaseUid})`);
  }

  // Upsert the corresponding row in Postgres
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { firebaseUid, role: "SYSTEM_ADMIN", name: ADMIN_NAME },
    create: {
      firebaseUid,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "SYSTEM_ADMIN",
    },
  });

  console.log(`  ✓ Upserted Postgres user  (id: ${user.id})`);
  console.log("\n✅ Admin user ready");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("\n❌ Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
