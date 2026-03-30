// apps/web/app/(marketing)/landing/page.tsx
// ------------------------------------------------------------
// Landing page complète — moderne, large, aérée, dark-friendly
// ------------------------------------------------------------

"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

/* ------------------------------------------------------------
   ICONES PERSONNALISÉES
------------------------------------------------------------ */
function IconAnalyze(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconAct(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 7h10M4 12h10M4 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrack(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15v-4M12 15V9M17 15v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

type PlanId = "essential" | "consultants";
type SubscribeHandler = (planId?: PlanId) => void;

/* ------------------------------------------------------------
   BADGE DES TARIFS
------------------------------------------------------------ */

/* ------------------------------------------------------------
   NAVBAR MARKETING
------------------------------------------------------------ */
function Navbar({
  onSubscribe,
  isLoading,
  isSignedIn,
}: {
  onSubscribe: SubscribeHandler;
  isLoading: boolean;
  isSignedIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-kairos flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">K</span>
          </div>
          <span className="font-bold text-ink text-lg tracking-tight">Kaijos</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-ink transition">Fonctionnalités</a>
          <a href="#use-cases" className="hover:text-ink transition">Cas pratiques</a>
          <a href="#how" className="hover:text-ink transition">Étapes</a>
          <a href="#pricing" className="hover:text-ink transition">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <a href="/mon-compte" className="text-sm font-medium text-slate-600 hover:text-ink transition">Mon compte</a>
          ) : (
            <a href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-ink transition">Se connecter</a>
          )}
          <button
            type="button"
            onClick={() => onSubscribe("essential")}
            disabled={isLoading}
            className="rounded-lg bg-kairos px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {isLoading ? "…" : "Démarrer"}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------
   HERO SECTION
------------------------------------------------------------ */
function Hero({ onSubscribe, isLoading }: { onSubscribe: SubscribeHandler; isLoading: boolean }) {
  return (
    <section className="w-full bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-12 items-center">

        {/* Texte gauche */}
        <div>
          <span className="inline-block rounded-full border border-kairos text-kairos text-xs font-semibold px-4 py-1.5 mb-6 tracking-wide">
            BY MILANTE CONSULTING
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Le DUERP de votre entreprise,{" "}
            <span className="text-kairos">conforme et à jour.</span>
          </h1>

          <p className="mt-6 text-lg text-gray-300 leading-relaxed">
            Kaijos structure votre évaluation des risques professionnels, pré-remplit l’inventaire selon votre secteur NAF et génère le document légal prêt à signer.
          </p>

          <div className="mt-4 space-y-2">
            {[
              "Conforme art. R.4121-1 du Code du travail",
              "Pré-remplissage automatique par code NAF",
              "Plan d’action avec responsables et échéances",
              "Export PDF légal en un clic",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-white">
                <span className="h-4 w-4 rounded-full bg-lime flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span>
                {t}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => onSubscribe("essential")}
              disabled={isLoading}
              className="rounded-xl bg-kairos px-8 py-3.5 text-base font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {isLoading ? "Redirection…" : "Démarrer maintenant"}
            </button>
            <a href="#pricing" className="rounded-xl border border-gray-500 px-8 py-3.5 text-base font-semibold text-white hover:border-white transition">
              Voir les offres
            </a>
          </div>
        </div>

        {/* Visuel droite — aperçu app */}
        <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
          {/* Barre titre */}
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-3 text-xs text-slate-400 font-mono">Inventaire des risques — Bureau Administration</span>
          </div>
          {/* Contenu */}
          <div className="bg-slate-50 p-5">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Risques P1", value: "3", cls: "text-red-600" },
                { label: "Actions en cours", value: "7", cls: "text-kairos" },
                { label: "Complétude", value: "84%", cls: "text-green-600" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                  <p className={`text-2xl font-extrabold ${k.cls}`}>{k.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            {/* Tableau */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="grid grid-cols-7 bg-slate-100 text-[10px] font-semibold text-slate-500 px-3 py-2">
                {["Catégorie", "Risque", "G", "F", "M", "Score", "Prio."].map((h) => <span key={h}>{h}</span>)}
              </div>
              {[
                { cat: "RPS", risk: "Conflits / tensions", g: 8, f: 6, m: 2, score: 24, p: "P1", bg: "bg-red-500" },
                { cat: "TMS", risk: "Postures contraignantes", g: 6, f: 9, m: 3, score: 18, p: "P1", bg: "bg-red-500" },
                { cat: "Incendie", risk: "Départ de feu", g: 10, f: 2, m: 3, score: 6, p: "P2", bg: "bg-orange-400" },
                { cat: "Électrique", risk: "Contact indirect", g: 8, f: 2, m: 4, score: 4, p: "P3", bg: "bg-yellow-400" },
              ].map((r, i) => (
                <div key={r.risk} className={`grid grid-cols-7 px-3 py-2.5 text-xs items-center ${i % 2 === 1 ? "bg-slate-50" : "bg-white"} border-t border-slate-100`}>
                  <span className="text-slate-400">{r.cat}</span>
                  <span className="font-medium text-ink">{r.risk}</span>
                  <span className="text-slate-500">{r.g}</span>
                  <span className="text-slate-500">{r.f}</span>
                  <span className="text-slate-500">{r.m}</span>
                  <span className="font-bold text-ink">{r.score}</span>
                  <span className={`inline-flex h-5 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white ${r.bg}`}>{r.p}</span>
                </div>
              ))}
            </div>
            {/* CTA export */}
            <div className="mt-3 flex justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white">
                ↓ Exporter le PDF légal
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   SOCIAL PROOF STRIP
------------------------------------------------------------ */
function SocialProof() {
  const sectors = ["BTP & construction", "Industrie & ateliers", "Services & bureaux", "Santé & médico-social", "Transport & logistique"];
  return (
    <div className="w-full bg-slate-800 border-t border-slate-700 py-4">
      <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-center gap-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mr-2">Adapté à</span>
        {sectors.map((s) => (
          <span key={s} className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-300">{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   FEATURE CARDS
------------------------------------------------------------ */
function ValueProps() {
  const features = [
    {
      icon: <IconAnalyze className="h-6 w-6" />,
      color: "bg-[#5b61f6]",
      title: "Pré-remplissage par secteur",
      desc: "Saisissez votre code NAF et Kaijos charge automatiquement les risques typiques de votre activité. Vous validez, vous n’inventez pas.",
    },
    {
      icon: <IconAct className="h-6 w-6" />,
      color: "bg-[#0ea5e9]",
      title: "Plan d’action intégré",
      desc: "Chaque risque génère une action. Assignez un responsable, fixez une échéance, recevez un rappel. Tout dans le même outil.",
    },
    {
      icon: <IconTrack className="h-6 w-6" />,
      color: "bg-emerald-500",
      title: "Export PDF légal en 1 clic",
      desc: "Le document est mis en page selon les exigences de l’art. R.4121-1 du Code du travail. Prêt à signer, prêt à archiver.",
    },
  ];
  return (
    <section id="features" className="w-full bg-[#FAF8F5] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-[#5b61f6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#5b61f6] mb-4">Fonctionnalités</span>
          <h2 className="text-4xl font-extrabold text-[#0f172a]">L’essentiel, sans complexité</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            Tout ce qu’il faut pour être conforme — rien de superflu.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="rounded-[24px] bg-white p-8 shadow-sm hover:shadow-md transition border border-slate-100">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white ${f.color} mb-5`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   CAS PRATIQUES — données
------------------------------------------------------------ */
type UseCase = {
  id: string;
  label: string;
  accent: string;
  headline: string;
  sub: string;
  kpis: { label: string; value: string }[];
  bullets: string[];
  case: {
    org: string;
    size: string;
    context: string;
    beforeAfter: { before: string; after: string }[];
  };
  duerp: {
    title: string;
    highlights: string[];
    toc: string[];
    downloadUrl: string;
  };
  ctaLabel: string;
};

const USE_CASES: UseCase[] = [
  {
    id: "btp",
    label: "BTP",
    accent: "bg-amber-600",
    headline: "Chantiers : plus de prévention, moins de papier.",
    sub: "DUERP par lot et phase, coactivité, EPI et consignations.",
    kpis: [
      { label: "Temps MAJ DUERP", value: "-60%" },
      { label: "Non-conformités", value: "-35%" },
      { label: "Taux d’actions closes", value: "+45%" },
    ],
    bullets: [
      "Bibliothèque risques BTP (travaux en hauteur, levage, tranchées…)",
      "Plan d’action par chantier avec rappels",
      "Export PDF par chantier / entreprise intervenante",
      "Suivi EPI & autorisations (SPS, consignation, permis feu)",
    ],
    case: {
      org: "Entreprise Générale « BâtiOuest » (anonyme)",
      size: "PME — 95 salariés, 8 chantiers actifs",
      context:
        "Plan d’actions éclaté (Excel/email), mises à jour DUERP irrégulières, difficultés à tracer les EPI.",
      beforeAfter: [
        { before: "MAJ DUERP chantier : 2 h / mois", after: "35 min / mois (-70%)" },
        { before: "Oublis d’autorisation feu récurrents", after: "Rappel automatique par email" },
        { before: "Exports hétérogènes", after: "PDF standardisé par chantier (SPS-ready)" },
      ],
    },
    duerp: {
      title: "DUERP — Chantier « Rénovation Lycée M. »",
      highlights: [
        "Risques par phase : démolition, échafaudage, électricité",
        "Traçabilité EPI et consignations",
        "Actions priorisées (gravité × probabilité × maitrise)",
      ],
      toc: [
        "1. Présentation du chantier",
        "2. Unités de travail & coactivité",
        "3. Inventaire des risques (par phase)",
        "4. Évaluation & hiérarchisation",
        "5. Plan d’actions (responsables/échéances)",
        "6. Suivi et preuves",
        "7. Synthèse employeur",
      ],
      downloadUrl: "/samples/duerp-btp-exemple.pdf",
    },
    ctaLabel: "Voir le cas BTP",
  },
  {
    id: "industrie",
    label: "Industrie",
    accent: "bg-indigo-600",
    headline: "Ateliers & lignes : sécurité rythmée par la prod.",
    sub: "Risques machines, chimiques, ATEX et consignations.",
    kpis: [
      { label: "Incidents mineurs", value: "-28%" },
      { label: "MAJ par unité", value: "15 min" },
      { label: "Actions critiques", value: "x2 détectées" },
    ],
    bullets: [
      "Matrices risques machines (ISO 12100) et produits (FDS)",
      "Rôles & responsabilités par poste / équipe",
      "Détection d’incohérences (procédures manquantes)",
      "Exports prêts inspection + CSE",
    ],
    case: {
      org: "Atelier « MétalTech » (anonyme)",
      size: "ETI — 420 salariés, 3 sites",
      context: "Historique AT, dispersion des FDS, DUERP peu lu en comité.",
      beforeAfter: [
        { before: "Consolidation multi-sites manuelle", after: "Tableau de bord global automatique" },
        { before: "FDS peu consultées", after: "Liens FDS contextualisés dans les fiches risques" },
        { before: "Peu d’actions clôturées", after: "+52% d’actions closes / trimestre" },
      ],
    },
    duerp: {
      title: "DUERP — Atelier d’usinage & traitement de surface",
      highlights: [
        "Cartographie risques machines (presses, CN)",
        "Risque chimique lié aux bains (FDS liées)",
        "Planification consignations",
      ],
      toc: [
        "1. Présentation établissement",
        "2. Unités de travail & postes",
        "3. Inventaire risques machines & chimiques",
        "4. Mesures existantes & résidu",
        "5. Programme d’actions (ATEX, consignations)",
        "6. Indicateurs & suivi",
        "7. Compte-rendu CSE",
      ],
      downloadUrl: "/samples/duerp-industrie-exemple.pdf",
    },
    ctaLabel: "Voir le cas Industrie",
  },
  {
    id: "services",
    label: "Services",
    accent: "bg-emerald-600",
    headline: "Bureaux & équipes terrain : simple, partout.",
    sub: "RPS, TMS, déplacements, prestataires.",
    kpis: [
      { label: "Temps d’onboarding", value: "-50%" },
      { label: "Taux complétude DUERP", value: "98%" },
      { label: "Conformité audits", value: "+100%" },
    ],
    bullets: [
      "Trames RPS/TMS prêtes à l’emploi",
      "Gestion multi-sites & multi-équipes",
      "Portail actions avec rappels automatiques",
      "Exports PDF propres pour clients / audits",
    ],
    case: {
      org: "Société « Servia+ » (anonyme)",
      size: "PME — 130 salariés, 4 directions",
      context: "RPS non structurés, mobilité pro mal couverte.",
      beforeAfter: [
        { before: "RPS traités hors DUERP", after: "Intégration grille RPS + plan d’actions dédié" },
        { before: "Déplacements non évalués", after: "Modèle TMS & risque routier activé" },
        { before: "Zéro rappel d’échéance", after: "Rappels automatiques + propriétaires nommés" },
      ],
    },
    duerp: {
      title: "DUERP — Siège & équipes terrain",
      highlights: [
        "RPS modélisés (charge, autonomie, soutien)",
        "Risque routier & travail isolé",
        "Plan d’action lisible par direction",
      ],
      toc: [
        "1. Contexte & organisation",
        "2. Unités & métiers",
        "3. Risques RPS / TMS / déplacements",
        "4. Mesures & lacunes",
        "5. Actions priorisées par direction",
        "6. Indicateurs trimestriels",
        "7. Synthèse",
      ],
      downloadUrl: "/samples/duerp-services-exemple.pdf",
    },
    ctaLabel: "Voir le cas Services",
  },
  // ... (santé, retail, collectivités — garde si tu veux)
];

/* ============================================================
   CAS PRATIQUES — version compacte, harmonisée + icônes
   Remplace ton composant UseCasesCompact par celui-ci
   (Réutilise le type UseCase et la constante USE_CASES existants)
============================================================ */

/* Icônes légères (inline SVG) */
function IconSwitch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M7 7h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8Z" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="9" cy="11" r="3" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}
function IconDoc(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M14 3H7.8A1.8 1.8 0 0 0 6 4.8v14.4A1.8 1.8 0 0 0 7.8 21H16a2 2 0 0 0 2-2V8l-4-5Z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconStarList(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="m12 4 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 8.2l4-.6L12 4Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}


/* ====== Composant principal ====== */
export function UseCasesCompact({ data }: { data?: UseCase[] }) {
  const SOURCE = data && data.length ? data : USE_CASES;
  const [tab, setTab] = React.useState<string>(SOURCE[0]?.id || "btp");

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("tab");
    if (t && SOURCE.some((c) => c.id === t)) setTab(t);
  }, [SOURCE]);

  const current = React.useMemo(() => SOURCE.find((c) => c.id === tab)!, [SOURCE, tab]);

  const accentColors: Record<string, string> = {
    "bg-amber-600": "border-amber-400 text-amber-700 bg-amber-50",
    "bg-indigo-600": "border-indigo-400 text-indigo-700 bg-indigo-50",
    "bg-emerald-600": "border-emerald-400 text-emerald-700 bg-emerald-50",
  };
  const accentBtn = accentColors[current.accent] || "border-kairos text-kairos bg-kairos/5";

  return (
    <section id="use-cases" className="w-full px-6 py-24 bg-white">
      <div className="mx-auto max-w-6xl">

        {/* Titre */}
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-kairos/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-kairos mb-4">Cas pratiques</span>
          <h2 className="text-4xl font-extrabold text-ink">Ils utilisent Kaijos dans leur secteur</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Exemples anonymisés — contexte, résultats et extraits du DUERP produit.</p>
        </div>

        {/* Onglets */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {SOURCE.map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${
                c.id === tab
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Contenu — 2 colonnes */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Colonne gauche : contexte + avant/après */}
          <div className="space-y-6">
            {/* Contexte */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${accentBtn}`}>{current.label}</span>
                <h3 className="font-bold text-ink text-lg">{current.headline}</h3>
              </div>
              <p className="text-xs text-slate-400 mb-1">{current.case.org} — {current.case.size}</p>
              <p className="text-slate-600 leading-relaxed">{current.case.context}</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {current.kpis.map((k) => (
                <div key={k.label} className="rounded-xl bg-ink text-white p-4 text-center">
                  <p className="text-2xl font-extrabold text-kairos">{k.value}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-tight">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Avant → Après */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                <IconSwitch className="h-4 w-4 text-kairos" /> Avant / Après Kaijos
              </h4>
              <div className="space-y-3">
                {current.case.beforeAfter.slice(0, 3).map((x, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-red-400 mb-1">Avant</p>
                      <p className="text-slate-600">{x.before}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-green-500 mb-1">Après</p>
                      <p className="text-slate-700 font-medium">{x.after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colonne droite : ce que Kaijos gère + aperçu DUERP */}
          <div className="space-y-6">
            {/* Points clés */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                <IconStarList className="h-4 w-4 text-kairos" /> Ce que Kaijos gère pour ce secteur
              </h4>
              <ul className="space-y-2.5">
                {current.bullets.slice(0, 4).map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-kairos/10 text-kairos flex items-center justify-center text-[10px] font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Aperçu DUERP */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-ink px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">Document produit</p>
                  <p className="text-white font-bold text-sm">{current.duerp.title}</p>
                </div>
                <IconDoc className="h-6 w-6 text-slate-400" />
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Points couverts</p>
                <ul className="space-y-2 mb-4">
                  {current.duerp.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-kairos shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Table des matières</p>
                <ol className="space-y-1">
                  {current.duerp.toc.slice(0, 5).map((t) => (
                    <li key={t} className="text-xs text-slate-500">{t}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   STEPS — PROCESS
------------------------------------------------------------ */

function Steps() {
  const steps = [
    { n: "01", title: "Décrivez votre entreprise", desc: "Renseignez votre code NAF, vos établissements et vos unités de travail. 2 minutes chrono." },
    { n: "02", title: "Validez l’inventaire des risques", desc: "Kaijos pré-remplit les risques. Répondez à 4 questions par risque pour affiner la cotation." },
    { n: "03", title: "Pilotez et exportez", desc: "Suivez votre plan d’action, assignez des responsables, téléchargez le PDF légal prêt à signer." },
  ];
  return (
    <section id="how" className="w-full bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-[#0ea5e9]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0ea5e9] mb-4">Étapes</span>
          <h2 className="text-4xl font-extrabold text-[#0f172a]">Prêt en moins d’une heure</h2>
          <p className="mt-4 text-lg text-slate-500">Pas de formation, pas d’intégration longue.</p>
        </div>
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-px bg-slate-200 hidden md:block" />
          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((s) => (
              <div key={s.n} className="bg-[#FAF8F5] rounded-[24px] p-8 border border-slate-100">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#5b61f6] text-white font-extrabold text-lg mb-5">{s.n}</div>
                <h3 className="text-xl font-bold text-[#0f172a] mb-3">{s.title}</h3>
                <p className="text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   PRICING
------------------------------------------------------------ */
const pricing = [
  {
    id: "essential",
    name: "Essentiel",
    price: "29 €",
    tagline: "DUERP simple et conforme",
    bullets: ["1 établissement", "2 unités", "50 risques max", "Export PDF"],
    badge: "TPE",
    badgeTone: "secondary" as const,
  },
  {
    id: "consultants",
    name: "Consultants",
    price: "149 €",
    tagline: "Pour cabinets multi-clients",
    bullets: ["Clients illimités", "Exports PDF par client", "Support prioritaire", "Facturation mutualisée"],
    badge: "CABINET",
    badgeTone: "primary" as const,
  },
];

function PricingSection({
  onSubscribe,
  isLoading,
}: {
  onSubscribe: SubscribeHandler;
  isLoading: boolean;
}) {
  return (
    <section id="pricing" className="w-full bg-[#FAF8F5] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-[#5b61f6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#5b61f6] mb-4">Tarifs</span>
          <h2 className="text-4xl font-extrabold text-[#0f172a]">Simple. Transparent. Sans engagement.</h2>
          <p className="mt-4 text-lg text-slate-500">Résiliation à tout moment.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {pricing.map((p) => {
            const recommended = p.badgeTone === "primary";
            return (
              <article
                key={p.id}
                className={`relative rounded-[28px] bg-white p-10 border transition ${
                  recommended
                    ? "border-[#5b61f6] shadow-lg shadow-[#5b61f6]/10"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                {recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#5b61f6] px-4 py-1 text-xs font-bold text-white">
                    {p.badge}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold text-[#0f172a]">{p.name}</h3>
                <p className="text-slate-500 mt-1">{p.tagline}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-[#0f172a]">{p.price}</span>
                  <span className="text-slate-400 mb-2">/ mois</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-slate-600">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onSubscribe(p.id as PlanId)}
                  disabled={isLoading}
                  className={`mt-10 w-full rounded-2xl py-3.5 font-bold text-base transition disabled:opacity-60 ${
                    recommended
                      ? "bg-[#5b61f6] text-white hover:bg-[#4a50e0]"
                      : "border-2 border-[#0f172a] text-[#0f172a] hover:bg-[#0f172a] hover:text-white"
                  }`}
                >
                  {isLoading ? "Redirection…" : `Choisir ${p.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   FOOTER
------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-8">
      <div className="mx-auto max-w-7xl flex justify-between px-6 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex gap-6">
          <a href="/legal" className="hover:underline">Mentions légales</a>
          <a href="/privacy" className="hover:underline">Confidentialité</a>
          <a href="/support" className="hover:underline">Support</a>
        </div>
        <span>© {new Date().getFullYear()} Kaijos — Milante Consulting</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------
   EXPORT PAGE
------------------------------------------------------------ */
export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const subscription = params.get("subscription");
    if (checkout === "success") {
      setNotice("Paiement confirme. Vous pouvez vous connecter.");
    } else if (checkout === "cancel") {
      setNotice("Paiement annule. Vous pouvez reessayer.");
    } else if (subscription === "required") {
      setNotice("Abonnement inactif. Merci de vous abonner pour acceder a l'application.");
    }
  }, []);

  const startCheckout = async (planId?: PlanId) => {
    if (checkoutState === "loading") return;
    // Si pas connecté → inscription d'abord, avec le plan en paramètre
    if (!isSignedIn) {
      navigate(`/sign-up?plan=${planId || "essential"}`);
      return;
    }

    const status = String((user?.publicMetadata as any)?.subscriptionStatus || "");
    const isActive = status === "active" || status === "trialing";
    if (isActive) {
      navigate("/");
      return;
    }

    setCheckoutState("loading");
    setCheckoutError(null);
    try {
      const res = await fetch(`${API_BASE}/api/checkout-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          clerkUserId: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Checkout failed (${res.status})`);
      }
      const data = await res.json();
      if (!data?.url) throw new Error("Checkout session url missing");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutState("error");
      setCheckoutError("Impossible de démarrer le paiement. Réessayez dans quelques secondes.");
    }
  };

  const isLoading = checkoutState === "loading";
  return (
    <main className="bg-white dark:bg-slate-950">
      <Navbar onSubscribe={startCheckout} isLoading={isLoading} isSignedIn={Boolean(isSignedIn)} />
      {notice && (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {notice}
          </div>
        </div>
      )}
      {checkoutError && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {checkoutError}
          </div>
        </div>
      )}
      <Hero onSubscribe={startCheckout} isLoading={isLoading} />
      <SocialProof />
      <ValueProps />
      <UseCasesCompact data={USE_CASES} /> {/* ← Cas pratiques compact */}
      <Steps />
      <PricingSection onSubscribe={startCheckout} isLoading={isLoading} />
      <Footer />
    </main>
  );
}
