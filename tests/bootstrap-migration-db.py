import hashlib
import pathlib
import sqlite3
import sys

database = pathlib.Path(sys.argv[1])
migrations_dir = pathlib.Path(sys.argv[2])
migrations = sorted(path for path in migrations_dir.iterdir() if (path / "migration.sql").exists())
if database.exists():
    database.unlink()

connection = sqlite3.connect(database)
connection.execute('''CREATE TABLE "_prisma_migrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)''')

# Let Prisma's own engine apply the newest migration. Apply the historical
# baseline SQL to an empty disposable database so no local database is copied.
for migration in migrations[:-1]:
    sql_file = migration / "migration.sql"
    connection.executescript(sql_file.read_text(encoding="utf-8"))
    checksum = hashlib.sha256(sql_file.read_bytes()).hexdigest()
    connection.execute(
        'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)',
        (f"test-{migration.name}", checksum, migration.name),
    )
connection.commit()
connection.close()
