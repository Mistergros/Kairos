const COMPANY_API =
  import.meta.env.VITE_COMPANY_API ||
  "/api/companies";

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
