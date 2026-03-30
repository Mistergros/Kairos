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
function Badge({
  tone,
  children,
}: {
  tone: "primary" | "secondary";
  children: string;
}) {
  return (
    <span
      className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
        tone === "primary"
          ? "bg-blue-600 text-white"
          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white"
      }`}
    >
      {children}
    </span>
  );
}

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
    <header className="sticky top-0 z-20 w-full border-b border-white/40 bg-white/70 backdrop-blur dark:bg-slate-900/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-white">Kaijos</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700 dark:text-slate-300">
          <a href="#features" className="hover:text-blue-600">Fonctionnalités</a>
          <a href="#use-cases" className="hover:text-blue-600">Cas pratiques</a>
          <a href="#how" className="hover:text-blue-600">Étapes</a>
          <a href="#pricing" className="hover:text-blue-600">Tarifs</a>
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <a
              href="/mon-compte"
              className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Mon compte
            </a>
          ) : (
            <a
              href="/sign-in"
              className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Se connecter
            </a>
          )}
          <button
            type="button"
            onClick={() => onSubscribe("essential")}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Redirection..." : "S'abonner"}
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
    <section className="w-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-0 flex flex-col items-center text-center">

        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300 mb-6">
          Kaijos · by Milante Consulting
        </span>

        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Votre DUERP conforme,{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            sans Excel, sans galère.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl">
          Kaijos pré-remplit votre inventaire des risques selon votre code NAF, génère le PDF légal et suit votre plan d’action — en quelques minutes, pas en quelques jours.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => onSubscribe("essential")}
            disabled={isLoading}
            className="rounded-xl bg-blue-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-400 disabled:opacity-60 transition"
          >
            {isLoading ? "Redirection…" : "Commencer gratuitement →"}
          </button>
          <a href="#pricing" className="rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold hover:bg-white/10 transition">
            Voir les offres
          </a>
        </div>

        <p className="mt-5 text-sm text-slate-400">
          ✓ Conforme art. R.4121-1 du Code du travail &nbsp;·&nbsp; ✓ Export PDF légal inclus &nbsp;·&nbsp; ✓ Sans installation
        </p>

        {/* Aperçu interface */}
        <div className="mt-16 w-full max-w-5xl rounded-t-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {/* Barre de fenêtre */}
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 flex-1 rounded bg-slate-700 px-3 py-1 text-xs text-slate-400">app.kaijos.com</span>
          </div>
          {/* Simulation inventaire */}
          <div className="bg-slate-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Bureau — Administration</span>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">Atelier — Production</span>
              </div>
              <span className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white">Pré-remplir risques (NAF)</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-500">
                  <tr>
                    {["Catégorie", "Risque", "G", "F", "M", "Score", "Priorité"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    { cat: "RPS", risk: "Conflits / tensions", g: 8, f: 6, m: 2, score: 24, p: "P1", color: "bg-red-500" },
                    { cat: "TMS", risk: "Postures contraignantes", g: 6, f: 9, m: 3, score: 18, p: "P1", color: "bg-red-500" },
                    { cat: "Électrique", risk: "Contact indirect", g: 8, f: 2, m: 4, score: 4, p: "P3", color: "bg-yellow-400" },
                    { cat: "Incendie", risk: "Départ de feu", g: 10, f: 2, m: 3, score: 6, p: "P2", color: "bg-orange-400" },
                  ].map((r) => (
                    <tr key={r.risk} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{r.cat}</td>
                      <td className="px-3 py-2 font-medium">{r.risk}</td>
                      <td className="px-3 py-2">{r.g}</td>
                      <td className="px-3 py-2">{r.f}</td>
                      <td className="px-3 py-2">{r.m}</td>
                      <td className="px-3 py-2 font-bold">{r.score}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex h-6 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${r.color}`}>{r.p}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-3">
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Actions en cours</p>
                <p className="text-2xl font-bold text-slate-800">7</p>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Risques P1</p>
                <p className="text-2xl font-bold text-red-600">2</p>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Complétude</p>
                <p className="text-2xl font-bold text-green-600">84%</p>
              </div>
              <div className="flex-1 rounded-lg border border-green-100 bg-green-50 p-3 flex items-center justify-center">
                <span className="text-xs font-bold text-green-700">↓ Export PDF</span>
              </div>
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
  return (
    <div className="w-full bg-slate-900 border-y border-slate-800 py-5">
      <div className="mx-auto max-w-5xl px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
        <span>🏗️ BTP &amp; construction</span>
        <span className="hidden md:block text-slate-700">|</span>
        <span>🏭 Industrie &amp; ateliers</span>
        <span className="hidden md:block text-slate-700">|</span>
        <span>🏢 Services &amp; bureaux</span>
        <span className="hidden md:block text-slate-700">|</span>
        <span>🏥 Santé &amp; médico-social</span>
        <span className="hidden md:block text-slate-700">|</span>
        <span>🚚 Transport &amp; logistique</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   FEATURE CARDS (LARGES + AÉRÉES)
------------------------------------------------------------ */
function FeatureCard({
  title,
  bullets,
  Icon,
  accent,
}: {
  title: string;
  bullets: string[];
  Icon: any;
  accent: string;
}) {
  return (
    <div
      className="group relative rounded-[28px] p-10 shadow-xl ring-1
      bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-700
      hover:-translate-y-1 hover:shadow-2xl transition"
    >
      <div className={`absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl opacity-30 ${accent}`} />
      
      <div className="flex items-start gap-6">
        <div className={`rounded-2xl p-4 text-white shadow-md ${accent}`}>
          <Icon className="h-8 w-8" />
        </div>

        <div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h3>

          <ul className="mt-4 space-y-2 text-lg text-slate-700 dark:text-slate-300">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ValueProps() {
  return (
    <section id="features" className="w-full px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold dark:text-white">L’essentiel, sans complexité</h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Trois blocs couvrent tout votre cycle DUERP.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          <FeatureCard
            title="Analyser"
            bullets={[
              "Pré-remplissage des risques par code NAF",
              "Détection des oublis par secteur d’activité",
            ]}
            Icon={IconAnalyze}
            accent="bg-blue-600"
          />
          <FeatureCard
            title="Agir"
            bullets={[
              "Suggestions d’actions prioritaires",
              "Plan d’action + rappels automatiques",
            ]}
            Icon={IconAct}
            accent="bg-violet-600"
          />
          <FeatureCard
            title="Suivre"
            bullets={[
              "Tableau de bord clair",
              "Export PDF conforme en 1 clic",
            ]}
            Icon={IconTrack}
            accent="bg-emerald-600"
          />
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
function IconBadge(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9 6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBriefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="7" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
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

const Dot = () => (
  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
);

/* Tuile générique avec en-tête icône + titre + accent doux */
function Tile({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </span>
        <h4 className="text-[15px] font-semibold tracking-wide text-slate-900 dark:text-white">{title}</h4>
      </div>
      <div className="mt-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

/* Carte KPI plus “premium” */
function KpiCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-800 px-4 py-5 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        <IconBadge className="h-4 w-4" />
      </div>
      <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-[12px] leading-5 text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
}

/* Bandeau titre + badge secteur harmonisé */
function SectorRibbon({ label, accent, headline }: { label: string; accent: string; headline: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold text-white ${accent}`}
      >
        {label}
      </span>
      <span className="text-sm text-slate-600 dark:text-slate-300">{headline}</span>
    </div>
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

  return (
    <section id="use-cases" className="w-full px-6 md:px-10 xl:px-16 py-24 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* Titre section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">Cas pratiques par secteur</h2>
          <p className="mt-2 text-base md:text-lg text-slate-600 dark:text-slate-300">
            Exemples anonymisés + aperçu DUERP, présentés de façon claire et rapide.
          </p>
        </div>

        {/* Onglets secteurs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8">
          {SOURCE.map((c) => {
            const selected = c.id === tab;
            return (
              <button
                key={c.id}
                onClick={() => setTab(c.id)}
                className={`px-4 md:px-5 py-2 rounded-full text-[13px] md:text-[15px] font-semibold ring-1 transition
                  ${selected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-slate-900/10 dark:ring-white/10"
                    : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200 ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Bandeau secteur */}
        <SectorRibbon label={current.label} accent={current.accent} headline={current.headline} />

        {/* KPIs */}
        <div className="mx-auto max-w-4xl mt-6">
          <div className="grid grid-cols-3 gap-4">
            {current.kpis.map((k) => (
              <KpiCard key={k.label} value={k.value} label={k.label} />
            ))}
          </div>
          <p className="mt-4 text-center text-[13px] text-slate-600 dark:text-slate-400">{current.sub}</p>
        </div>

        {/* 4 tuiles : Contexte / Avant→Après / DUERP / Points clés */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Contexte */}
          <Tile title="Contexte" icon={<IconBriefcase className="h-4 w-4" />}>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              {current.case.org} • {current.case.size}
            </div>
            <p className="mt-2">{current.case.context}</p>
          </Tile>

          {/* Avant → Après */}
          <Tile title="Avant → Après" icon={<IconSwitch className="h-4 w-4" />}>
            <ul className="space-y-2">
              {current.case.beforeAfter.slice(0, 3).map((x, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Dot />
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">Avant :</span> {x.before}
                    <span className="text-slate-500 dark:text-slate-400"> → Après :</span> {x.after}
                  </span>
                </li>
              ))}
            </ul>
          </Tile>

          {/* DUERP (aperçu) */}
          <Tile title="DUERP (aperçu)" icon={<IconDoc className="h-4 w-4" />}>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{current.duerp.title}</div>
            <ul className="mt-2 space-y-1">
              {current.duerp.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Dot />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <a
              href={current.duerp.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
            >
              Télécharger un exemple →
            </a>
          </Tile>

          {/* Points clés */}
          <Tile title="Points clés" icon={<IconStarList className="h-4 w-4" />}>
            <ul className="space-y-1">
              {current.bullets.slice(0, 4).map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Dot />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Tile>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
   STEPS — PROCESS
------------------------------------------------------------ */
function StepCard({
  index,
  title,
  desc,
}: {
  index: number;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-[24px] p-10 shadow-xl ring-1
      bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-700
      hover:-translate-y-1 hover:shadow-2xl transition"
    >
      <div className="mb-5 h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
        {index}
      </div>

      <h3 className="text-2xl font-semibold dark:text-white">{title}</h3>
      <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">{desc}</p>
    </div>
  );
}

function Steps() {
  return (
    <section id="how" className="w-full px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold dark:text-white">Comment ça marche</h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Trois étapes simples, de la création à l’export.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          <StepCard index={1} title="Décrire" desc="Établissements, unités, NAF en 30 secondes" />
          <StepCard index={2} title="Valider" desc="Affinez les cotations avec le questionnaire guidé" />
          <StepCard index={3} title="Piloter" desc="Assignez, suivez, exportez" />
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

function PricingCard({
  plan,
  onSubscribe,
  isLoading,
}: {
  plan: typeof pricing[number];
  onSubscribe: SubscribeHandler;
  isLoading: boolean;
}) {
  const recommended = plan.badgeTone === "primary";

  return (
    <article
      className={`relative w-full rounded-3xl border shadow-xl p-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 ${
        recommended ? "ring-2 ring-blue-600" : ""
      }`}
    >
      <Badge tone={plan.badgeTone}>{plan.badge}</Badge>

      <h3 className="text-2xl font-bold dark:text-white">{plan.name}</h3>
      <p className="text-slate-500 dark:text-slate-300">{plan.tagline}</p>

      <div className="text-4xl font-bold mt-6 dark:text-white">
        {plan.price} <span className="text-lg text-slate-500">/ mois</span>
      </div>

      <ul className="mt-6 space-y-2 text-lg text-slate-700 dark:text-slate-300">
        {plan.bullets.map((b) => (
          <li key={b} className="flex gap-3">
            <span className="mt-2 h-2.5 w-2.5 bg-green-500 rounded-full" />
            {b}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSubscribe(plan.id as PlanId)}
        disabled={isLoading}
        className={`mt-10 block w-full rounded-xl py-3 text-center font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
          recommended
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white"
        }`}
      >
        {isLoading ? "Redirection..." : `Choisir ${plan.name.split(" ")[0]}`}
      </button>
    </article>
  );
}

function PricingSection({
  onSubscribe,
  isLoading,
}: {
  onSubscribe: SubscribeHandler;
  isLoading: boolean;
}) {
  return (
    <section id="pricing" className="w-full px-6 py-24 bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold dark:text-white">Tarifs</h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Résiliation mensuelle. Sans engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {pricing.map((p) => (
            <PricingCard key={p.id} plan={p} onSubscribe={onSubscribe} isLoading={isLoading} />
          ))}
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
    const status = String((user?.publicMetadata as any)?.subscriptionStatus || "");
    const isActive = status === "active" || status === "trialing";
    if (isSignedIn && isActive) {
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
      setCheckoutError("Impossible de demarrer le paiement. Reessayez.");
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
