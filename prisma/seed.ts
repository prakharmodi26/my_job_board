import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("[Seed] Admin user already exists, skipping.");
    return;
  }

  const hash = await bcrypt.hash("12345678", 10);
  await prisma.user.create({
    data: {
      email: "admin@myjobboard.com",
      passwordHash: hash,
    },
  });
  console.log("[Seed] Created default admin user (admin@myjobboard.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
