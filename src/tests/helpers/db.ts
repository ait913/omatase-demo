import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = MEMORY");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db, sqlite };
}
