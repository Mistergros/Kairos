/**
 * Proxy vers la base publique recherche-entreprises (api.gouv.fr) pour SIREN/SIRET/nom.
 * Voir https://recherche-entreprises.api.gouv.fr/
 */
export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!q || q.length < 3) {
    return res.status(200).send(JSON.stringify([], null, 2));
  }

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=5`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API publique ko (${response.status})`);
    }
    const data = await response.json();
    const hits =
      data?.results?.map((item) => ({
        id: item.siret || item.siren || item.nom_raison_sociale,
        name: item.nom_raison_sociale || item.nom_complet || '',
        siren: item.siren || '',
        siret: item.siret || '',
        naf: item.siege?.activite_principale || item.activite_principale || '',
        address: item.siege?.adresse || '',
        city: item.siege?.libelle_commune || '',
        postalCode: item.siege?.code_postal || '',
      })) || [];

    const result = hits.filter((c) => c.name || c.siren || c.siret);
    if (result.length === 0) {
      return res.status(200).send(JSON.stringify([], null, 2));
    }
    return res.status(200).send(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Recherche entreprise publique en erreur', err);
    return res.status(200).send(JSON.stringify([], null, 2));
  }
}
