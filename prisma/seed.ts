import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { seedDemoData } from "./seed-demo-data";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@culttwenty.de").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me-now";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✔ Admin user ready: ${user.email}`);

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("✔ Settings initialized");

  await seedDemoData();

  console.log("\nSeed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
