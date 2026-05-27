export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: "INTERNAL", message: res.statusText }));
    throw new ApiError(res.status, body.code, body.message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function signInAsGuest(name: string) {
  // 既存 anonymous session が残ってると better-auth が「再度 sign-in できない」と
  // 200+skip で返し、古い (削除済かもしれない) user の cookie のまま後段の API が 401 になる。
  // 確実に新規 session を取るため事前に sign-out で cookie を破棄する。
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    credentials: "include",
  }).catch(() => {});
  await api<unknown>("/api/auth/sign-in/anonymous", {
    method: "POST",
    headers: { "x-guest-name": encodeURIComponent(name) },
    body: "{}",
  });
}

export async function getSession() {
  return api<{ user?: { id: string; name: string }; session?: unknown } | null>("/api/auth/get-session");
}
