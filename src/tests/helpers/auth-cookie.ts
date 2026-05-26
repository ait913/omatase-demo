import { app } from "./app";

/**
 * Hono の app.request() は HTTP ヘッダ値を Latin-1 (ByteString) に制約する。
 * 設計 §7.1.1 で日本語 name を要求しているので、テスト helper は
 * latin-1 互換に符号化し、サーバ側で対称的に decode する前提で送る。
 *
 * 簡易戦略: ASCII のみ (`/^[\x00-\xff]*$/` を満たす) ならそのまま、
 * そうでなければ UTF-8 → percent encoded (encodeURIComponent) で送る。
 * これは「テスト経路の制約」であって、本番 HTTP では Node が UTF-8 を扱える可能性がある点に注意。
 *
 * 実装側が percent-decoded を期待するか、raw bytes を期待するかは設計に明記されていないので、
 * テスト helper はまず生で送り、Hono が弾く場合に限り encode する。
 */
function isLatin1Safe(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0xff) return false;
  return true;
}

export async function loginAsGuest(name: string) {
  const headers: Record<string, string> = {};
  // 日本語等の non-Latin1 は percent-encode で送る (本番でも安全な経路)
  headers["x-guest-name"] = isLatin1Safe(name) ? name : encodeURIComponent(name);
  const res = await app.request("/api/auth/sign-in/anonymous", {
    method: "POST",
    headers,
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Set-Cookie missing");
  return setCookie.split(";")[0];
}
