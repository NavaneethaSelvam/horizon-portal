
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type DemoUser = {
  label: string;
  employee_id: string;
  full_name: string;
  username: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  demo_password: string;
};

async function main() {
  const filePath = path.join(
    process.cwd(),
    "prisma",
    "data",
    "03_Data_Pack",
    "demo_users.json"
  );

  const users = JSON.parse(
    fs.readFileSync(filePath, "utf8")
  ) as DemoUser[];

  if (users.length !== 4) {
    throw new Error(
      `Expected 4 demo users, found ${users.length}`
    );
  }

  for (const user of users) {
    const password = user.demo_password;

    if (
      !password ||
      password.includes("(hash it in YOUR seed script")
    ) {
      throw new Error(
        `Invalid demo password value for ${user.username}`
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.demoUser.upsert({
      where: {
        username: user.username,
      },
      create: {
        username: user.username,
        label: user.label,
        employee_id: user.employee_id,
        full_name: user.full_name,
        role: user.role,
        password_hash: passwordHash,
      },
      update: {
        label: user.label,
        employee_id: user.employee_id,
        full_name: user.full_name,
        role: user.role,
        password_hash: passwordHash,
      },
    });

    console.log(`Seeded demo user: ${user.role}`);
  }

  console.log("Demo users seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Demo user seeding failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
