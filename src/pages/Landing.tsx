// apps/web/app/(marketing)/landing/page.tsx
// ------------------------------------------------------------
// Landing page complète — moderne, large, aérée, dark-friendly
// ------------------------------------------------------------

"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../utils/apiClient";

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

type PlanId = "starter" | "pme" | "consultants";
type Billing = "monthly" | "annual";
type SubscribeHandler = (planId?: PlanId, billing?: Billing) => void;

/* ------------------------------------------------------------
   BADGE DES TARIFS
------------------------------------------------------------ */

/* ------------------------------------------------------------
   NAVBAR MARKETING
------------------------------------------------------------ */
function Navbar({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-kairos flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">K</span>
          </div>
          <span className="font-bold text-ink text-lg tracking-tight">Kaijos<sup className="ml-0.5 text-[0.55em] font-semibold align-super">™</sup></span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-ink transition">Fonctionnalités</a>
          <a href="#use-cases" className="hover:text-ink transition">Par secteur</a>
          <a href="#how" className="hover:text-ink transition">Étapes</a>
          <a href="#pricing" className="hover:text-ink transition">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3 whitespace-nowrap">
          {isSignedIn ? (
            <a href="/mon-compte" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-ink transition">Mon compte</a>
          ) : (
            <a href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-ink transition">Connexion</a>
          )}
          <a
            href={isSignedIn ? "/" : "/sign-up"}
            className="rounded-lg bg-kairos px-3 sm:px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            {isSignedIn ? (
              <>Ouvrir<span className="hidden sm:inline"> l'application</span></>
            ) : (
              <>Essayer<span className="hidden sm:inline"> gratuitement</span></>
            )}
          </a>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------
   HERO SECTION
