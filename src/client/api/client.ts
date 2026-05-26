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
  await api<unknown>("/api/auth/sign-in/anonymous", {
    method: "POST",
    headers: { "x-guest-name": encodeURIComponent(name) },
    body: "{}",
  });
}

export async function getSession() {
  return api<{ user?: { id: string; name: string }; session?: unknown } | null>("/api/auth/get-session");
}
