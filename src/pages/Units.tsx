import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { useDuerpStore } from "../state/store";
import { searchCompanies } from "../utils/api";
import { uid } from "../utils/uid";
import type { Establishment, WorkUnit } from "../types";
import { ESTABLISHMENT_LOGO, prepareLogo } from "../services/brandingService";
import { usePlan } from "../hooks/usePlan";

const PRIMARY_FEATURE_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: "solvents", label: "Solvants / COV", description: "Peintures, dégraissants, produits chimiques volatils" },
  { key: "cold_room", label: "Chambre froide", description: "Travail en froid positif / négatif" },
  { key: "night_work", label: "Travail de nuit", description: "Horaires nocturnes, isolement" },
  { key: "public_facing", label: "Relation public", description: "Accueil, incivilités, tensions" },
  { key: "vibrating_tools", label: "Outils vibrants", description: "Perceuses, meuleuses, marteaux-piqueurs" },
  { key: "machines", label: "Machines", description: "Pièces en mouvement, protections" },
];

const EXTRA_FEATURE_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: "outdoor_uv", label: "Exposition UV", description: "Travail extérieur / soleil" },
  { key: "screen_work", label: "Travail sur écran", description: "Postes informatiques, bureautique" },
  { key: "manual_handling", label: "Manutention manuelle", description: "Port de charges, gestes répétitifs" },
  { key: "noise", label: "Bruit", description: "Ambiances bruyantes" },
  { key: "driving", label: "Conduite / déplacements", description: "Routier, livraison, engins" },
  { key: "heights", label: "Travail en hauteur", description: "Escabeaux, nacelles, toitures" },
  { key: "bio", label: "Exposition biologique", description: "Contact agents infectieux" },
  { key: "cleaning_agents", label: "Produits de nettoyage", description: "Agents chimiques d'entretien" },
  { key: "asbestos", label: "Amiante / CMR", description: "Fibres, CMR, plomb, solvants lourds" },
  { key: "radiation", label: "Rayonnements", description: "Ionisants, laser" },
  { key: "extreme_heat", label: "Chaleur / froid", description: "Fournaise, froid hors chambres froides" },
  { key: "confined_space", label: "Espace confiné", description: "Cuves, regards, galeries" },
  { key: "phyto", label: "Produits phytosanitaires", description: "Traitements, pesticides" },
  { key: "aggression", label: "Agressions / vol", description: "Gestion de caisse, tensions public" },
  { key: "lone_work", label: "Travail isolé", description: "Isolement, secours" },
  { key: "special_machines", label: "Engins spécifiques", description: "Nacelles, chariots, grues" },
];

