import { spawnSync } from "node:child_process";

const isVercel = process.env.VERCEL === "1";
const postgresSchema = "prisma/postgresql/schema.prisma";
const env = { ...process.env };

if (isVercel) {
  const missing = ["DATABASE_URL", "DIRECT_URL", "SESSION_SECRET"].filter(
    (name) => !env[name],
  );
  if (missing.length > 0) {
    console.error(`Missing required Vercel environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
} else {
  const buildDatabaseUrl = "postgresql://build:build@localhost:5432/horizon";
  env.DATABASE_URL ||= buildDatabaseUrl;
  env.DIRECT_URL ||= env.DATABASE_URL;
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const prismaCli = "node_modules/prisma/build/index.js";
const nextCli = "node_modules/next/dist/bin/next";

run([prismaCli, "generate", "--schema", postgresSchema]);

if (isVercel) {
  run([prismaCli, "migrate", "deploy", "--schema", postgresSchema]);
}

run([nextCli, "build"]);
