import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sqliteSchema = readFileSync(
  new URL("../prisma/schema.prisma", import.meta.url),
  "utf8",
);
const postgresSchema = readFileSync(
  new URL("../prisma/postgresql/schema.prisma", import.meta.url),
  "utf8",
);

test("production PostgreSQL schema keeps all local SQLite models and fields", () => {
  const modelDefinitions = (schema: string) =>
    schema.slice(schema.indexOf("model Department {")).trimEnd();

  assert.equal(modelDefinitions(postgresSchema), modelDefinitions(sqliteSchema));
});
