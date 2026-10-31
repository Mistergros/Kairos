import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import pricingData from "../data/pricing.json";
import { usePlan } from "../hooks/usePlan";
import { apiErrorMessage, apiPost } from "../utils/apiClient";

type Plan = typeof pricingData.plans[number];

// Ordre des offres payantes, pour savoir si un abonné monte ou descend.
const PLAN_ORDER = ["starter", "pme", "consultants"];

const BADGE: Record<string, { label: string; color: string }> = {
  starter:     { label: "TPE",          color: "bg-slate/10 text-slate" },
  pme:         { label: "RECOMMANDÉ",   color: "bg-kairos text-white" },
  consultants: { label: "CABINETS",     color: "bg-ink text-white" },
};

export function Pricing() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const currentPlan = usePlan();
  const [loading, setLoading] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsHint, setShowTermsHint] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const currentRank = PLAN_ORDER.indexOf(currentPlan.planId);

  // Abonné : offre supérieure → changement immédiat au prorata (pas de second
  // abonnement) ; offre inférieure → à l'échéance, via le portail Stripe.
  const handleChoose = (planId: string) => {
    if (currentRank === -1) return handleSubscribe(planId);
    if (!acceptedTerms) {
      setShowTermsHint(true);
      return;
    }
    return PLAN_ORDER.indexOf(planId) > currentRank ? handleUpgrade(planId) : openPortal(planId);
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    setCheckoutError(null);
    setNotice(null);
    try {
      const preview = await apiPost<{ amountDue: number; currency: string; from: string; to: string }>("/api/change-plan/preview", { planId });
      const amount = (preview.amountDue / 100).toLocaleString("fr-FR", { style: "currency", currency: (preview.currency || "eur").toUpperCase() });
      const ok = window.confirm(
        `Passer de l'offre ${preview.from} à l'offre ${preview.to} ?

${amount} seront prélevés maintenant : la différence de prix, au prorata de la période restante. Votre date de renouvellement ne change pas.`
      );
      if (!ok) return;
      await apiPost("/api/change-plan", { planId });
      await user?.reload();
      setNotice(`C'est fait : vous êtes maintenant en offre ${preview.to}.`);
    } catch (err) {
      setCheckoutError(apiErrorMessage(err, "Le changement d'offre a échoué. Réessayez dans quelques secondes."));
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async (planId: string) => {
    setLoading(planId);
    setCheckoutError(null);
    try {
      const data = await apiPost<{ url?: string }>("/api/customer-portal", { returnUrl: window.location.href });
      if (!data?.url) throw new Error("Portail indisponible.");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(apiErrorMessage(err, "Impossible d'ouvrir le portail de facturation. Réessayez."));
      setLoading(null);
    }
  };

  const buttonLabel = (plan: Plan, isCurrent: boolean) => {
    if (isCurrent) return "Offre actuelle";
    if (loading === plan.id) return "Un instant…";
    if (currentRank === -1) return plan.cta;
    return PLAN_ORDER.indexOf(plan.id) > currentRank ? `Passer à l'offre ${plan.name}` : "Changer à l'échéance";
  };

  const handleSubscribe = async (planId: string) => {
    // Toutes les offres sont annuelles.
    const billing = "annual";
    if (!acceptedTerms) {
      setShowTermsHint(true);
      return;
    }
    if (!isSignedIn) {
      try {
        localStorage.setItem("kaijos_pending_plan", planId);
        localStorage.setItem("kaijos_pending_billing", billing);
      } catch {}
      navigate(`/sign-up?plan=${planId}`);
      return;
    }
    setLoading(planId);
    setCheckoutError(null);
    try {
      // clerkUserId n'est plus envoyé : le serveur le dérive du jeton de
      // session que apiPost attache automatiquement, pas d'un champ du body.
      const data = await apiPost<{ url?: string }>("/api/checkout-sessions", {
        planId,
        billing,
      });
      if (!data?.url) throw new Error("Le paiement n'a pas pu démarrer (réponse inattendue du serveur).");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutError(apiErrorMessage(err, "Impossible de démarrer le paiement. Réessayez dans quelques secondes."));
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
        <p className="mt-2 text-slate/60 text-sm">Abonnement annuel, prix HT. La création du DUERP est gratuite : vous ne payez que pour le télécharger.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {pricingData.plans.map((plan) => {
          const badge = BADGE[plan.id];
          const isCurrent = currentPlan.planId === plan.id;
          const isRecommended = plan.mostPopular;
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

              <PlanPrice plan={plan} />

              <ul className="mt-3 space-y-2.5 flex-1">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-slate/70">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-kairos/10 text-kairos flex items-center justify-center text-[9px] font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChoose(plan.id)}
                disabled={isLoading || isCurrent}
                className={`mt-7 w-full rounded-2xl py-3 text-sm font-bold transition disabled:opacity-50 disabled:cursor-default ${
                  isRecommended
                    ? "bg-kairos text-white hover:bg-[#4a50e0]"
                    : "border-2 border-ink text-ink hover:bg-ink hover:text-white"
                }`}
              >
                {buttonLabel(plan, isCurrent)}
              </button>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        {notice && (
          <div className="w-full max-w-md rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {checkoutError && (
          <div className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
            {checkoutError}
          </div>
        )}
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
          Passage à une offre supérieure immédiat, différence facturée au prorata. Offre inférieure ou résiliation : depuis votre espace compte, à la fin de l'année déjà payée. Paiement sécurisé via Stripe.
        </p>
      </div>
      </div>
    </div>
  );
}

// Toutes les offres sont annuelles : prix à l'année, équivalent mensuel en dessous.
function PlanPrice({ plan }: { plan: Plan }) {
  return (
    <>
      <div className="flex items-end gap-1.5 mb-1">
        <span className="text-4xl font-extrabold text-ink">{plan.priceYearly.toLocaleString("fr-FR")} €</span>
        <span className="text-slate/50 mb-1 text-sm">/ an</span>
      </div>
      <p className="text-xs text-slate/50 mb-4">soit environ {Math.round(plan.priceYearly / 12)} € par mois, payé une fois par an</p>
    </>
  );
}

export default Pricing;
