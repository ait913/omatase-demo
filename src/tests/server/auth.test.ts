import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/tests/helpers/app";
import { resetDb } from "@/tests/helpers/reset-db";
import { expectError, jsonHeaders, readJson } from "./_helpers";

// Hono の app.request は HTTP ヘッダ値が Latin-1 (ByteString) 制約。
// 設計 §7.1.1 では日本語 name "たんり" を要求しているので、テスト経路では
// percent-encode で送信し、サーバ側が `decodeURIComponent` するか raw bytes 保持するかを
// 両対応で検証する。これは設計上の曖昧さ (§8.1 で raw `headers.get` を使う実装例) に起因。
function isLatin1(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0xff) return false;
  return true;
}
function encH(s: string): string {
  return isLatin1(s) ? s : encodeURIComponent(s);
}
function nameMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  try { return decodeURIComponent(actual) === expected; } catch { return false; }
}

async function signInAnonymous(nameHeader?: string) {
  const headers: Record<string, string> = {};
  if (nameHeader !== undefined) headers["x-guest-name"] = encH(nameHeader);
  return app.request("/api/auth/sign-in/anonymous", { method: "POST", headers });
}

describe("server auth (§7.1, §8)", () => {
  beforeEach(async () => { await resetDb(); });

  it("7.1.1 signs in anonymously with x-guest-name, local email, anonymous user, and session cookie", async () => {
    const res = await signInAnonymous("たんり");

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("better-auth.session_token=");
    const body = await readJson(res);
    expect(nameMatches(body.user.name, "たんり")).toBe(true);
    expect(body.user.isAnonymous).toBe(true);
    expect(body.user.email).toMatch(/@omatase\.local$/);
  });

  it("7.1.2 falls back to ゲスト when x-guest-name is missing", async () => {
    const res = await signInAnonymous();
    expect(res.status).toBe(200);
    expect(nameMatches((await readJson(res)).user.name, "ゲスト")).toBe(true);
  });

  it("7.1.3 falls back to ゲスト when x-guest-name is blank", async () => {
    const res = await signInAnonymous("   ");
    expect(res.status).toBe(200);
    expect(nameMatches((await readJson(res)).user.name, "ゲスト")).toBe(true);
  });

  it("7.1.4 truncates x-guest-name to 80 characters", async () => {
    const longName = "a".repeat(81);
    const res = await signInAnonymous(longName);
    expect(res.status).toBe(200);
    expect((await readJson(res)).user.name).toBe("a".repeat(80));
  });

  it("7.1.5 returns session and user for an authenticated cookie", async () => {
    const signIn = await signInAnonymous("AuthedTester");
    const cookie = signIn.headers.get("set-cookie")!.split(";")[0];

    const res = await app.request("/api/auth/get-session", { headers: { cookie } });

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.session).toBeTruthy();
    expect(body.user.name).toBe("AuthedTester");
  });

  it("7.1.6 rejects an auth-required route without a cookie", async () => {
    const res = await app.request("/api/events", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "OsakaTrip" }),
    });

    await expectError(res, 401, "UNAUTHENTICATED");
  });
});
