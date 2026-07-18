import { getAuthToken } from "./authToken";

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Non connecté");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${path} en erreur (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiDelete = (path: string) => request<{ ok: true }>(path, { method: "DELETE" });