------------------------------------------------------------ */
function Hero() {
  return (
    <section className="w-full bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-12 items-center">

        {/* Texte gauche */}
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Le DUERP de votre entreprise,{" "}
            <span className="text-kairos">complet et à jour.</span>
          </h1>

          <p className="mt-6 text-lg text-gray-300 leading-relaxed">
            Kaijos™ structure votre évaluation des risques professionnels, pré-remplit l’inventaire selon votre secteur NAF et génère le document légal prêt à signer.
          </p>

          <div className="mt-4 space-y-2">
            {[
              "Structuré selon l’art. R.4121-1 du Code du travail",
              "Pré-remplissage automatique par code NAF",
              "Chaque risque relié à sa source officielle",
              "Plan d’action avec responsables et échéances",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-white">
                <span className="h-4 w-4 rounded-full bg-lime flex items-center justify-center text-white text-[10px] font-bold shrink-0">✓</span>
                {t}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/sign-up"
              className="rounded-xl bg-kairos px-8 py-3.5 text-base font-bold text-white hover:opacity-90 transition"
            >
              Créer mon DUERP gratuitement
            </a>
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
      icon: <IconDoc className="h-6 w-6" />,
      color: "bg-amber-500",
      title: "Des sources vérifiables",
      desc: "Chaque risque proposé renvoie au document officiel qui le justifie (INRS, Code du travail). Vous savez d’où vient chaque ligne.",
    },
    {
      icon: <IconAct className="h-6 w-6" />,
      color: "bg-[#0ea5e9]",
      title: "Plan d’action intégré",
      desc: "Chaque risque génère une action. Assignez un responsable, fixez une échéance, suivez l’avancement sur un planning.",
    },
    {
      icon: <IconTrack className="h-6 w-6" />,
      color: "bg-emerald-500",
      title: "PDF prêt à signer, versions archivées",
      desc: "Le document reprend les éléments attendus par l’art. R.4121-1 du Code du travail. Chaque version est conservée dans l’historique.",
    },
  ];
  return (
    <section id="features" className="w-full bg-[#FAF8F5] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-[#5b61f6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#5b61f6] mb-4">Fonctionnalités</span>
          <h2 className="text-4xl font-extrabold text-[#0f172a]">L’essentiel, sans complexité</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            Tout ce qu’il faut pour tenir votre DUERP à jour, rien de superflu.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
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
   Ne décrire ici que ce que l'application fait réellement : les risques
   cités existent dans config/risks/, la table des matières reprend les
   sections de src/services/printService.ts. Pas de chiffres de résultats
   inventés (temps gagné, % d'incidents) tant qu'on n'a pas de vrais clients.
------------------------------------------------------------ */
type UseCase = {
  id: string;
  label: string;
  accent: string;
  headline: string;
  sub: string;
  risks: string[];
  bullets: string[];
  duerp: {
    title: string;
    toc: string[];
  };
};

// Structure réelle du PDF généré (printService.ts), commune à tous les secteurs.
const DUERP_TOC = [
  "Page de garde : établissement, NAF, effectif",
  "Inventaire des risques par unité de travail (G × F × M, score, priorité)",
  "Mesures existantes et mesures proposées",
  "Plan d'action : responsable, échéance, statut",
  "Bloc signatures employeur",
];

const USE_CASES: UseCase[] = [
  {
    id: "btp",
    label: "BTP",
    accent: "bg-amber-600",
    headline: "Chantiers et ateliers du bâtiment",
    sub: "Les risques typiques du secteur sont proposés dès la saisie du code NAF.",
    risks: [
      "Chute de hauteur",
      "Chute d'objets",
      "Manutention manuelle",
      "Bruit",
      "Vibrations",
      "Silice cristalline",
      "Coactivité et coordination",
      "Risque routier",
    ],
    bullets: [
      "Une unité de travail par équipe, métier ou chantier",
      "Cotation gravité × fréquence × maîtrise, priorités calculées",
      "Plan d'action avec responsable et échéance, vue planning",
      "Export PDF prêt à signer et export Excel",
    ],
    duerp: { title: "DUERP — Entreprise de gros œuvre (exemple)", toc: DUERP_TOC },
  },
  {
    id: "industrie",
    label: "Industrie",
    accent: "bg-indigo-600",
    headline: "Ateliers, lignes de production, entrepôts",
    sub: "Machines, produits chimiques, circulation interne : l'inventaire part des risques du secteur.",
    risks: [
      "Machines et outils",
      "Risque chimique",
      "Agents CMR",
      "Atmosphères explosives (ATEX)",
      "Circulation interne (chariots)",
      "Espaces confinés",
      "Bruit",
      "Manutention manuelle",
    ],
    bullets: [
      "Chaque risque renvoie à sa source officielle (INRS, Code du travail)",
      "Plusieurs établissements dans le même compte (offre PME)",
      "Rapport PDF multi-sites consolidé",
      "Historique des versions du document",
    ],
    duerp: { title: "DUERP — Atelier d'usinage (exemple)", toc: DUERP_TOC },
  },
  {
    id: "services",
    label: "Services",
    accent: "bg-emerald-600",
    headline: "Bureaux, commerces et équipes terrain",
    sub: "Risques psychosociaux, travail sur écran, déplacements : rien n'est oublié.",
    risks: [
      "Risques psychosociaux",
      "Travail sur écran",
      "Troubles musculo-squelettiques",
      "Risque routier",
      "Travail isolé",
      "Agression, incivilités",
      "Incendie",
      "Éclairage",
    ],
    bullets: [
      "Pré-remplissage à partir du SIRET ou du code NAF",
      "Questions simples pour affiner la cotation de chaque risque",
      "Responsables et échéances pour chaque action",
      "Résumé exécutif d'une page pour la direction",
    ],
    duerp: { title: "DUERP — Siège et équipes terrain (exemple)", toc: DUERP_TOC },
  },
];

/* Icônes légères (inline SVG) */
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
          <span className="inline-block rounded-full bg-kairos/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-kairos mb-4">Par secteur</span>
          <h2 className="text-4xl font-extrabold text-ink">Les risques de votre métier, déjà listés</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Quelques-uns des risques proposés automatiquement selon votre activité, et le document que vous obtenez.</p>
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

          {/* Colonne gauche : contexte + risques pré-remplis */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${accentBtn}`}>{current.label}</span>
                <h3 className="font-bold text-ink text-lg">{current.headline}</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">{current.sub}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-ink mb-4">Exemples de risques pré-remplis</h4>
              <div className="flex flex-wrap gap-2">
                {current.risks.map((r) => (
                  <span key={r} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{r}</span>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">Vous ajoutez, retirez ou ajustez chaque risque : l'évaluation reste la vôtre.</p>
            </div>
          </div>

          {/* Colonne droite : ce que Kaijos gère + aperçu DUERP */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                <IconStarList className="h-4 w-4 text-kairos" /> Ce que vous faites dans Kaijos
              </h4>
              <ul className="space-y-2.5">
                {current.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-kairos/10 text-kairos flex items-center justify-center text-[10px] font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-ink px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">Document produit</p>
                  <p className="text-white font-bold text-sm">{current.duerp.title}</p>
                </div>
                <IconDoc className="h-6 w-6 text-slate-400" />
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Contenu du PDF</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {current.duerp.toc.map((t) => (
                    <li key={t} className="text-sm text-slate-600">{t}</li>
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
    { n: "01", title: "Décrivez votre entreprise", desc: "Renseignez votre SIRET ou votre code NAF, vos établissements et vos unités de travail." },
    { n: "02", title: "Validez l’inventaire des risques", desc: "Kaijos pré-remplit les risques. Répondez à quelques questions par risque pour affiner la cotation." },
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
const PRICING_PLANS = [
  // Garder aligné sur src/data/pricing.json et sur les tarifs Stripe.
  {
    id: "starter" as PlanId,
    name: "Essentiel",
    priceMonthly: null,
    priceYearly: 149,
    annualOnly: true,
    tagline: "Un DUERP simple et complet pour les TPE",
    bullets: ["1 établissement", "5 unités de travail", "Inventaire des risques illimité", "Export PDF prêt à signer", "Rappel automatique de révision annuelle"],
    badge: "TPE",
    recommended: false,
  },
  {
    id: "pme" as PlanId,
    name: "PME",
    priceMonthly: null,
    priceYearly: 490,
    annualOnly: true,
    tagline: "Pour les PME et équipes HSE internes",
    bullets: ["Jusqu'à 5 établissements", "20 unités de travail", "Export XLSX par responsable", "Rapport PDF multi-sites", "Historique des versions"],
    badge: "RECOMMANDÉ",
    recommended: true,
  },
  {
    id: "consultants" as PlanId,
    name: "Pro",
    priceMonthly: null,
    priceYearly: 1990,
    annualOnly: true,
    tagline: "Pour consultants, cabinets RH / HSE et experts-comptables",
    bullets: ["Portefeuille de 25 clients", "Établissements & unités illimités", "PDF à la marque de votre cabinet", "Suivi des révisions annuelles par client", "Export XLSX & PDF par client"],
    badge: "CABINETS",
    recommended: false,
  },
];

function PricingSection({
  onSubscribe,
  isLoading,
}: {
  onSubscribe: SubscribeHandler;
  isLoading: boolean;
}) {
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showTermsHint, setShowTermsHint] = React.useState(false);

  const handleSubscribe = (planId: PlanId) => {
    if (!acceptedTerms) {
      setShowTermsHint(true);
      return;
    }
    // Toutes les offres sont annuelles.
    onSubscribe(planId, "annual");
  };

  return (
    <section id="pricing" className="w-full bg-[#FAF8F5] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-[#5b61f6]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#5b61f6] mb-4">Tarifs</span>
          <h2 className="text-4xl font-extrabold text-[#0f172a]">Simple. Transparent.</h2>
          <p className="mt-3 text-lg text-slate-500">Créez votre DUERP gratuitement : vous ne payez qu'au moment de le télécharger.</p>
          <p className="mt-1 text-sm text-slate-400">Abonnement annuel, prix HT.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((p) => {
            return (
              <article
                key={p.id}
                className={`relative flex flex-col rounded-[28px] bg-white p-8 border transition ${
                  p.recommended
                    ? "border-[#5b61f6] shadow-xl shadow-[#5b61f6]/10"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                <span className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-bold ${
                  p.recommended ? "bg-[#5b61f6] text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {p.badge}
                </span>
                <h3 className="text-2xl font-extrabold text-[#0f172a] mt-2">{p.name}</h3>
                <p className="text-slate-500 mt-1 text-sm">{p.tagline}</p>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="text-4xl font-extrabold text-[#0f172a]">{p.priceYearly.toLocaleString("fr-FR")} €</span>
                  <span className="text-slate-400 mb-1 text-sm">/ an</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">soit environ {Math.round(p.priceYearly / 12)} € par mois</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[9px] font-bold">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleSubscribe(p.id)}
                  disabled={isLoading}
                  className={`mt-8 w-full rounded-2xl py-3.5 font-bold text-base transition disabled:opacity-60 ${
                    p.recommended
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

        <div className="mt-8 flex flex-col items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                if (e.target.checked) setShowTermsHint(false);
              }}
              className="h-4 w-4 rounded border-slate-300 text-[#5b61f6] focus:ring-[#5b61f6]"
            />
            J'accepte les{" "}
            <a href="/cgv" target="_blank" rel="noreferrer" className="text-[#5b61f6] hover:underline">
              CGV
            </a>{" "}
            et la{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="text-[#5b61f6] hover:underline">
              politique de confidentialité
            </a>
          </label>
          {showTermsHint && (
            <p className="text-xs font-semibold text-rose-600">Coche cette case pour continuer.</p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Paiement sécurisé par Stripe · Abonnement annuel · TVA non applicable (Art. 293B du CGI)
        </p>
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
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="/legal" className="hover:underline">Mentions légales</a>
          <a href="/cgv" className="hover:underline">CGV</a>
          <a href="/privacy" className="hover:underline">Confidentialité</a>
          <a href="/dpa" className="hover:underline">Traitement des données</a>
          <a href="/support" className="hover:underline">Support</a>
        </div>
        <span>© {new Date().getFullYear()} Kaijos™</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------
   EXPORT PAGE
------------------------------------------------------------ */
export default function LandingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Calculé avant le tout premier rendu, pas dans un useEffect : évite un
  // flash de la page marketing complète (avec sa nav "Se connecter") juste
  // après l'inscription, pendant que le paiement démarre en arrière-plan.
  // C'est ce flash qui donne l'impression de "revenir à la case départ".
  const [resumingPlan, setResumingPlan] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout")) return null; // succès/annulation gérés séparément
    const fromUrl = params.get("startCheckout");
    if (fromUrl) return fromUrl;
    try {
      return localStorage.getItem("kaijos_pending_plan");
    } catch {
      return null;
    }
  });
  const [checkoutSuccess] = useState(() => new URLSearchParams(window.location.search).get("checkout") === "success");

  const startCheckout = async (planId?: PlanId, billing?: Billing) => {
    if (checkoutState === "loading") return;
    // Si pas connecté → inscription d'abord, avec le plan en paramètre. On le
    // garde aussi en localStorage : le "afterSignUpUrl" de Clerk ne survit pas
    // toujours au parcours d'inscription (ex. redirection interne de Clerk vers
    // "/" plutôt que vers l'URL demandée) — sans ce filet, l'utilisateur revient
    // sur /landing après inscription sans que le paiement ne reprenne jamais.
    if (!isSignedIn) {
      try {
        localStorage.setItem("kaijos_pending_plan", planId || "starter");
        localStorage.setItem("kaijos_pending_billing", billing || "annual");
      } catch {}
      navigate(`/sign-up?plan=${planId || "starter"}`);
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
      // clerkUserId n'est plus envoyé : le serveur le dérive du jeton de
      // session que apiPost attache automatiquement, pas d'un champ du body.
      const data = await apiPost<{ url?: string }>("/api/checkout-sessions", {
        planId,
        billing,
        email: user?.primaryEmailAddress?.emailAddress,
      });
      if (!data?.url) throw new Error("Checkout session url missing");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutState("error");
      setCheckoutError("Impossible de démarrer le paiement. Réessayez dans quelques secondes.");
      setResumingPlan(null); // repasse en page normale pour que l'erreur soit visible et le client puisse réessayer
    }
  };

  useEffect(() => {
    if (!isLoaded) return; // attend que Clerk confirme l'état de session avant de décider quoi que ce soit

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const subscription = params.get("subscription");

    if (checkout === "success") {
      // Le webhook Stripe a déjà mis à jour l'abonnement côté serveur, mais la
      // session Clerk de ce navigateur est encore périmée — sans reload(), on
      // resterait bloqué ici en boucle malgré un paiement réussi.
      setNotice("Paiement confirmé — activation de votre abonnement…");
      (async () => {
        for (let i = 0; i < 6; i++) {
          const updated = await user?.reload();
          if ((updated?.publicMetadata as any)?.subscriptionStatus === "active") {
            navigate("/", { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        setNotice("Paiement confirmé — l'activation prend un peu plus de temps que prévu. Rechargez cette page dans une minute.");
      })();
    } else if (checkout === "cancel") {
      setNotice("Paiement annulé. Vous pouvez réessayer.");
    } else if (subscription === "required") {
      setNotice("Abonnement inactif. Merci de vous abonner pour accéder à l'application.");
    } else if (resumingPlan) {
      // Reprend le plan choisi avant l'inscription (voir SignUpPage + le state
      // resumingPlan ci-dessus), pour ne pas faire re-choisir le plan une
      // deuxième fois juste après avoir créé le compte.
      if (isSignedIn) {
        let pendingBilling: Billing | undefined;
        try {
          pendingBilling = localStorage.getItem("kaijos_pending_billing") === "annual" ? "annual" : undefined;
          localStorage.removeItem("kaijos_pending_plan");
          localStorage.removeItem("kaijos_pending_billing");
        } catch {}
        startCheckout(resumingPlan as PlanId, pendingBilling);
      } else {
        // Chargé, mais pas connecté malgré un plan en attente (ex. lien rouvert
        // plus tard, session expirée) — pas la peine de rester bloqué sur
        // l'écran de reprise, on retourne à la page normale.
        setResumingPlan(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded]);

  const isLoading = checkoutState === "loading";

  // Écran de transition minimal — pas de nav, pas de contenu marketing — pour
  // les moments où on agit automatiquement en arrière-plan (reprise du
  // paiement juste après l'inscription, confirmation après Stripe). Sans ça,
  // l'utilisateur voit la page marketing complète (avec "Se connecter" dans
  // la nav) pendant la transition, ce qui donne l'impression qu'on lui
  // redemande de tout recommencer alors que ce n'est pas le cas.
  if (checkoutSuccess || resumingPlan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-slate-950">
        <div className="w-full max-w-sm text-center">
          <span className="text-xl font-extrabold tracking-tight text-ink dark:text-white">Kaijos<sup className="ml-0.5 text-[0.55em] font-semibold align-super">™</sup></span>
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-kairos border-t-transparent" />
          <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {checkoutSuccess ? notice || "Paiement confirmé — activation de votre abonnement…" : "Un instant, on prépare votre paiement…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white dark:bg-slate-950">
      <Navbar isSignedIn={Boolean(isSignedIn)} />
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
      <Hero />
      <SocialProof />
      <ValueProps />
      <UseCasesCompact data={USE_CASES} /> {/* ← Cas pratiques compact */}
      <Steps />
      <PricingSection onSubscribe={startCheckout} isLoading={isLoading} />
      <Footer />
    </main>
  );
}
