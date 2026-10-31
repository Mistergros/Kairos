// Changement d'offre (api/plans.ts). Lancer : npm run test:plans
import { isPaidPlan, planIdFromPrice, planRank } from "../../api/plans.ts";

const prices = {
  starter: ["price_essentiel_an", "price_essentiel_ancien"],
  pme: ["price_pme_an", undefined],
  consultants: ["price_pro_an", "price_pro_mensuel"],
};
let fails = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
};

check("tarif annuel Essentiel → starter", planIdFromPrice("price_essentiel_an", prices) === "starter");
check("ancien tarif Essentiel → starter", planIdFromPrice("price_essentiel_ancien", prices) === "starter");
check("tarif Pro → consultants", planIdFromPrice("price_pro_an", prices) === "consultants");
check("tarif inconnu → aucune offre", planIdFromPrice("price_inconnu", prices) === null);
check("pas de tarif → aucune offre", planIdFromPrice(undefined, prices) === null);
check("une variable non définie ne correspond à rien", planIdFromPrice(undefined as unknown as string, prices) === null);
check("ordre : Essentiel < PME < Pro", planRank("starter") < planRank("pme") && planRank("pme") < planRank("consultants"));
check("offre gratuite hors classement", planRank("free") === -1);
check("offres payantes reconnues", isPaidPlan("pme") && !isPaidPlan("free") && !isPaidPlan("admin"));

if (fails) {
  console.error(`${fails} scénario(s) en échec`);
  process.exit(1);
}
console.log("Tous les scénarios passent");
