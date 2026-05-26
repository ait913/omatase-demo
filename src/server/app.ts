import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { auth } from "./auth.js";
import announcements from "./routes/announcements.js";
import chats from "./routes/chats.js";
import events from "./routes/events.js";
import features from "./routes/features.js";
import progress from "./routes/progress.js";
import schedules from "./routes/schedules.js";
import { errorResponse } from "./lib/error.js";
import type { AppEnv } from "./lib/types.js";

export const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? ["http://localhost:5173"],
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use("/api/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.route("/api/events", events);
app.route("/api", schedules);
app.route("/api", features);
app.route("/api", announcements);
app.route("/api", chats);
app.route("/api", progress);

if (process.env.SERVE_STATIC === "1") {
  app.use("*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" }));
}

app.onError(errorResponse);
