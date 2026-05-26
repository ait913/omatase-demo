import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

const tables = [
  "event_chat_message",
  "schedule_chat_message",
  "announcement",
  "schedule_feature_state",
  "schedule_feature",
  "schedule_member",
  "schedule",
  "membership",
  "event",
  "verification",
  "account",
  "session",
  "user",
] as const;

export async function resetDb() {
  await db.run(sql.raw("PRAGMA foreign_keys = OFF"));
  for (const table of tables) {
    await db.run(sql.raw(`DELETE FROM ${table}`));
  }
  await db.run(sql.raw("PRAGMA foreign_keys = ON"));
}
