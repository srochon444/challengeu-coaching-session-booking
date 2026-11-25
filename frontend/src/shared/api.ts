import type { ApiError } from "@ccu/shared";

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (!res.ok) { const err = (await res.json()) as ApiError; throw new Error(err.message ?? "Request failed"); }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
