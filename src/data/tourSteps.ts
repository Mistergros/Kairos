export type TourStep = {
  target: string; // valeur de l'attribut data-tour ciblé
  title: string;
  description: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "sidebar-logo",
    title: "Bienvenue sur Kaijos 👋",
    description: "On te fait visiter les grandes étapes en quelques secondes. Ce menu regroupe tout ce qu'il faut pour construire ton DUERP.",
  },
  {
    target: "nav-units",
    title: "1. Unités de travail",
    description: "Commence ici : crée ton établissement, puis découpe-le en unités de travail (atelier, bureau, accueil...).",
  },
  {
    target: "nav-inventory",
    title: "2. Inventaire",
    description: "Kaijos propose automatiquement les risques adaptés à ton secteur (code NAF). Ajuste gravité, fréquence et maîtrise pour chacun.",
  },
  {
    target: "nav-action-plan",
    title: "3. Plan d'action",
    description: "Toutes les mesures de prévention à mettre en place, triées automatiquement par priorité (P1 = le plus urgent).",
  },
  {
    target: "nav-exports",
    title: "4. Exports",
    description: "Télécharge ton DUERP officiel en PDF ou Excel, prêt à présenter en cas de contrôle.",
  },
  {
    target: "context-selector",
    title: "Change de contexte ici",
    description: "Dès que tu as plusieurs établissements ou unités, c'est ici que tu bascules de l'un à l'autre — utile sur toutes les pages.",
  },
  {
    target: "tour-relaunch",
    title: "Tu es prêt !",
    description: "Retrouve cette visite à tout moment en cliquant ici.",
  },
];

export const TOUR_COMPLETED_KEY = "kaijos_tour_completed";
export const WELCOME_DISMISSED_EVENT = "kaijos:welcome-dismissed";
