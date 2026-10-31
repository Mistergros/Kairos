import { apiGet } from "../utils/apiClient";
import { getAuthToken } from "../utils/authToken";

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

// Le moteur de risques s'appelle avec la session du compte connecté. L'ancien
// jeton VITE_DUERP_API_TOKEN était intégré au code du site, donc public.
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export type AdminConfigBundle = {
  risks: any[];
  naf: any[];
  actions: any[];
  obligations: { general: any[]; sector: any[] };
  scoring: any;
  unitsModifiers: Record<string, Record<string, number>>;
  generatedAt: string;
};

export const duerpApi = {
  evaluateV4: (payload: Record<string, any>) =>
    http<any>("/api/evaluate", { method: "POST", body: JSON.stringify(payload) }),
  // Réservé à l'administrateur (VITE_ADMIN_EMAIL), vérifié côté serveur.
  getAdminConfig: () => apiGet<AdminConfigBundle>("/api/admin/config"),
};

export default duerpApi;
