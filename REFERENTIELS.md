# D'où viennent les risques, les questions et les mesures — état réel au 19/07/2026

Tu as demandé d'où viennent aujourd'hui les risques proposés, les questions du questionnaire de pondération, et les mesures correctives suggérées. Réponse courte : **de beaucoup d'endroits différents, empilés au fil du développement**, avec un système plus riche construit mais jamais branché, et une vraie base de données (Neon) qui ne contient qu'une petite partie de tout ça. Détail ci-dessous, avec les fichiers exacts.

**Mise à jour du 19/07/2026** — RiskEngineV4 est réparé (voir `ARCHITECTURE.md`) et le catalogue de risques (les 28 fichiers `config/risks/*.json` + les 27 de `src/data/riskLibrary.ts`, soit 55 au total) est maintenant sourcé avec de vrais documents officiels vérifiables — voir §4.

Complète `ARCHITECTURE.md` (qui explique l'infrastructure) — celui-ci explique **le contenu métier**.

---

## 1. Les risques (inventaire)

Quand tu cliques « Pré-remplir », l'app interroge **7 sources différentes dans un ordre de priorité fixe**, et empile les résultats jusqu'à avoir au moins 8 risques (`src/services/prefillService.ts`).

```mermaid
flowchart TD
    A["Clic « Pré-remplir »<br/>NAF + activité + unité"] --> B

    subgraph P1["1 — Gabarits d'unité (priorité max)"]
        T1["config/units/templates.json<br/>+ config/risks.catalog.json (V3, 15 entrées)"]
    end
    subgraph P2["2 — Moteur de risques"]
        T2A["RiskEngineV3 (local, navigateur)<br/>src/config/*.json (V3)"]
        T2B["RiskEngineV4 (serveur, distant)<br/>config/risks/*.json (V4, 28 fichiers)<br/>✅ réparé et sourcé le 19/07/2026"]
    end
    subgraph P3["3 — Mapping NAF détaillé"]
        T3["kairos_duerp_naf_mapping.json<br/>82 divisions + 2 dérogations spécifiques"]
    end
    subgraph P4["4 — Préréglages + catalogue distant"]
        T4A["src/data/nafPresets.ts<br/>11 préfixes NAF codés en dur"]
        T4B["src/data/sectorHazards.ts<br/>23 préfixes NAF, filet de secours"]
        T4C["Neon — table `risk`<br/>via /api/catalog/risks (17 risques)<br/>seedée depuis duerp_pro_spec/seed/risk_catalog/sample.json"]
    end
    subgraph P5["5 — Filet de sécurité final"]
        T5["src/data/riskLibrary.ts<br/>27 risques génériques, toujours disponible"]
    end

    B --> P1 --> P2 --> P3 --> P4 --> P5
    P5 --> Z["Fusion, dédoublonnage,<br/>tri par score, limite à 12 risques"]
```

**Ce qu'il faut retenir :**
- Le moteur « IA » distant (RiskEngineV4) est réparé depuis le 19/07/2026 et produit maintenant de vrais résultats sectoriels (ex. boulangerie → atmosphères explosives, brûlures, agents chimiques... au lieu d'une liste générique). Voir `ARCHITECTURE.md` pour le détail des 4 bugs corrigés.
- La base de données Neon (`risk` table) ne contient que **17 risques** — un petit échantillon, pas le catalogue complet. La vraie richesse vient aujourd'hui des fichiers statiques (`riskLibrary.ts`, `config/risks/`), pas de la base.
- Il existe **trois emplacements distincts** pour des catalogues de risques qui se ressemblent : `src/config/` (utilisé par le moteur V3, dans le navigateur), `config/` à la racine (utilisé par le moteur V4, sur le serveur — 28 fichiers, un par risque), et `duerp_pro_spec/seed/` (utilisé une seule fois pour remplir Neon). Ce sont trois listes **différentes**, pas trois copies de la même chose — pas de vraie source unique de vérité.

---

## 2. Les questions du questionnaire de pondération

Plus simple, mais avec une vraie occasion manquée.

**Ce qui est réellement utilisé** : 4 questions fixes, codées en dur dans `src/pages/Inventory.tsx` (`Q1_MAP`, `Q2_MAP`, fonction `getQ3Q4`). Les questions 1 et 2 (gravité, fréquence) sont toujours les mêmes. Les questions 3 et 4 n'ont que **deux variantes** : une pour les risques psychosociaux, une générique pour tout le reste.

**Ce qui existe mais n'est jamais appelé** : `src/data/scoringQuestions.ts` — un système bien plus abouti, avec des questions **spécifiques à 12 catégories de risques** (chimique, mécanique, électrique, incendie/explosion, manutention, chutes, RPS, écran, bruit, biologique, routier...), chacune avec 3 sous-questions ciblées. Ce fichier a été construit mais **jamais branché à l'écran** — c'est un système plus riche qui dort dans le code.

```mermaid
flowchart LR
    A["Écran Inventaire<br/>bouton « Questionnaire »"] --> B["getQ3Q4()<br/>dans Inventory.tsx"]
    B -->|"catégorie = RPS"| C1["4 questions RPS<br/>codées en dur"]
    B -->|"toute autre catégorie"| C2["4 questions génériques<br/>codées en dur"]
    D["scoringQuestions.ts<br/>12 catégories, 3 questions ciblées chacune"] -.->|jamais appelé| X["❌ inutilisé"]
```

---

## 3. Les mesures correctives

**Mise à jour du 19/07/2026 (consolidation) :** ce point était auparavant le plus éclaté du projet — trois mécanismes séparés, avec une logique d'appariement dupliquée à l'identique dans deux fichiers différents. C'est corrigé : la correspondance risque → actions vit maintenant à un seul endroit (`src/services/actionCatalogService.ts`), utilisé à la fois pour générer le titre de l'action et pour la vue Plan d'action. Le catalogue source est désormais `config/actions/*.json` (V4, 27 fichiers, un par risque, 107 actions au total) plutôt que l'ancien `config/actions.catalog.json` (V3, 41 entrées) — le V4 est plus riche et porte un champ `references` (voir §4bis). `config/actions.catalog.json` reste utilisé en interne par le moteur V3 lui-même (`risk-engine.v3.ts`), pas retiré du projet, juste retiré de ce chemin d'appariement précis.

```mermaid
flowchart TD
    R["Un risque est ajouté<br/>à l'inventaire"] --> M1
    R --> M2

    subgraph M1["A — Texte « Mesures à proposer » sur le risque"]
        direction TB
        M1a["Champ example_prevention<br/>du risque source (§1)"]
    end

    A2["Une action est générée<br/>depuis le risque"] --> M2

    subgraph M2["B — Titre + description de l'action"]
        direction TB
        M2a["config/actions/*.json (V4, 27 fichiers, 107 actions)<br/>src/services/actionCatalogService.ts — source unique<br/>appariement par risk_id / libellé / catégorie"]
    end

    A3["On déplie une action<br/>dans le Plan d'action"] --> M3

    subgraph M3["C — Tâches suggérées (case à cocher)"]
        direction TB
        M3a["config/tasks.catalog.json (21 entrées)<br/>src/pages/ActionPlan.tsx<br/>réutilise les mêmes alias que B"]
    end
```

**Ce qu'il faut retenir :**
- **A** (le texte libre "mesures à proposer" visible dès l'ajout du risque) vient directement du risque source lui-même — donc de n'importe laquelle des 7 sources du §1, selon celle qui a matché.
- **B** et **C** partagent maintenant la même table d'alias (`labelToRiskId`/`categoryToRiskId`, exportée depuis `actionCatalogService.ts`) — corriger un alias se fait à un seul endroit.

---

---

## 4. Sourcing du catalogue de risques (mis à jour le 19/07/2026)

**Avant :** 25 des 28 fichiers `config/risks/*.json` citaient juste `["INRS","CARSAT","EU-OSHA"]` de façon générique et identique — pas un vrai document. `riskLibrary.ts` (27 risques) n'avait aucune source du tout.

**Maintenant :** les 55 risques (28 + 27) citent chacun un document officiel précis et vérifiable, avec une date de vérification. Exemples :
- Explosion de poussières (ATEX) → **INRS ED 945**, Mise en œuvre de la réglementation Atex
- Brûlures en cuisine/fournil → **INRS ED 6490**, Prévenir les risques de brûlures dans les métiers de bouche et la restauration
- TMS / manutention → **INRS ED 6518**, Démarche de prévention des TMS
- Sanitaires/vestiaires → **Code du travail, art. R.4228-1** (référence légale directe, plus précise qu'une brochure)

Chaque risque porte maintenant deux champs : `sources` (ou `source` dans `riskLibrary.ts`) — le document précis — et `sources_verified` — la date à laquelle la citation a été vérifiée comme réelle et pertinente. Trois entrées déjà bien sourcées avant le 19/07/2026 (R-CMR, R-TRAVAUX-PUB, et le fichier `R-CHUTE.json`) n'ont pas été retouchées et n'ont donc pas cette date — à vérifier un jour aussi, pas urgent.

**Problème annexe trouvé en sourçant** : deux fichiers différents (`R-CHUTE.json` et `R-GLISSADES.json`) partagent le même identifiant interne `R-GLISSADES`. Le moteur les charge dans une liste indexée par identifiant, donc le second écrase silencieusement le premier — `R-CHUTE.json` (« Chutes de plain-pied et de hauteur ») n'est en réalité **jamais utilisé**, malgré sa présence sur le disque. Pas corrigé pour l'instant (`R-CHUTE-HAUTEUR` couvre déjà la partie « hauteur » séparément, donc l'impact pratique est faible) — à nettoyer un jour.

### Processus de mise à jour périodique

Une commande vérifie l'état du sourcing à tout moment :
```
npm run duerp:sources:audit
npm run duerp:sources:audit -- --check-links   # + vérifie que les liens répondent vraiment
```
Elle signale : les risques sans aucune source, les sources encore génériques (pas de numéro de document), les sources sans lien vérifiable, et celles vérifiées il y a plus d'un an. Avec `--check-links`, elle teste aussi en direct que chaque URL répond (note : legifrance.gouv.fr bloque systématiquement les requêtes automatisées avec un 403, même légitimes — un 403 sur ce domaine précis ne veut pas dire que le lien est mort). Concrètement :
- **Une fois par an** (ou plus tôt si l'INRS/la CARSAT/l'OPPBTP publie une refonte majeure d'un guide déjà cité), lancer l'audit et revérifier les entrées signalées comme anciennes — les brochures INRS sont parfois rééditées avec un nouveau numéro (et leur URL avec).
- **À chaque nouveau risque ajouté** au catalogue, lui donner une vraie source **et** son URL officielle dès la création plutôt qu'un texte générique, pour ne pas recréer la dette d'aujourd'hui.

### Liens vers le contenu de prévention (fait le 19/07/2026)

Chaque risque porte maintenant un champ `sourceUrls` (`config/risks/*.json`) ou `sourceUrl` (`riskLibrary.ts`) — l'URL officielle vérifiée du document cité (page catalogue INRS `inrs.fr/media.html?refINRS=ED+XXX`, page Légifrance pour les références légales, ou page thématique officielle quand il n'existe pas de brochure numérotée précise). Ce champ suit le risque jusque dans l'évaluation stockée en base (table `assessments`, colonnes `source`/`source_url`) et s'affiche dans l'écran Inventaire : une icône 🔗 à côté du nom du risque, et un lien cliquable dans le panneau déplié.

**Deux erreurs de citation trouvées et corrigées pendant cette recherche** (la vérification de chaque URL a révélé que le document cité n'était pas le bon) :
- `R-CMR` citait "INRS ED 6090", qui est en réalité une brochure sur les véhicules industriels au gaz naturel, sans rapport avec les agents CMR. Remplacé par la page thématique officielle INRS sur la prévention du risque CMR.
- `R-CHUTE`/`R-GLISSADES` (et l'entrée équivalente de `riskLibrary.ts`) citaient "INRS ED 6053" pour les chutes de plain-pied — le bon document est **ED 6433** ("Les chutes de plain-pied"). Corrigé aux deux endroits.

**Mise à jour (toujours le 19/07/2026, plus tard dans la journée)** — Pierre a testé et remarqué que ses risques n'avaient aucun lien : en pratique, la source la plus souvent utilisée par le pipeline n'est ni le moteur V4 ni `riskLibrary.ts`, mais le **mapping NAF détaillé** (`kairos_duerp_naf_mapping.json`, priorité n°3), qui n'avait jamais été sourcé. Ce fichier repose en fait sur une taxonomie fixe de **57 libellés de risques uniques** (pas un contenu différent par code NAF — les 700 codes NAF sélectionnent juste des sous-ensembles de ces mêmes 57 items). Chacun a été recherché et vérifié individuellement ; **52 des 57** ont désormais une source officielle précise (`src/data/nafMappingSources.ts`, branché dans `nafMappingLoader.ts`) — les **5 restants** (Noyade/Enfouissement, Procédures insuffisantes, Sous-effectif, Espaces exigus, Sécurité visiteurs) sont volontairement laissés sans lien, faute d'avoir trouvé un document officiel précis et fiable à leur sujet.

Désormais les risques provenant du moteur V4, de `riskLibrary.ts`, **et** du mapping NAF détaillé ont un lien — seules les sources restantes du pipeline (gabarits d'unité, préréglages statiques) n'ont jamais eu de citation à sourcer, donc rien n'est affiché pour elles (pas une régression, un reflet honnête de ce qui est réellement sourcé aujourd'hui). Le "catalogue Neon" mentionné dans une version antérieure de ce document a été retiré du pipeline le 19/07/2026, suite à un audit qui a montré qu'il n'était quasiment jamais utilisé — voir `ARCHITECTURE.md` §4bis pour le détail.

### Sourcing du catalogue d'actions (fait le 19/07/2026, partiel)

Suite à l'audit du moteur V4 et de ses tables (`ARCHITECTURE.md` §4bis), le catalogue d'actions a été consolidé sur `config/actions/*.json` (voir §3) puis passé en revue de la même façon. Il cite **242 références uniques** au total (bien plus que les risques) — articles du Code du travail, normes EN/NF/ISO, guides ANACT/CARSAT/OPPBTP/ADEME/ANSES, et **43 documents INRS numérotés**.

Seules les **43 références INRS "ED ####"** ont été recherchées et vérifiées individuellement (même méthode que pour les risques) ; elles portent maintenant un champ `referenceUrls` (parallèle à `references`, même principe que `sourceUrls`). Les ~200 autres références (Code du travail, normes techniques, guides d'organismes sans numéro) restent des citations texte non vérifiées une par une — un chantier plus lourd, délibérément pas fait dans cette passe.

**Deux citations périmées trouvées et corrigées** :
- "INRS ED 697" (citée pour l'inventaire des FDS/produits chimiques) — ce document de 1987 a été remplacé par une base de données en ligne, sans équivalent brochure. Remplacé par **INRS ED 6483**, "La fiche de données de sécurité", qui correspond au sujet réellement cité.
- "INRS ED 776" (méthode d'analyse des manutentions manuelles) — brochure remplacée par **INRS ED 6161**, "Méthode d'analyse de la charge physique de travail".

Un seul numéro n'a pas pu être confirmé : **INRS ED 6010**, introuvable sur le site INRS malgré plusieurs recherches — laissé sans lien plutôt que de deviner.

**Suite (toujours le 19/07/2026) — passage sur les références légales.** Les **48 articles de code** (Code du travail, de l'environnement, de la santé publique, de la route) cités dans le catalogue d'actions ont été vérifiés un par un sur Légifrance : tous réels, tous topiquement cohérents avec l'action qui les cite. Les **24 décrets/arrêtés/directives/règlements** ont également été passés en revue : tous réels sauf une vraie erreur trouvée — l'action "Maintenance des systèmes de ventilation et de climatisation" (`R-QUALITEAIR`) citait "Décret 2004-964" pour les légionelles, alors que ce décret concerne en réalité la sécurité des ascenseurs. Corrigé vers l'**arrêté du 1ᵉʳ février 2010** (surveillance des légionelles dans les installations d'eau chaude sanitaire), le texte réellement applicable. Un doute mineur subsiste sur "Décret 2012-970 (réforme DT-DICT)" — la recherche pointe plutôt vers le décret n° 2011-1241 pour ce même texte, non tranché faute de certitude suffisante.

**Ce qui reste non vérifié** : les URLs Légifrance des 48+24 références légales ci-dessus n'ont pas été ajoutées individuellement au champ `referenceUrls` (contrainte de temps) — seule la correction légionelles a été liée. Les **49 normes techniques** (EN/NF/ISO/UTE, payantes, sans page officielle publique à lier) et les **77 guides d'organismes génériques** (ANACT/CARSAT/OPPBTP/ADEME/ANSES sans numéro précis) n'ont pas été vérifiés individuellement — rapport effort/valeur jugé trop défavorable pour ce passage (pas de lien public possible pour les normes ; pas de document précis identifiable pour la plupart des guides génériques).

## Ce qui n'est pas utilisé du tout aujourd'hui

- **Les obligations légales** (`config/obligations/*.json`, table Neon `obligation`, route `/api/catalog/obligations`) existent côté données mais **ne s'affichent nulle part** dans l'app actuelle.
- **`scoringQuestions.ts`** (§2) — le questionnaire riche par catégorie, jamais branché.
- Les fichiers NAF sectoriels du moteur V3 (`src/config/naf/*.json`) ne couvrent que **4 secteurs** (commerce, restauration, santé, action sociale) sur l'ensemble des codes NAF possibles.

## Pourquoi c'est comme ça (probablement)

Cette organisation ressemble à plusieurs vagues de développement successives (V3 front léger → V4 API plus structuré → tentative de base de données Neon/Supabase) qui ne se sont jamais complètement remplacées les unes les autres — chaque couche a été ajoutée comme filet de sécurité au-dessus de la précédente plutôt que de la remplacer. Ce n'est pas cassé (le pré-remplissage fonctionne), mais c'est **fragile à faire évoluer** : ajouter un risque « proprement » demanderait aujourd'hui de savoir dans lequel des 5+ endroits l'ajouter, et personne ne peut le deviner sans ce document.

**Piste naturelle pour la suite** (à ne pas faire maintenant, juste à garder en tête) : consolider vers une seule source de vérité — la base Neon — et faire passer risques, actions, tâches et questions par elle plutôt que par des fichiers JSON éparpillés. C'est un chantier à part, plus gros que les corrections rapides déjà faites.
