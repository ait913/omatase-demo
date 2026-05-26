process.env.DATABASE_URL ??= ":memory:";
process.env.BETTER_AUTH_URL ??= "http://localhost:5173";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret";

// 設計 §10.5 は src/server/index.ts での起動時 migration を規定するが、
// テストは src/server/app.ts を直接 import するため index.ts を経由しない。
// 設計 §9.2 は「各テスト前に in-memory SQLite を作って drizzle migration を流す」とするので、
// テストプロセス内では setup 時に migration を流して app の db client が見るテーブルを作る。
import Database from "better-sqlite3";
import { migrate as migrateBetterSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { db as appDb } from "@/server/db/client";

// app の db client が :memory: を開いた直後に migration を流す
try {
  migrateBetterSqlite(appDb as any, { migrationsFolder: "./drizzle" });
} catch (e) {
  // 設計上の規約: db client が migrate を受けない API なら、ここで例外を握り潰さず可視化
  // (helper としては実装の制約に依存するため fail で良い)
  console.error("[setup.server] migration failed against app db:", e);
  throw e;
}