const ACTIVITY_OPTIONS: { key: string; label: string; features: string[] }[] = [
  { key: "bureau", label: "Bureau / tertiaire", features: ["screen_work"] },
  { key: "magasin", label: "Magasin / vente", features: ["public_facing", "manual_handling", "noise"] },
  { key: "cuisine", label: "Cuisine / restauration", features: ["solvents", "cold_room", "machines", "manual_handling", "noise"] },
  { key: "atelier", label: "Atelier / production", features: ["machines", "vibrating_tools", "noise"] },
  { key: "chantier", label: "Chantier / terrain", features: ["machines", "vibrating_tools", "outdoor_uv", "heights", "manual_handling"] },
  { key: "logistique", label: "Logistique / entrepôt", features: ["manual_handling", "driving", "machines", "noise"] },
  { key: "maintenance", label: "Maintenance / SAV", features: ["machines", "heights", "manual_handling", "solvents"] },
  { key: "nettoyage", label: "Nettoyage / propreté", features: ["cleaning_agents", "manual_handling"] },
  { key: "sante", label: "Santé / médico-social", features: ["bio", "manual_handling", "public_facing"] },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom";

export const Units = () => {
  const {
    establishments,
    workUnits,
    addEstablishment,
    updateEstablishment,
    addWorkUnit,
    removeEstablishment,
    archivedEstablishments,
    restoreEstablishment,
    removeWorkUnit,
    selectedEstablishmentId,
    setSelectedEstablishment,
    setSelectedWorkUnit,
    prefillFromSector,
    loadingHazards,
  } = useDuerpStore();

  const plan = usePlan();
  const reachedUnitLimit = plan.maxWorkUnits !== -1 && workUnits.length >= plan.maxWorkUnits;
  const reachedEstabLimit = plan.maxEstablishments !== -1 && establishments.length >= plan.maxEstablishments;

  const isConsultant = plan.planId === "consultants";
  const knownClients = Array.from(new Set(establishments.map((e) => e.clientName).filter(Boolean) as string[])).sort();
  const [establishmentForm, setEstablishmentForm] = useState({ name: "", sector: "", codeNaf: "", address: "", siret: "", clientName: "" });
  const [unitForm, setUnitForm] = useState({ name: "", description: "", headcount: 0 });
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customExtra, setCustomExtra] = useState<string>("");
  const [activity, setActivity] = useState<string>("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<
    { id: string; name: string; siren?: string; siret?: string; naf?: string; address?: string; city?: string; postalCode?: string }[]
  >([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEstablishmentId && establishments.length) {
      setSelectedEstablishment(establishments[0].id);
      const firstUnit = workUnits.find((u) => u.establishmentId === establishments[0].id);
      if (firstUnit) setSelectedWorkUnit(firstUnit.id);
    }
  }, [selectedEstablishmentId, establishments, workUnits, setSelectedEstablishment, setSelectedWorkUnit]);

  const onCreateEstablishment = () => {
    if (!establishmentForm.name) return;
    if (reachedEstabLimit) return;
    addEstablishment({
      id: uid(),
      name: establishmentForm.name,
      sector: establishmentForm.sector,
      codeNaf: establishmentForm.codeNaf,
      address: establishmentForm.address,
      siret: establishmentForm.siret.replace(/\D/g, "") || undefined,
      clientName: isConsultant ? establishmentForm.clientName.trim() || undefined : undefined,
    });
    // Le client est souvent le même pour plusieurs établissements saisis à la suite.
    setEstablishmentForm((v) => ({ name: "", sector: "", codeNaf: "", address: "", siret: "", clientName: v.clientName }));
  };

  const onCreateUnit = async () => {
    const targetEstablishmentId = selectedEstablishmentId || establishments[0]?.id;
    if (!unitForm.name || !targetEstablishmentId) return;
    if (reachedUnitLimit) return;
    const newId = uid();
    const payload: WorkUnit = {
      id: newId,
      establishmentId: targetEstablishmentId,
      name: unitForm.name,
      description: unitForm.description,
      headcount: unitForm.headcount,
      features: selectedFeatures,
      activity,
    };
    addWorkUnit(payload);
    setSelectedEstablishment(targetEstablishmentId);
    setSelectedWorkUnit(newId);
    setUnitForm({ name: "", description: "", headcount: 0 });
    setSelectedFeatures([]);
    setActivity("");
    setCustomExtra("");
    // Pré-remplissage automatique : combine NAF de l'établissement + activité de l'unité
    await prefillFromSector(activity || undefined);
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
      siret: hit.siret || prev.siret,
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

  const featureBadges = useMemo(() => {
    const labels: Record<string, string> = {};
    [...PRIMARY_FEATURE_OPTIONS, ...EXTRA_FEATURE_OPTIONS].forEach((opt) => (labels[opt.key] = opt.label));
    return labels;
  }, []);

  const currentActivityFeatures = useMemo(
    () => ACTIVITY_OPTIONS.find((opt) => opt.key === activity)?.features ?? [],
    [activity]
  );

  const visibleOptions = useMemo(() => {
    const optionByKey = new Map([...PRIMARY_FEATURE_OPTIONS, ...EXTRA_FEATURE_OPTIONS].map((o) => [o.key, o]));
    const baseKeys = [...(currentActivityFeatures.length ? currentActivityFeatures : [])];
    PRIMARY_FEATURE_OPTIONS.forEach((f) => {
      if (baseKeys.length < 6 && !baseKeys.includes(f.key)) baseKeys.push(f.key);
    });
    const extras = selectedFeatures.filter((k) => !baseKeys.includes(k));
    const keys = Array.from(new Set([...baseKeys, ...extras]));
    if (keys.length < 6) {
      EXTRA_FEATURE_OPTIONS.forEach((opt) => {
        if (keys.length < 6 && !keys.includes(opt.key)) keys.push(opt.key);
      });
    }
    return keys.map((k) => optionByKey.get(k) || { key: k, label: k, description: "" });
  }, [currentActivityFeatures, selectedFeatures]);

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const onSelectActivity = (value: string) => {
    setActivity(value);
    const match = ACTIVITY_OPTIONS.find((opt) => opt.key === value);
    if (match) {
      setSelectedFeatures(Array.from(new Set([...match.features])));
    }
  };

  const onAddExtraFeature = (value: string) => {
    if (!value) return;
    const opt = EXTRA_FEATURE_OPTIONS.find((o) => o.key === value);
    if (opt) {
      setSelectedFeatures((prev) => (prev.includes(opt.key) ? prev : [...prev, opt.key]));
    } else {
      const key = slugify(value);
      setSelectedFeatures((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }
    setCustomExtra("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title="Établissements" subtitle="Raison sociale, NAF/secteur, coordonnées">
        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          Astuce : cherchez l'entreprise (SIREN/SIRET ou nom) pour pré-remplir les champs. Vous pouvez ensuite modifier le secteur/NAF avant d'enregistrer.
        </div>
        <div className="mb-4 rounded-2xl border border-slate/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate">Recherche d'entreprise (SIREN/SIRET ou nom)</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              className="flex-1 rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Ex: 552100554 ou 'Societe Exemple'"
              title="Tapez un SIREN/SIRET ou un nom (3 caractères minimum)"
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
            />
            <button
              className="rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              onClick={onSearchCompanies}
              disabled={companyLoading || companyQuery.length < 3}
              title="Recherche une entreprise pour pré-remplir nom/adresse/NAF"
            >
              {companyLoading ? "Recherche..." : "Rechercher"}
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
                    {hit.siren ? `SIREN ${hit.siren}` : ""} {hit.siret ? `- SIRET ${hit.siret}` : ""}
                  </p>
                  <p className="text-xs text-slate/60">{hit.naf ? `NAF ${hit.naf}` : ""}</p>
                  <p className="text-xs text-slate/60">{[hit.address, hit.postalCode, hit.city].filter(Boolean).join(" ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          {establishments.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate/10 bg-white p-4 shadow-sm">
              {/* Alerte NAF manquant */}
              {!e.codeNaf && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                  <span>⚠</span>
                  <span>Code NAF manquant — renseignez-le pour améliorer la pertinence de l'analyse des risques.</span>
                </div>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <EstablishmentLogo
                  logo={e.logo}
                  onChange={(logo) => updateEstablishment(e.id, { logo })}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-semibold text-slate">{e.name}</p>
                  {isConsultant && e.clientName && <p className="text-xs font-medium text-kairos">Client : {e.clientName}</p>}
                  <p className="text-sm text-slate/60">{e.address || "Adresse à compléter"}</p>
                  <p className="text-xs text-slate/60">{e.codeNaf ? `NAF ${e.codeNaf}` : <span className="text-amber-600 font-medium">NAF à renseigner</span>}</p>
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end sm:text-right">
                  <span className="pill bg-ocean/10 text-ocean-700">{e.sector || "Secteur"}</span>
                  <button
                    className="text-xs text-sunset hover:underline"
                    title="L'établissement sort de vos listes ; son DUERP et ses versions restent conservés"
                    onClick={(e2) => {
                      e2.stopPropagation();
                      if (window.confirm(`Archiver l'établissement « ${e.name} » ?

Il disparaîtra de vos listes, mais son DUERP et toutes ses versions restent conservés (obligation légale de 40 ans) et consultables dans « Versions ». Vous pourrez le restaurer. Il continue de compter dans votre quota pendant 12 mois.`)) removeEstablishmentAndReset(e.id);
                    }}
                  >
                    Archiver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {archivedEstablishments.length > 0 && (
          <details className="mt-4 rounded-xl border border-slate/10 bg-white p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate">
              Établissements archivés ({archivedEstablishments.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {archivedEstablishments.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate/5 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium text-slate">{e.name}</span>
                    {e.archivedAt && <span className="ml-2 text-xs text-slate/50">archivé le {new Date(e.archivedAt).toLocaleDateString("fr-FR")}</span>}
                  </span>
                  <button className="text-xs font-semibold text-kairos hover:underline" onClick={() => restoreEstablishment(e.id)}>
                    Restaurer
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate/50">Leurs versions restent consultables et réimprimables dans « Versions ».</p>
          </details>
        )}

        <div className="mt-6 rounded-2xl bg-slate/5 p-4">
          <p className="mb-2 font-semibold text-slate">Nouvel établissement</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
              id="establishment-siret"
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="SIRET (14 chiffres)"
              title="Rempli automatiquement par la recherche d'entreprise"
              inputMode="numeric"
              value={establishmentForm.siret}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, siret: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate/20 px-3 py-2"
              placeholder="Adresse"
              title="Adresse complete"
              value={establishmentForm.address}
              onChange={(e) => setEstablishmentForm((v) => ({ ...v, address: e.target.value }))}
            />
            {isConsultant && (
              <>
                <input
                  id="establishment-client"
                  list="known-clients"
                  className="md:col-span-2 rounded-lg border border-slate/20 px-3 py-2"
                  placeholder="Client (ex. Boulangerie Martin) — laissez vide si l'établissement est son propre client"
                  title="Entreprise cliente à laquelle appartient cet établissement"
                  value={establishmentForm.clientName}
                  onChange={(e) => setEstablishmentForm((v) => ({ ...v, clientName: e.target.value }))}
                />
                <datalist id="known-clients">
                  {knownClients.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </div>
          {reachedEstabLimit && (
            <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Limite de {plan.maxEstablishments} établissement{plan.maxEstablishments > 1 ? "s" : ""} atteinte (offre {plan.label}).{" "}
              <a href="/pricing" className="font-semibold underline">Passer à l'offre supérieure →</a>
            </p>
          )}
          <button
            onClick={onCreateEstablishment}
            disabled={reachedEstabLimit}
            className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            title="Ajouter l'établissement"
          >
            Ajouter
          </button>
        </div>
      </Card>

      <Card title="Unités de travail" subtitle="Répartir par atelier, équipe ou poste pour suivre les risques">
        <div className="mb-3 rounded-xl bg-slate/5 px-3 py-2 text-xs text-slate/70">
          Astuce : créez plusieurs unités (bureaux, atelier, chantier, etc.). Chaque unité aura son propre inventaire de risques.
        </div>
        <div className="space-y-3">
          {workUnits
            .filter((w) => w.establishmentId === (selectedEstablishmentId || establishments[0]?.id))
            .map((w) => (
              <div key={w.id} className="rounded-xl border border-slate/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate">{w.name}</p>
                    <p className="text-xs text-slate/60">
                      {w.activity ? `Activité : ${w.activity}` : "Activité non renseignée"} •{" "}
                      {w.description || "Description à compléter (activités, métiers)"}
                    </p>
                    {w.features && w.features.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {w.features.map((f) => (
                          <span key={f} className="rounded-full bg-slate/10 px-2 py-0.5 text-[11px] text-slate-700">
                            {featureBadges[f] || f}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill bg-slate/10 text-slate-700">{w.headcount ?? 0} pers.</span>
                    <button
                      className="text-xs text-sunset hover:underline"
                      onClick={(e) => { e.stopPropagation(); if (window.confirm(`Supprimer l'unité "${w.name}" et tous ses risques associés ?`)) removeWorkUnitAndReset(w.id); }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="mt-6 rounded-2xl bg-slate/5 p-4">
          <p className="mb-2 font-semibold text-slate">Nouvelle unité</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Activité / gabarit</p>
            <select
              className="w-full rounded-lg border border-slate/20 px-3 py-2"
              value={activity}
              onChange={(e) => onSelectActivity(e.target.value)}
            >
              <option value="">Choisir une activité</option>
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Facteurs / activité</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {visibleOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate/20 bg-white px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-blue-600"
                    checked={selectedFeatures.includes(opt.key)}
                    onChange={() => toggleFeature(opt.key)}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-xs text-slate-600">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate/20 px-3 py-2 text-sm"
                value={customExtra}
                onChange={(e) => onAddExtraFeature(e.target.value)}
              >
                <option value="">Ajouter un facteur supplémentaire</option>
                {EXTRA_FEATURE_OPTIONS.filter((opt) => !selectedFeatures.includes(opt.key)).map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {reachedUnitLimit && (
            <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Limite de {plan.maxWorkUnits} unités atteinte (offre {plan.label}).{" "}
              <a href="/pricing" className="font-semibold underline">Passer à l'offre supérieure →</a>
            </p>
          )}
          <button
            onClick={onCreateUnit}
            disabled={loadingHazards || reachedUnitLimit}
            className="mt-3 rounded-xl bg-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            title="Ajouter l'unité et pré-remplir l'inventaire de risques"
          >
            {loadingHazards ? "Analyse en cours..." : "Ajouter l'unité"}
          </button>
        </div>
      </Card>
    </div>
  );
};

// Logo de l’entreprise évaluée, repris en couverture de son PDF.
const EstablishmentLogo = ({ logo, onChange }: { logo: Establishment["logo"]; onChange: (logo: Establishment["logo"]) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onChange(await prepareLogo(file, ESTABLISHMENT_LOGO));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo illisible.");
    }
  };
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
      <label
        className="flex h-14 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate/30 bg-white hover:border-kairos"
        title="Logo de l’entreprise, affiché en couverture du PDF (PNG, JPEG, SVG ou WebP)"
      >
        {logo?.dataUrl ? (
          <img src={logo.dataUrl} alt="Logo de l’entreprise" className="max-h-12 max-w-[4.5rem] object-contain" />
        ) : (
          <span className="px-1 text-[10px] leading-tight text-slate/50">Ajouter un logo</span>
        )}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onFile} />
      </label>
      {logo && (
        <button type="button" className="text-[10px] text-red-500 hover:underline" onClick={() => onChange(null)}>
          Retirer
        </button>
      )}
      {error && <span className="text-[10px] leading-tight text-rose-600">{error}</span>}
    </div>
  );
};
