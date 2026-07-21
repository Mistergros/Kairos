import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import pricingData from "../data/pricing.json";
import { usePlan } from "../hooks/usePlan";

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

type Plan = typeof pricingData.plans[number];

const BADGE: Record<string, { label: string; color: string }> = {
  starter:     { label: "TPE",          color: "bg-slate/10 text-slate" },
  pme:         { label: "RECOMMANDÉ",   color: "bg-kairos text-white" },
  consultants: { label: "CABINET",      color: "bg-ink text-white" },
};

export function Pricing() {
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();
  const currentPlan = usePlan();
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsHint, setShowTermsHint] = useState(false);

  const monthlyPrice = (plan: Plan) =>
    annual ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

  const handleSubscribe = async (planId: string) => {
    if (!acceptedTerms) {
      setShowTermsHint(true);
      return;
    }
    if (!isSignedIn) {
      navigate(`/sign-up?plan=${planId}`);
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch(`${API_BASE}/api/checkout-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserId: user?.id, planId, billing: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(91,97,246,0.08),transparent_35%),linear-gradient(135deg,rgba(91,97,246,0.08),rgba(0,179,255,0.12))]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <a href="/landing" title="Retour à l'accueil">
            <img src="/Kaijos_logo.png" alt="Kaijos" className="h-16 w-auto object-contain transition hover:opacity-80" />
          </a>
          <a href="/mon-compte" className="text-sm font-semibold text-kairos hover:underline">
            Mon compte
          </a>
        </div>
        <div className="text-center">
        <h1 className="text-3xl font-extrabold text-ink">Plans & Tarifs</h1>
        <p className="mt-2 text-slate/60 text-sm">Engagez-vous annuellement et économisez 2 mois.</p>

        {/* Toggle mensuel / annuel */}
        <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-slate/15 bg-slate/5 p-1.5">
          <button
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${!annual ? "bg-white shadow-sm text-ink" : "text-slate/50"}`}
            onClick={() => setAnnual(false)}
          >
            Mensuel
          </button>
          <button
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${annual ? "bg-white shadow-sm text-ink" : "text-slate/50"}`}
            onClick={() => setAnnual(true)}
          >
            Annuel
            <span className="ml-2 rounded-full bg-lime/20 px-2 py-0.5 text-xs text-lime-700 font-bold">−2 mois</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {pricingData.plans.map((plan) => {
          const badge = BADGE[plan.id];
          const isCurrent = currentPlan.planId === plan.id;
          const isRecommended = plan.mostPopular;
          const price = monthlyPrice(plan);
          const isLoading = loading === plan.id;

          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-7 transition ${
                isRecommended
                  ? "border-kairos shadow-xl shadow-kairos/10 bg-white"
                  : "border-slate/15 bg-white shadow-sm"
              }`}
            >
              {/* Badge */}
              <span className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-bold ${badge.color}`}>
                {badge.label}
              </span>

              {isCurrent && (
                <span className="absolute -top-3 right-6 rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-lime-700">
                  Votre offre
                </span>
              )}

              <h3 className="text-xl font-extrabold text-ink mt-2">{plan.name}</h3>
              <p className="text-xs text-slate/60 mt-0.5 mb-4">{plan.tagline}</p>

              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-extrabold text-ink">{price} €</span>
                <span className="text-slate/50 mb-1 text-sm">/ mois</span>
              </div>
              {annual && (
                <p className="text-xs text-slate/50 mb-4">
                  soit {plan.priceYearly} € / an · 2 mois offerts
                </p>
              )}

              <ul className="mt-3 space-y-2.5 flex-1">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-slate/70">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-kairos/10 text-kairos flex items-center justify-center text-[9px] font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading || isCurrent}
                className={`mt-7 w-full rounded-2xl py-3 text-sm font-bold transition disabled:opacity-50 disabled:cursor-default ${
                  isRecommended
                    ? "bg-kairos text-white hover:bg-[#4a50e0]"
                    : "border-2 border-ink text-ink hover:bg-ink hover:text-white"
                }`}
              >
                {isCurrent ? "Offre actuelle" : isLoading ? "Redirection…" : plan.cta}
              </button>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <label className="flex items-center gap-2 text-sm text-slate">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) setShowTermsHint(false);
            }}
            className="h-4 w-4 rounded border-slate/30 text-kairos focus:ring-kairos"
          />
          J'accepte les{" "}
          <a href="/cgv" target="_blank" rel="noreferrer" className="text-kairos hover:underline">
            CGV
          </a>{" "}
          et la{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-kairos hover:underline">
            politique de confidentialité
          </a>
        </label>
        {showTermsHint && (
          <p className="text-xs font-semibold text-rose-600">Coche cette case pour continuer.</p>
        )}
        <p className="text-center text-xs text-slate/50">
          Résiliation à tout moment depuis votre espace compte. Paiement sécurisé via Stripe.
        </p>
      </div>
      </div>
    </div>
  );
}

export default Pricing;
