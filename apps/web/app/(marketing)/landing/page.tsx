import Image from "next/image";

const GreenBullet = () => <span className="inline-block h-3 w-3 rounded-full bg-green-500" aria-hidden />;

const PillarCard = ({ title, bullets }: { title: string; bullets: string[] }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-3 flex items-center gap-3">
      <span className="inline-block h-10 w-10 rounded-full bg-blue-50" aria-hidden />
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    <ul className="space-y-2 text-sm text-slate-800">
      {bullets.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <GreenBullet />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Badge = ({ tone, children }: { tone: "primary" | "secondary"; children: string }) => (
  <span
    className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold ${
      tone === "primary" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
    }`}
  >
    {children}
  </span>
);

const PricingCard = ({
  plan,
}: {
  plan: {
    id: string;
    name: string;
    price: string;
    tagline: string;
    bullets: string[];
    badge: string;
    badgeTone: "primary" | "secondary";
  };
}) => {
  const isRecommended = plan.badgeTone === "primary";
  const cta = `Choisir ${plan.name.split(" ")[0]}`;
  return (
    <article
      className={`relative flex h-full min-h-[460px] w-[340px] max-w-full flex-col rounded-3xl border border-gray-200 bg-white p-8 shadow-xl ${
        isRecommended ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <Badge tone={plan.badgeTone}>{plan.badge}</Badge>
      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-6">{plan.tagline}</p>
      <div className="text-3xl font-bold leading-tight mb-4">
        {plan.price} <span className="text-base text-gray-500 font-normal">/ mois</span>
      </div>
      <ul className="space-y-2 mt-2 mb-6">
        {plan.bullets.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-gray-700 leading-relaxed">
            <GreenBullet />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <a
        href="/signup"
        className={`mt-auto w-full rounded-xl py-3 text-center font-semibold focus:outline-none focus:ring-2 ${
          isRecommended
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90 focus:ring-blue-500"
            : "bg-white border hover:bg-gray-50 text-gray-900 focus:ring-gray-300"
        }`}
        aria-label={cta}
      >
        {cta}
      </a>
    </article>
  );
};

export default function LandingPage() {
  const pillars = [
    {
      title: "Analyser",
      bullets: [
        "Génération automatique des risques (NAF, activité)",
        "Détection d’incohérences",
        "Identification des risques oubliés",
      ],
    },
    {
      title: "Agir",
      bullets: [
        "Suggestions d’actions contextualisées",
        "Plan d’action dynamique",
        "Rappels automatiques",
      ],
    },
    {
      title: "Suivre",
      bullets: ["Tableau de bord", "Suivi conformité", "Exports PDF propres"],
    },
  ];

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
      id: "pro",
      name: "Pro (IA incluse)",
      price: "99 €",
      tagline: "Le plan standard pour PME",
      bullets: [
        "Établissements & unités illimités",
        "Plan d’action + rappels",
        "Collaboration (jusqu’à 5 utilisateurs)",
        "Bibliothèques sectorielles (NAF)",
        "IA : génération, incohérences, suggestions",
        "Connecteurs (PowerBI, Notion…)",
        "Analytics",
      ],
      badge: "RECOMMANDÉ",
      badgeTone: "primary" as const,
    },
    {
      id: "consultants",
      name: "Consultants",
      price: "249 €",
      tagline: "Pour cabinets RH / HSE multi-clients",
      bullets: ["Jusqu’à 20 DUERP actifs", "Exports brandés", "Portail clients", "Support prioritaire", "IA incluse"],
      badge: "CABINET",
      badgeTone: "secondary" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-blue-600" aria-hidden />
            <span className="text-lg font-semibold">Kaijos</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <a href="#features" className="hover:text-blue-600">
              Fonctionnalités
            </a>
            <a href="#how" className="hover:text-blue-600">
              Comment ça marche
            </a>
            <a href="#pricing" className="hover:text-blue-600">
              Tarifs
            </a>
            <a href="#resources" className="hover:text-blue-600">
              Ressources
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <a href="/login" className="text-slate-700 hover:text-blue-600">
              Se connecter
            </a>
            <a
              href="/signup"
              className="rounded-full bg-blue-600 px-4 py-2 font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Souscrire
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-16 text-center space-y-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Kaijos — by Milante Consulting</p>
          <h1 className="text-4xl font-semibold text-slate-900">Le DUERP nouvelle génération, assisté par IA.</h1>
          <p className="text-base text-slate-700">
            Créez, mettez à jour et pilotez votre DUERP 10× plus vite. Conforme, sectorisé et assisté par IA.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="/signup"
              className="rounded-full bg-blue-600 px-6 py-3 text-white font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Souscrire maintenant
            </a>
            <a
              href="#pricing"
              className="rounded-full border border-gray-300 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Voir les offres
            </a>
          </div>
          <p className="text-xs text-slate-600">
            ✓ Conforme Code du Travail • ✓ IA incluse dès le plan Pro • ✓ +300 DUERP générés
          </p>
          <div className="relative mx-auto mt-10 h-72 max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-r from-blue-100 to-indigo-100 shadow-lg">
            <Image
              src="/Kaijos_logo.png"
              alt="Mockup DUERP IA"
              fill
              className="object-contain opacity-50"
              sizes="100vw"
              loading="lazy"
            />
          </div>
        </section>

        {/* KPI */}
        <section className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-3 text-center">
          {[
            { label: "+300 DUERP générés", desc: "Déjà produits par nos clients" },
            { label: "10× plus rapide", desc: "Pilotage et mises à jour" },
            { label: "IA incluse", desc: "Dès le plan Pro" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">{kpi.label}</p>
              <p className="text-sm text-slate-600">{kpi.desc}</p>
            </div>
          ))}
        </section>

        {/* Proposition de valeur */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <PillarCard key={pillar.title} title={pillar.title} bullets={pillar.bullets} />
            ))}
          </div>
        </section>

        {/* Pourquoi c’est mieux */}
        <section className="mx-auto max-w-6xl px-4 py-12 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Pourquoi c’est mieux ?</h2>
          <ul className="space-y-2 text-sm text-slate-800">
            {[
              "Réduction par 4 du temps de mise à jour",
              "Moins d’oublis grâce à la détection IA",
              "Plan d’action réellement piloté",
              "Conformité actualisée Code du Travail",
              "Intégrations PowerBI / Notion pour reporting",
            ].map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-sm text-slate-800">
            <strong>ROI</strong> — Exemple PME 50 salariés : 8 h gagnées / mise à jour • 2 actions critiques détectées /
            trimestre
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-12 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Comment ça marche</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Décrire l’entreprise", desc: "Établissement, unités, NAF" },
              { title: "Valider/ajuster les risques IA", desc: "Affiner les propositions" },
              { title: "Piloter le plan d’action", desc: "Rappels, responsabilités, suivi" },
            ].map((step, idx) => (
              <div key={step.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {idx + 1}
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-slate-700">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preuves sociales */}
        <section id="resources" className="mx-auto max-w-6xl px-4 py-12 space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Ils nous font confiance</h2>
          <p className="text-sm text-slate-700">BTP • Industrie • Services • Santé • Retail • Associations</p>
          <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-800">
            {[
              "« 4× plus rapide qu’avant. » — Responsable HSE",
              "« L’IA nous évite des oublis. » — DRH PME industrielle",
              "« Plan d’action clair, suivi réel. » — Dirigeant TPE",
            ].map((quote) => (
              <div key={quote} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                {quote}
              </div>
            ))}
          </div>
        </section>

        {/* Sécurité */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-sm text-slate-800">
            <h2 className="text-xl font-semibold text-ink mb-2">Sécurité & conformité</h2>
            <ul className="space-y-2">
              <li>• RGPD</li>
              <li>• Hébergement UE/FR</li>
              <li>• Sauvegardes chiffrées</li>
              <li>• Gestion des accès</li>
              <li>• Exports PDF conformes</li>
            </ul>
          </div>
        </section>

        {/* Tarifs */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 space-y-6">
          <h2 className="text-2xl font-semibold text-ink">Tarifs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {pricing.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold text-ink mb-4">FAQ</h2>
          <ul className="space-y-2 text-sm text-slate-800">
            <li>• Conformité Code du Travail ? → Oui.</li>
            <li>• Export PDF ? → Oui.</li>
            <li>• Multi-établissement ? → Dès plan Pro.</li>
            <li>• Équipe ? → Jusqu’à 5 utilisateurs (Pro).</li>
            <li>• Intégrations ? → PowerBI, Notion.</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <a href="/legal" className="hover:underline">
              Mentions légales
            </a>
            <a href="/privacy" className="hover:underline">
              Confidentialité
            </a>
            <a href="/support" className="hover:underline">
              Support
            </a>
          </div>
          <div>© {new Date().getFullYear()} Kaijos — Milante Consulting</div>
        </div>
      </footer>
    </div>
  );
}
