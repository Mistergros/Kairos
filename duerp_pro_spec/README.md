# DUERP - Modèle NAF ➝ Unités de travail ➝ Risques ➝ Actions

## Principe
- Le **NAF** fournit des **gabarits d'unités de travail** (UT) et des **tags de risques** sectoriels.
- L'utilisateur **sélectionne/ajuste** ses UT (ajout, suppression, renommage).
- Pour chaque UT, on **évalue les risques** (sévérité, fréquence, maîtrise) et on **planifie des actions**.
- Une **synthèse globale** consolide les scores et le plan d'actions (PAPRIPACT si ≥ 50 salariés).

## Barème de cotation
Score = `Sévérité (1-5) × Fréquence (1-5) − Maîtrise (0-5)`  
Priorisation décroissante du score. Les seuils sont paramétrables.

## Contenu
- `config/schemas/` : schémas JSON (validation).
- `seed/naf/` : exemples de NAF avec UT proposées.
- `seed/risk_catalog/` : catalogue de risques (extrait).
- `seed/action_catalog/` : catalogue d'actions (extrait).
- `seed/obligation_catalog/` : obligations légales (extrait).
- `specs/openapi.yaml` : endpoints REST.
- `db/schema.sql` : schéma SQL générique.

## Flux fonctionnel (UX)
1. Choix du NAF ➝ précharge UT + risques probables.
2. L'utilisateur confirme/édite ses UT (headcount, description).
3. Par UT : sélection/ajout de risques ➝ cotation ➝ actions recommandées.
4. Tableau de bord : priorisation, responsables, échéances, suivi.
5. Exports : registre DUERP, plan d'actions, synthèse par UT et globale.

## IA (facultatif)
- Suggestion d'UT par NAF + taille + texte libre.
- Pré-cotation à partir des mesures existantes et du contexte.
- Reco d'actions en priorité protection **collective** ➝ **organisationnelle** ➝ **EPI**.
- Veille (sources officielles) pour MAJ référentiels.

## Intégration
- Placez ce dossier à la racine de votre projet.
- Importez `db/schema.sql` dans votre SGBD.
- Exposez les endpoints de `specs/openapi.yaml`.
- Chargez les seeds JSON au démarrage (ou via scripts).

## Notes
- Les seeds fournis sont **extraits** pour démonstration. Étendez-les pour couvrir tous les NAF.
- Les schémas JSON permettent une validation côté back et front.