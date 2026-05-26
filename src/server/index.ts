import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db/client.js";
import { app } from "./app.js";

migrate(db, { migrationsFolder: "./drizzle" });

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) }, (info) => {
  console.log(`[server] listening on :${info.port}`);
});
