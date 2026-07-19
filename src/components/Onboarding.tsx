import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDuerpStore } from "../state/store";

const STEPS = [
  {
    number: "1",
    icon: "🏢",
    title: "Créez votre établissement",
    desc: "Renseignez le nom, SIRET, code NAF et effectif. Kaijos détecte automatiquement les risques types de votre secteur.",
  },
  {
    number: "2",
    icon: "👷",
    title: "Ajoutez vos unités de travail",
    desc: "Bureau, entrepôt, atelier, accueil... Le moteur de risques adapte l'analyse à chaque unité.",
  },
  {
    number: "3",
    icon: "⚡",
    title: "Kaijos pré-remplit votre DUERP",
    desc: "Analyse automatique basée sur votre code NAF + activité. Affinez les cotations avec vos paramètres réels.",
  },
  {
    number: "4",
    icon: "📄",
    title: "Exportez le document officiel",
    desc: "Téléchargez le DUERP conforme au Code du travail (art. R.4121-1). Plan d'action inclus.",
  },
];

const ONBOARDING_KEY = "kaijos_welcome_dismissed";

export function Onboarding() {
  const { establishments, loadDemoData } = useDuerpStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(ONBOARDING_KEY));

  const dismissForNow = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setDismissed(true);
    window.dispatchEvent(new Event("kaijos:welcome-dismissed"));
  };

  if (establishments.length > 0 || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative">
        <button
          onClick={dismissForNow}
          aria-label="Fermer"
          title="Plus tard"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-lg leading-none hover:bg-white/25 transition"
        >
          ✕
        </button>

        <div className="bg-gradient-to-r from-[#5B61F6] to-[#00B3FF] px-8 py-7">
          <h1 className="text-2xl font-bold text-white leading-tight pr-8">Votre DUERP conforme en quelques minutes</h1>
          <p className="mt-2 text-sm text-white/75">
            Suivez les 4 étapes ci-dessous pour démarrer.
          </p>
        </div>

        <div className="bg-white px-8 py-7">
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-3 rounded-xl border border-slate/10 bg-slate/[0.03] p-4 hover:bg-blue-50/50 transition"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl">
                  {step.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate">
                    <span className="text-[#5B61F6]">Étape {step.number} — </span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate/60">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#5B61F6] to-[#00B3FF] py-4 text-sm font-bold text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition"
            onClick={() => { dismissForNow(); navigate("/units"); }}
          >
            Créer mon établissement →
          </button>

          <button
            className="mt-2 w-full rounded-2xl border border-slate/15 py-3 text-sm font-semibold text-slate-700 hover:bg-slate/5 transition"
            onClick={() => { loadDemoData(); dismissForNow(); navigate("/"); }}
          >
            Voir un exemple rempli (boulangerie fictive)
          </button>

          <button
            className="mt-2 w-full py-2 text-xs font-medium text-slate/50 hover:text-slate/70 transition"
            onClick={dismissForNow}
          >
            Plus tard — regarder d'abord
          </button>

          <p className="mt-1 text-center text-xs text-slate/40">
            Vos données sont enregistrées de façon sécurisée sur votre compte dès leur saisie.
          </p>
        </div>
      </div>
    </div>
  );
}
