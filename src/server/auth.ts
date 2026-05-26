import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { db } from "./db/client.js";
import * as authSchema from "./db/auth-schema.js";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
const secret = process.env.BETTER_AUTH_SECRET || "development-secret-change-me-32chars";

export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    anonymous({
      emailDomainName: "omatase.local",
      generateName: (ctx) => {
        const raw = ctx.request?.headers.get("x-guest-name") ?? "";
        let decoded: string;
        try {
          decoded = decodeURIComponent(raw);
        } catch {
          decoded = raw;
        }
        const trimmed = decoded.trim().slice(0, 80);
        return trimmed.length > 0 ? trimmed : "ゲスト";
      },
    }),
  ],
  trustedOrigins: [baseURL, ...(process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? [])],
});
