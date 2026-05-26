import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

function databasePath() {
  const raw = process.env.DATABASE_URL ?? "file:./data/omatase.db";
  if (raw === ":memory:") return raw;
  return raw.startsWith("file:") ? raw.slice(5) : raw;
}

const path = databasePath();
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

export const sqlite = new Database(path);
sqlite.pragma(path === ":memory:" ? "journal_mode = MEMORY" : "journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
