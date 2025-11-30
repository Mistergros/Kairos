import { useState } from "react";
import { Card } from "../components/Card";
import { useDuerpStore } from "../state/store";
import { searchCompanies } from "../utils/api";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

export const Units = () => {
  const {
    establishments,
    workUnits,
    addEstablishment,
    addWorkUnit,
    removeEstablishment,
    removeWorkUnit,
    selectedEstablishmentId,
    setSelectedEstablishment,
    setSelectedWorkUnit,
  } = useDuerpStore();

  const [establishmentForm, setEstablishmentForm] = useState({ name: "", sector: "", codeNaf: "", address: "" });
  const [unitForm, setUnitForm] = useState({ name: "", description: "", headcount: 0 });
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<
    { id: string; name: string; siren?: string; siret?: string; naf?: string; address?: string; city?: string; postalCode?: string }[]
  >([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const onCreateEstablishment = () => {
    if (!establishmentForm.name) return;
    addEstablishment({
      id: uid(),
      name: establishmentForm.name,
      sector: establishmentForm.sector,
      codeNaf: establishmentForm.codeNaf,
      address: establishmentForm.address,
    });
    setEstablishmentForm({ name: "", sector: "", codeNaf: "", address: "" });
  };

  const onCreateUnit = () => {
    const targetEstablishmentId = selectedEstablishmentId || establishments[0]?.id;
    if (!unitForm.name || !targetEstablishmentId) return;
    const newId = uid();
    addWorkUnit({
      id: newId,
      establishmentId: targetEstablishmentId,
      name: unitForm.name,
      description: unitForm.description,
      headcount: unitForm.headcount,
    });
    setSelectedEstablishment(targetEstablishmentId);
    setSelectedWorkUnit(newId);
    setUnitForm({ name: "", description: "", headcount: 0 });
  };

  const onSearchCompanies = async () => {
    if (!companyQuery || companyQuery.length < 3) return;
    setCompanyLoading(true);
    setCompanyError(null);
    try {
      const hits = await searchCompanies(companyQuery);
      setCompanyResults(hits);
    } catch (err) {
      setCompanyError("Recherche indisponible pour l'instant.");
    } finally {
      setCompanyLoading(false);
    }
  };

  const onSelectCompany = (hit: typeof companyResults[number]) => {
    const addressParts = [hit.address, hit.postalCode, hit.city].filter(Boolean);
    setEstablishmentForm((prev) => ({
      ...prev,
      name: hit.name || prev.name,
      codeNaf: hit.naf || prev.codeNaf,
      address: addressParts.join(" ") || prev.address,
    }));
  };

  const removeEstablishmentAndReset = (id: string) => {
    removeEstablishment(id);
    if (selectedEstablishmentId === id) {
      const nextEstab = establishments.find((e) => e.id !== id);
      setSelectedEstablishment(nextEstab?.id || "");
      const nextWorkUnit = workUnits.find((w) => w.establishmentId === nextEstab?.id);
      setSelectedWorkUnit(nextWorkUnit?.id || "");
    }
  };

  const removeWorkUnitAndReset = (id: string) => {
    removeWorkUnit(id);
    if (selectedEstablishmentId) {
      const next = workUnits.find((w) => w.establishmentId === selectedEstablishmentId && w.id !== id);
      setSelectedWorkUnit(next?.id || "");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Établissements" subtitle="Raison sociale, NAF/secteur, coordonnées">
        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          📌 Astuce : cherchez l’entreprise (SIREN/SIRET ou nom) pour préremplir les champs. Vous pouvez ensuite modifier
          le secteur/NAF avant d’enregistrer.
        </div>
        <div className="mb-4 rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate">Recherche d'entreprise (SIREN/SIRET ou nom)</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              className="flex-1 rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Ex: 552100554 ou 'Société Exemple'"
              title="Tapez un SIREN/SIRET ou un nom (mini 3 caractères)"
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
            />
            <button
              className="rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              onClick={onSearchCompanies}
              disabled={companyLoading || companyQuery.length < 3}
              title="Recherche une entreprise pour pré-remplir nom/adresse/NAF"
            >
              {companyLoading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
          {companyError && <p className="mt-1 text-xs text-sunset">{companyError}</p>}
          {companyResults.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-2 overflow-auto">
              {companyResults.map((hit) => (
                <li
                  key={hit.id}
                  className="cursor-pointer rounded-xl border border-slate/10 bg-slate/5 p-2 hover:bg-slate/10"
                  onClick={() => onSelectCompany(hit)}
                  title="Cliquer pour remplir le formulaire établissement"
                >
                  <p className="text-sm font-semibold text-slate">{hit.name}</p>
                  <p className="text-xs text-slate/60">
                    {hit.siren ? `SIREN ${hit.siren}` : ''} {hit.siret ? `- SIRET ${hit.siret}` : ''}
                  </p>
                  <p className="text-xs text-slate/60">{hit.naf ? `NAF ${hit.naf}` : ''}</p>
                  <p className="text-xs text-slate/60">{[hit.address, hit.postalCode, hit.city].filter(Boolean).join(' ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          {establishments.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate/10 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate">{e.name}</p>
                  <p className="text-sm text-slate/60">{e.address || 'Adresse à compléter'}</p>
                  <p className="text-xs text-slate/60">{e.codeNaf ? `NAF ${e.codeNaf}` : 'NAF à renseigner'}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <span className="pill bg-ocean/10 text-ocean-700">{e.sector || 'Secteur'}</span>
                  <button className="text-xs text-sunset hover:underline" onClick={() => removeEstablishmentAndReset(e.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-slate/5 p-4">
          <p className="mb-2 font-semibold text-slate">Nouvel établissement</p>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Nom"
              title="Nom de l'établissement"
              value={establishmentForm.name}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, name: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Secteur"
              title="Secteur d'activité (libellé libre)"
              value={establishmentForm.sector}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, sector: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Code NAF"
              title="Code NAF (ex: 62.01Z)"
              value={establishmentForm.codeNaf}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, codeNaf: e.target.value }))}
            />
            <input
              className="md:col-span-2 rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Adresse"
              title="Adresse complète"
              value={establishmentForm.address}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, address: e.target.value }))}
            />
          </div>
          <button
            onClick={onCreateEstablishment}
            className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
            title="Ajouter l'établissement"
          >
            Ajouter
          </button>
        </div>
      </Card>

      <Card title="Unités de travail" subtitle="Répartir par atelier/équipe/poste pour suivre les risques">
        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          📌 Astuce : créez plusieurs unités (bureaux, atelier, chantier, etc.). Chaque unité aura son inventaire de
          risques dédié.
        </div>
        <div className="space-y-3">
          {workUnits
            .filter((w) => w.establishmentId === selectedEstablishmentId)
            .map((w) => (
              <div key={w.id} className="rounded-xl border border-slate/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate">{w.name}</p>
                    <p className="text-xs text-slate/60">{w.description || 'Description à compléter (activités, métiers)'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill bg-slate/10 text-slate-700">{w.headcount ?? 0} pers.</span>
                    <button className="text-xs text-sunset hover:underline" onClick={() => removeWorkUnitAndReset(w.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="mt-6 rounded-2xl bg-slate/5 p-4">
          <p className="mb-2 font-semibold text-slate">Nouvelle unité</p>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Nom"
              title="Nom de l'unité de travail"
              value={unitForm.name}
              onChange={(e) => setUnitForm((v) => ({ ...v, name: e.target.value }))}
            />
            <input
              type="number"
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Effectif"
              title="Nombre de personnes dans cette unité"
              value={unitForm.headcount}
              onChange={(e) => setUnitForm((v) => ({ ...v, headcount: Number(e.target.value) }))}
            />
            <textarea
              className="md:col-span-2 rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Description (activité, zone, horaires, tâches)"
              title="Décrivez brièvement les activités, horaires, métiers"
              value={unitForm.description}
              onChange={(e) => setUnitForm((v) => ({ ...v, description: e.target.value }))}
            />
          </div>
          <button
            onClick={onCreateUnit}
            className="mt-3 rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg"
            title="Ajouter l'unité à l'établissement sélectionné"
          >
            Ajouter l'unité
          </button>
        </div>
      </Card>
    </div>
  );
};
