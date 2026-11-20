const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const [bootstrapScript, databaseFile, migrationsDirectory] = process.argv.slice(2);
if (!bootstrapScript || !databaseFile || !migrationsDirectory) {
  throw new Error("Usage: run-bootstrap-migration-db.cjs <bootstrap.py> <database> <migrations>");
}

function findPython() {
  const candidates = process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
      ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, "--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (result.status === 0) return candidate;
  }
  return null;
}

const python = findPython();
if (python) {
  execFileSync(
    python.command,
    [...python.prefix, bootstrapScript, databaseFile, migrationsDirectory],
    { stdio: "pipe", windowsHide: true },
  );
  process.exit(0);
}

// Node 22+ provides a built-in SQLite API. This keeps disposable integration
// tests runnable on Windows/CI images that do not preinstall Python.
const { DatabaseSync } = require("node:sqlite");
fs.rmSync(databaseFile, { force: true });
const database = new DatabaseSync(databaseFile);
database.exec(`CREATE TABLE "_prisma_migrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`);

const migrations = fs.readdirSync(migrationsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(migrationsDirectory, name, "migration.sql")))
  .sort();
const insertMigration = database.prepare(
  'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)',
);
for (const migration of migrations.slice(0, -1)) {
  const sqlFile = path.join(migrationsDirectory, migration, "migration.sql");
  database.exec(fs.readFileSync(sqlFile, "utf8"));
  const checksum = require("node:crypto")
    .createHash("sha256")
    .update(fs.readFileSync(sqlFile))
    .digest("hex");
  insertMigration.run(`test-${migration}`, checksum, migration);
}
database.close();
