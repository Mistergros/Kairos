import pricingData from "../data/pricing.json";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  tagline: string;
  bullets: string[];
  cta: string;
  badge: string;
  badgeTone: "primary" | "secondary";
};

const badgeMap: Record<string, { badge: string; badgeTone: "primary" | "secondary" }> = {
  essential: { badge: "TPE", badgeTone: "secondary" },
  pro: { badge: "RECOMMANDÉ", badgeTone: "primary" },
  consultants: { badge: "CABINET", badgeTone: "secondary" },
};

const cards: Plan[] = pricingData.plans.map((p) => ({
  id: p.id,
  name: p.name,
  priceMonthly: p.priceMonthly,
  tagline: p.tagline,
  bullets: p.bullets,
  cta: p.cta,
  badge: badgeMap[p.id]?.badge ?? "",
  badgeTone: badgeMap[p.id]?.badgeTone ?? "secondary",
}));

const PricingCard = ({ plan }: { plan: Plan }) => {
  const isRecommended = plan.badgeTone === "primary";
  return (
    <article
      aria-label={`Offre ${plan.name}`}
      className="relative flex h-full min-h-[460px] w-[340px] max-w-full flex-col rounded-3xl border border-gray-200 bg-white p-8 shadow-xl"
    >
      <span
        className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
          isRecommended ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        {plan.badge}
      </span>

      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-6">{plan.tagline}</p>

      <div className="text-3xl font-bold leading-tight mb-4">
        {plan.priceMonthly} € <span className="text-base text-gray-500 font-normal">/ mois</span>
      </div>

      <ul className="space-y-2 mt-2 mb-6">
        {plan.bullets.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-gray-700 leading-relaxed">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`mt-auto w-full rounded-xl py-3 font-semibold text-center focus:outline-none focus:ring-2 ${
          isRecommended
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90 focus:ring-blue-500"
            : "bg-white border hover:bg-gray-50 text-gray-900 focus:ring-gray-300"
        }`}
      >
        {plan.cta}
      </button>
    </article>
  );
};

export function Pricing() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-slate/60">Kaijos by Milante Consulting</p>
        <h1 className="text-3xl font-semibold">Plans &amp; Tarifs — IA incluse dès le plan Pro</h1>
        <p className="text-sm text-slate/70">
          Abonnement SaaS (reconduction auto) ou licence consultants. Prix mensuels, résiliables chaque mois.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {cards.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}

export default Pricing;
