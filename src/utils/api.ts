import { Hazard } from "../types";

// Base API : l'hôte du serveur, sans suffixe — chaque appel ajoute son propre
// préfixe /api/... (comme dans src/services/duerpApi.ts, même convention).
const API_BASE =
  import.meta.env.VITE_DUERP_API_BASE ||
  (typeof window !== "undefined" ? window.location.origin : "");

const COMPANY_API =
  import.meta.env.VITE_COMPANY_API ||
  "/api/companies";

const fetchJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} en erreur (${res.status})`);
  return (await res.json()) as T;
};

// Catalogue des risques (depuis Supabase via l'API Next).
// Ne pas avaler l'erreur ici : l'appelant (prefillService) doit savoir si le
// catalogue distant a réellement échoué pour pouvoir prévenir l'utilisateur
// plutôt que de basculer sur un repli générique sans le signaler.
export const fetchHazardsFromSources = async (sector?: string, naf?: string): Promise<Hazard[]> => {
  const catalog = await fetchJson<{ id: string; family: string; name: string; description?: string }[]>(
    "/api/catalog/risks"
  );
  return catalog.map((r) => ({
    id: r.id,
    category: r.family || "Risque",
    risk: r.name,
    damages: r.description || "",
    source: "Supabase",
    sector: naf || sector || "",
  }));
};

export type CompanySearchHit = {
  id: string;
  name: string;
  siren?: string;
  siret?: string;
  naf?: string;
  address?: string;
  city?: string;
  postalCode?: string;
};

export const searchCompanies = async (query: string): Promise<CompanySearchHit[]> => {
  if (!query || query.length < 3) return [];
  try {
    const url = `${COMPANY_API}/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Recherche entreprise KO (${res.status})`);
    return (await res.json()) as CompanySearchHit[];
  } catch (err) {
    console.warn("Recherche entreprise en erreur, utilisation du mock local.", err);
    return [
      {
        id: "mock-1",
        name: `Demo ${query.toUpperCase()}`,
        siren: "123456789",
        siret: "12345678900011",
        naf: "62.01Z",
        address: "1 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
      },
    ];
  }
};
