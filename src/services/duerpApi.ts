const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";
const API_TOKEN = import.meta.env.VITE_DUERP_API_TOKEN;
const TENANT_ID = import.meta.env.VITE_DUERP_TENANT_ID;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...(TENANT_ID ? { "X-Tenant-Id": TENANT_ID } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(text || `API ${path} failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return (await res.json()) as T;
}

export const duerpApi = {
  evaluateV4: (payload: Record<string, any>) =>
    http<any>("/api/evaluate", { method: "POST", body: JSON.stringify(payload) }),
};

export default duerpApi;
