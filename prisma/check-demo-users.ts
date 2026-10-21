
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.demoUser.findMany({
    select: {
      username: true,
      role: true,
      password_hash: true,
    },
  });

  for (const user of users) {
    console.log({
      username: user.username,
      role: user.role,
      hashStartsWithBcrypt: /^\$2[aby]\$/.test(
        user.password_hash
      ),
    });
  }
}

main()
  .catch(() => {
    console.error("Demo user verification failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
