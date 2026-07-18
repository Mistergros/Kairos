import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDuerpStore } from "../state/store";

const STEPS = [
  {
    number: "1",
    icon: "🏢",
    title: "Créez votre établissement",
    desc: "Renseignez le nom, SIRET, code NAF et effectif. L'IA détecte automatiquement les risques de votre secteur.",
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
    title: "L'IA pré-remplit votre DUERP",
    desc: "Analyse automatique basée sur votre code NAF + activité. Affinez les cotations avec vos paramètres réels.",
  },
  {
    number: "4",
    icon: "📄",
    title: "Exportez le document officiel",
    desc: "Téléchargez le DUERP conforme au Code du travail (art. R.4121-1). Plan d'action inclus.",
  },
];

export function Onboarding() {
  const { establishments, loadDemoData } = useDuerpStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (establishments.length > 0 || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">

        <div className="bg-gradient-to-r from-[#5B61F6] to-[#00B3FF] px-8 py-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">Kaijos — by Milante Consulting</p>
          <h1 className="text-2xl font-bold text-white leading-tight">Votre DUERP conforme en quelques minutes</h1>
          <p className="mt-2 text-sm text-white/75">
            Suivez les 4 étapes ci-dessous. Vos données sont sauvegardées localement à chaque modification.
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
            onClick={() => { setDismissed(true); navigate("/units"); }}
          >
            Créer mon établissement →
          </button>

          <button
            className="mt-2 w-full rounded-2xl border border-slate/15 py-3 text-sm font-semibold text-slate-700 hover:bg-slate/5 transition"
            onClick={() => { loadDemoData(); setDismissed(true); navigate("/"); }}
          >
            Voir un exemple rempli (boulangerie fictive)
          </button>

          <p className="mt-3 text-center text-xs text-slate/40">
            Données stockées dans votre navigateur. Aucun envoi sans votre accord.
          </p>
        </div>
      </div>
    </div>
  );
}
