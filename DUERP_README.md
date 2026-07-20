# DUERP / Kaijos — Référence technique complète

Document de référence pour développeur (toi dans six mois, ou un futur développeur externe). Contrairement à `ARCHITECTURE.md` (langage simple, pensé pour Pierre non-dev), ce document suppose une lecture de code et vise l'exhaustivité : chaque section a été vérifiée contre le code réel au 19/07/2026, pas recopiée d'une version antérieure. Pour le détail du sourcing du contenu réglementaire, voir `REFERENTIELS.md`.

---

## 1. Objet produit et périmètre

SaaS multi-tenant B2B : une entreprise (ou un cabinet consultant gérant plusieurs clients) inventorie ses unités de travail, se voit proposer des risques préremplis par secteur (code NAF), cote chaque risque (gravité × fréquence / maîtrise), en déduit un plan d'action priorisé, et exporte/versionne le document unique (obligation légale, Code du travail art. R.4121-1 et suivants). Trois offres commerciales (Starter/PME/Consultants), facturation Stripe, auth Clerk.

---

## 2. Architecture applicative — vue d'ensemble et pourquoi

```
Navigateur ──► Vercel (SPA React statique)
                   │
                   ├─► Render (API Node, api/server.ts, port 8787)
                   │        ├─► Neon (Postgres — données des clients)
                   │        ├─► Clerk (vérification de session, métadonnées d'abonnement)
                   │        ├─► Stripe (checkout, webhooks, portail de facturation)
                   │        ├─► Resend (emails transactionnels)
                   │        └─► config/*.json (catalogue de risques — fichiers, pas de DB)
                   │
                   └─► api.gouv.fr recherche-entreprises (recherche SIRET/SIREN, public, gratuit)
```

**Pourquoi front et API sont hébergés séparément (Vercel / Render) plutôt qu'ensemble.** Vercel est optimisé pour du contenu statique/edge (le build Vite) et gratuit à ce volume ; Render héberge un vrai process Node long-vivant (`createServer` de `http`, pas de serverless) parce que l'API tient un pool de connexions Postgres (`pg.Pool`) et un cache mémoire (JWT Clerk, rate-limit) qui ont besoin d'un process persistant. Vercel ne convient pas à ce second usage sans réécrire l'API en fonctions serverless — jugé non prioritaire.

**Pourquoi le catalogue de risques est en fichiers JSON (`config/`) et pas dans Neon.** Décision volontaire, pas un oubli : voir `ARCHITECTURE.md` §4bis pour le raisonnement complet côté produit. Techniquement, ça veut dire que `RiskEngineV4` (`src/core/engine/risk-engine.server.ts`) lit `config/risks/*.json`, `config/naf/*.json`, etc. **au démarrage du process** (`loadAll()` dans le constructeur) — un changement de fichier JSON ne prend effet qu'après redémarrage du serveur Render (donc après un déploiement), jamais à chaud.

**Pas de CI.** Aucun `.github/workflows/`. Vercel et Render redéploient automatiquement sur `git push` vers la branche suivie, sans étape de test intermédiaire — `npm run test:api:smoke`, `test:api:integration`, `config:validate` et `tsc -b` doivent être lancés **manuellement avant de pousser**. C'est un vrai point de fragilité : un `tsc -b` cassé ou un JSON invalide peut atteindre la prod sans filet. Voir §12 pour la checklist à faire soi-même avant chaque push.

---

## 3. Stack technique et choix (avec le pourquoi)

| Domaine | Choix | Pourquoi |
|---|---|---|
| Front | Vite + React 18 + TypeScript | build rapide, écosystème standard ; pas de SSR nécessaire pour une app derrière login (sauf `/landing`, voir §9) |
| État global front | Zustand (`src/state/store.ts`) | plus léger que Redux pour un état applicatif de taille moyenne (établissements/unités/évaluations/actions/versions), pas de boilerplate d'actions/reducers |
| Style | Tailwind CSS | cohérence rapide sur beaucoup d'écrans (Dashboard, Units, Inventory, ActionPlan, Exports, Versions…) |
| Auth | Clerk | gère inscription/connexion/sessions/MFA sans construire ni stocker de mots de passe soi-même ; `publicMetadata` sert aussi de source de vérité pour l'état d'abonnement (voir §8) — évite une table `subscriptions` dupliquée |
| Base de données | Postgres (Neon) | relationnel classique, adapté au modèle établissement→unité→évaluation→action ; Neon choisi après l'incident Supabase (voir `ARCHITECTURE.md` et mémoire `duerp_supabase_incident`) car il ne supprime jamais un projet inactif, juste une pause de calcul |
| Accès DB | `pg` (driver natif) + SQL à la main dans `api/server.ts`, pas d'ORM | surface de requêtes volontairement petite (5 tables métier + `invitations`) ; un ORM aurait ajouté une couche d'abstraction sans bénéfice à cette échelle |
| Paiement | Stripe (Checkout + Billing Portal + webhooks) | standard du marché, gère PCI-DSS, prélèvements récurrents, portail self-service de résiliation |
| Email transactionnel | Resend | API simple, gratuit jusqu'à 3000 emails/mois, largement suffisant au stade actuel |
| Recherche entreprise | API SIRENE via `recherche-entreprises.api.gouv.fr` | source officielle INSEE, publique, gratuite, pas de clé à gérer |
| Génération PDF/Excel | `jspdf` + `jspdf-autotable`, `xlsx` | génération côté client, pas de service d'export tiers à payer |
| Validation config | `zod` (schémas), scripts `scripts/config/validate-config.ts` | attrape les JSON malformés/incohérents avant qu'ils cassent le moteur en prod |

---

## 4. Services externes — dépendances et points de rupture

| Service | Rôle exact | Configuré où | Si en panne |
|---|---|---|---|
| **Vercel** | héberge le front statique (build Vite) | `vercel.json` (rewrite SPA : tout vers `index.html`) + dashboard Vercel | site inaccessible |
| **Render** | héberge `api/server.ts` (process Node long-vivant) | dashboard Render (pas de `render.yaml` dans le repo — config faite à la main dans l'UI, donc **non versionnée**) | plus aucune donnée client accessible (établissements/unités/évaluations/actions/versions), plus de paiement, plus de moteur d'évaluation ; le front continue de s'afficher mais vide |
| **Neon** | Postgres, données clients (`establishments`, `work_units`, `assessments`, `actions`, `duerp_versions`, `invitations`) | `DATABASE_URL` (Render + `.env.local`) | toutes les routes `/api/establishments`, `/api/work-units`, `/api/assessments`, `/api/actions`, `/api/versions`, `/api/invites` échouent ; le catalogue de risques (fichiers) continue de fonctionner |
| **Clerk** | authentification, ET source de vérité de l'état d'abonnement (`publicMetadata`) | `VITE_CLERK_PUBLISHABLE_KEY` (front), `CLERK_SECRET_KEY` (API) | personne ne peut se connecter ; les routes `/api/establishments` etc. renvoient 401 (elles dépendent de `getClerkOrgId()`, voir §8) |
| **Stripe** | Checkout, webhooks (`/api/webhooks/stripe`), portail de facturation | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 6× `STRIPE_PRICE_ID_*` | plus de nouvelle souscription ni de gestion d'abonnement en self-service ; les comptes déjà actifs continuent de fonctionner (l'état vit dans Clerk `publicMetadata`, pas interrogé à chaud) |
| **Resend** | emails d'invitation collaborateur + rappel de révision annuelle | `RESEND_API_KEY`, `FROM_EMAIL` | `/api/invites` et `/api/reminders/send` renvoient une erreur explicite (503) — dégradation contrôlée, pas de crash |
| **API SIRENE (gouv.fr)** | recherche d'entreprise par SIRET/SIREN/nom (`/api/companies/search`) | aucune clé — appel public direct | recherche entreprise ne renvoie rien ; le reste de l'app fonctionne |
| **GitHub** | source de vérité du code, déclenche les déploiements auto Vercel/Render | — | aucun nouveau déploiement possible ; la prod déjà en ligne continue de tourner |

---

## 5. Modèle de données (Postgres/Neon)

Toutes les tables métier sont scopées par `org_id` (= l'id utilisateur Clerk, **pas** un vrai id d'organisation multi-utilisateurs — voir dette technique §13). Chaque requête `SELECT`/`UPDATE`/`DELETE` filtre explicitement sur `org_id`, à la main dans `api/server.ts` (pas de RLS Postgres, l'isolation est faite au niveau applicatif).

| Table | Colonnes clés | Notes |
|---|---|---|
| `establishments` | `id, org_id, name, siren, siret, code_naf, sector, address, headcount` | un établissement = une entité juridique/site |
| `work_units` | `id, org_id, establishment_id, name, description, location, headcount, activity, features, tags, measurements` | une unité de travail, rattachée à un établissement ; `features` (tableau) pilote les boosts de score (§6) |
| `assessments` | `id, org_id, work_unit_id, hazard_id, hazard_category, risk_label, damages, existing_measures, proposed_measures, gravity, frequency, control, score, priority, created_at, updated_at, source, source_url` | une ligne = un risque coté pour une unité ; `source`/`source_url` portent la citation officielle (INRS/CARSAT/Code du travail) quand disponible |
| `actions` | `id, org_id, establishment_id, assessment_id, title, description, owner, start_date, due_date, end_date, how, status, priority, cost, evidence_url, steps, created_at` | plan d'action ; `status` ∈ `TO_DO/IN_PROGRESS/DONE/LATE` |
| `duerp_versions` | `id, org_id, establishment_id, label, reason, hash, snapshot, created_at` | snapshot JSON figé pour l'historique légal (conservation 40 ans, art. R.4121-4 — voir `Privacy.tsx`) |
| `invitations` | `id, owner_clerk_id, invitee_email, role, status, created_at` | collaborateurs invités par email, `UNIQUE(owner_clerk_id, invitee_email)` |

Toutes les écritures utilisent `INSERT … ON CONFLICT (id) DO UPDATE … WHERE table.org_id = $2` — un `UPDATE` sur un id qui n'appartient pas à l'org appelante ne touche silencieusement aucune ligne (pas d'erreur, la clause `WHERE` filtre juste tout).

**Catalogue de référence (hors Neon, volontairement) :** `config/risks/*.json` (28 fichiers), `config/actions/*.json` (27 fichiers), `config/naf/*.json` (83 profils sectoriels), `config/obligations/{general,sector}.json`, `config/rules/conditional.json`, `config/units/modifiers.json`. Chargés en mémoire au démarrage par `RiskEngineV4`.

---

## 6. Moteurs de risque et pipeline de préremplissage

Il existe **deux moteurs distincts**, plus une bibliothèque générique de repli — l'app essaie chaque niveau dans l'ordre et ne descend au suivant que si le précédent est vide ou indisponible.

### V4 — moteur serveur (`src/core/engine/risk-engine.server.ts`, exposé via `POST /api/evaluate`)
- Charge tout `config/` en mémoire (risques, actions par risque, obligations, 83 profils NAF, règles conditionnelles, modificateurs d'unité).
- `getRisksFor(nafCode, unity, ctx)` : risques `mandatory` + `priority` du profil NAF trouvé (préfixe le plus proche du code NAF), plus les règles conditionnelles (`rules/conditional.json`) ; repli sur `R-ECRAN`/`R-RPS`/`R-INCENDIE` si le profil NAF est introuvable.
- `evaluateRisk(risk, ctx)` : part d'une table de **valeurs de base par catégorie** (`CATEGORY_DEFAULTS`, 10 catégories — Sécurité, Accident majeur, Biologique, Physique, Accidentel, Chimique, Accident, Organisationnel, Ergonomique, Environnemental), ajustée par les modificateurs de contexte/unité, puis calcule `score = gravité × fréquence / max(maîtrise, 0.5)`. Ces valeurs de base sont des **estimations raisonnables documentées comme telles dans le code** (commentaire au-dessus de `CATEGORY_DEFAULTS`), pas encore sourcées risque par risque individuellement — c'est la Phase 2 mentionnée dans `REFERENTIELS.md`.
- Réparé le 19/07/2026 (voir mémoire `duerp_architecture_findings`) : avant ce correctif, le moteur crashait (`clamp()` attendait un tableau, `config/scoring.json` avait été restructuré en objet) et retombait silencieusement sur des scores arbitraires sans lien avec le risque réel.
- Activé côté front uniquement si `VITE_USE_REMOTE_ENGINE=true` (sinon jamais appelé — repli automatique sur V3).

### V3 — moteur front (`src/core/engine/risk-engine.v3.ts`)
- Version locale, sans appel réseau, servant de repli si V4 échoue ou n'est pas activé. Mêmes principes (profil NAF + règles + scoring), sourcé sur `src/config/**` (catalogues compacts distincts de `config/**` — **ne pas confondre les deux jeux de fichiers**, voir §12).

### Pipeline complet de préremplissage (`src/services/prefillService.ts::buildPrefillData`)
Le moteur V3/V4 n'est qu'**une des cinq couches** combinées à la création d'une unité de travail, dans cet ordre de priorité (chaque couche ne complète que ce que la précédente n'a pas rempli, jusqu'à un minimum de 8 risques) :

1. **Templates spécifiques au type d'unité** (`getTemplateHazards`) — priorité maximale.
2. **Moteur V4 (remote) ou V3 (local)** — voir ci-dessus.
3. **Mapping NAF** (`buildHazardsFromMapping`, fichier `kairos_duerp_naf_mapping.json`) — complète seulement si les couches 1-2 donnent moins de 8 risques ; volontairement plafonné (`topUp`) pour ne pas noyer les résultats plus fins des couches prioritaires sous des scores génériques uniformes (~50).
4. **Presets NAF** (`src/data/nafPresets`, `src/data/sectorHazards`) — même logique de complément plafonné.
5. **Bibliothèque générique** (`src/data/riskLibrary.ts`) — dernier recours si aucune des couches précédentes n'a rien donné de spécifique au secteur. **Non sourcée individuellement** (pas de `source`/`sourceUrl` par risque) — quand elle est utilisée, `usedGenericFallback: true` est renvoyé et l'écran Inventaire doit prévenir l'utilisateur que ces risques ne sont pas affinés par secteur.

Le score final utilisé pour trier et prioriser est systématiquement `gravité × fréquence / max(maîtrise, 0.5)`, avec les seuils de priorité définis dans `src/utils/score.ts` (P1 ≥ 80, P2 ≥ 50, P3 ≥ 25, P4 < 25) — cohérent entre V3, V4 et le fallback générique.

---

## 7. Authentification et sécurité — deux schémas distincts, à ne pas confondre

`api/server.ts` applique **deux mécanismes d'auth complètement séparés** selon la route :

**A. Jeton statique partagé ou JWT HS256** (`authorize(req)`, rôles `admin > manager > contrib > viewer`) — protège les routes de catalogue et d'évaluation : `POST /api/evaluate`, `POST /api/compliance`. Configuré via `API_TOKEN_ADMIN/MANAGER/CONTRIB/VIEW` ou `API_JWT_SECRET`. **Un seul jeu de jetons pour tout le monde** — ces routes ne portent pas de données propres à un client, donc pas besoin d'isolation par utilisateur.

**B. Session Clerk réelle** (`getClerkOrgId(req)`, via `verifyToken` du SDK Clerk, `payload.sub` = id utilisateur) — protège toutes les routes de données personnelles : `/api/establishments`, `/api/work-units`, `/api/assessments`, `/api/actions`, `/api/versions`. Chaque appel vérifie un vrai jeton de session (envoyé en `Authorization: Bearer`), pas un mot de passe technique partagé — c'est le correctif du 18/07/2026 qui a remplacé les écritures directes navigateur→Supabase (voir `ARCHITECTURE.md` §4). Un cache mémoire (`clerkOrgCache`, TTL 60s) évite de revérifier le jeton à chaque requête.

**Autres mesures :** CORS restreint par `API_ALLOWED_ORIGINS` (sinon `403 CORS forbidden` avant même l'auth) ; rate-limit par IP configurable (`API_RATE_LIMIT`, fenêtre glissante 60s, bucket en mémoire — donc remis à zéro à chaque redémarrage du process, pas persistant) ; webhook Stripe vérifié par signature (`stripe.webhooks.constructEvent`) avant tout traitement.

**Limite connue :** pas de RLS Postgres — l'isolation multi-tenant repose entièrement sur le fait que chaque requête SQL dans `api/server.ts` inclut bien `WHERE org_id = $n`. Une requête ajoutée par erreur sans ce filtre serait une fuite de données inter-clients silencieuse. Pas de test automatisé qui vérifie spécifiquement cette isolation.

---

## 8. Surface API réelle (`api/server.ts`, port 8787 / `API_PORT`)

*(La version précédente de ce document listait `GET /api/catalog/risks|actions|obligations` et `GET /api/nafs` — ces routes **n'existent pas** dans le code actuel ; elles ont été supprimées de cette liste. Le catalogue est consommé directement depuis les fichiers `config/` par le moteur, jamais via une route HTTP dédiée.)*

| Méthode + route | Auth | Rôle |
|---|---|---|
| `POST /api/webhooks/stripe` | signature Stripe | reçoit les événements checkout/subscription/invoice, met à jour `publicMetadata` Clerk |
| `POST /api/checkout-sessions` | aucune (public) | crée une session Stripe Checkout pour un plan |
| `POST /api/customer-portal` | aucune (attend un `clerkUserId` en body) | ouvre le portail de facturation Stripe |
| `GET/POST/DELETE /api/establishments[/:id]` | Clerk (B) | CRUD établissements |
| `GET/POST/DELETE /api/work-units[/:id]` | Clerk (B) | CRUD unités de travail |
| `GET/POST/DELETE /api/assessments[/:id]` | Clerk (B) | CRUD évaluations de risque |
| `GET/POST/DELETE /api/actions[/:id]` | Clerk (B) | CRUD plan d'action |
| `GET/POST /api/versions` | Clerk (B) | historique de versions DUERP |
| `POST /api/evaluate` | jeton statique/JWT (A), rôle ≥ contrib | appelle `RiskEngineV4` (§6) |
| `POST /api/compliance` | jeton statique/JWT (A), rôle ≥ contrib | écarts d'obligations réglementaires |
| `GET /api/companies/search?q=` | aucune | proxy API SIRENE (recherche entreprise) |
| `GET/POST /api/invites`, `POST /api/invites/revoke` | aucune (attend `clerkUserId`/`ownerClerkId` en paramètre) | invitations collaborateurs + email Resend |
| `POST /api/reminders/send` | aucune | email de rappel de révision annuelle via Resend |

**Note sécurité :** `/api/checkout-sessions`, `/api/customer-portal`, `/api/invites*` et `/api/reminders/send` ne vérifient pas de session Clerk — ils font confiance aux identifiants (`clerkUserId`, `ownerClerkId`) envoyés dans le corps de la requête. Acceptable tant que ces routes ne renvoient/modifient que des données non sensibles côté appelant (ex. `customer-portal` a quand même besoin de connaître le `stripeCustomerId` déjà lié), mais à garder en tête si ces routes évoluent.

---

## 9. Facturation et abonnement — Stripe + Clerk, pas de table `subscriptions`

L'état d'abonnement d'un utilisateur **ne vit pas dans Neon** : il vit dans `publicMetadata` de l'objet utilisateur Clerk (`subscriptionStatus`, `planId`, `stripeCustomerId`, `stripeSubscriptionId`, `lastStripeEvent`), mis à jour uniquement par les webhooks Stripe (`handleStripeCheckoutCompleted`, `handleStripeSubscriptionEvent`, `handleStripeInvoiceFailed/Paid` dans `api/server.ts`). Avantage : une seule source de vérité, pas de désynchronisation possible entre une table locale et Stripe. Inconvénient : si le webhook Stripe échoue silencieusement (mauvaise config `STRIPE_WEBHOOK_SECRET`, endpoint injoignable), l'état d'abonnement de l'utilisateur ne se met **jamais** à jour tant qu'aucun autre événement ne repasse — pas de réconciliation périodique automatique aujourd'hui.

`App.tsx::RequireSubscription` ne bloque actuellement **rien** : tout utilisateur connecté passe (commentaire explicite dans le code : "le paywall sera géré plus tard"). Le paywall réel reste à implémenter avant lancement commercial si l'intention est de bloquer l'accès aux non-abonnés.

Prix par plan : Starter 39€/mois, PME 89€/mois, Consultants 199€/mois (HT, franchise en base de TVA) — 6 `STRIPE_PRICE_ID_*` distincts (3 plans × mensuel/annuel), l'annuel tombe sur le mensuel si le prix annuel n'est pas configuré (`getStripePriceId`).

---

## 10. Landing marketing

Route SPA `/landing` (`src/pages/Landing.tsx`), sans sidebar/topbar contrairement au reste de l'app. Contient hero, CTA vers `/sign-up` et `#pricing`, argumentaire, tarifs (3 cartes), FAQ, footer avec liens vers `/legal`, `/cgv`, `/privacy`, `/support` (pages ajoutées le 19/07/2026, contiennent encore des champs `[À COMPLÉTER]` — voir dette technique §13).

---

## 11. Commandes utiles

```bash
npm install                    # une fois, ou après ajout de dépendance
npm run dev:full                # site (5173) + API (8787) ensemble — le plus courant en local
npm run dev                     # site seul
npm run dev:api                 # API seule
npm run build                   # tsc -b + vite build
npm run config:build:front      # régénère src/config_generated/bundle.json depuis src/config/**
npm run config:validate         # valide config/**/*.json contre config/schema/*.json
npm run test:api:smoke          # tests API rapides
npm run test:api:integration    # tests API plus complets
npm run duerp:sources:audit     # vérifie la fraîcheur/validité des sources citées dans config/risks
npx tsc -b                      # typecheck complet — à lancer avant tout push, aucune CI ne le fait
```

---

## 12. Variables d'environnement (référence complète, cf. `.env.example`)

| Variable | Où | Rôle |
|---|---|---|
| `API_PORT` | API | port d'écoute (8787 par défaut) |
| `DATABASE_URL` | API | connexion Postgres (Neon en prod) |
| `API_TOKEN_ADMIN/MANAGER/CONTRIB/VIEW` | API | jetons statiques schéma A (§7) |
| `API_JWT_SECRET` | API | secret HS256, alternative aux jetons statiques |
| `API_REQUIRE_TENANT` | API | si `true`, exige un tenant sur les routes A |
| `API_ALLOWED_ORIGINS` | API | liste blanche CORS, séparée par virgules |
| `API_RATE_LIMIT` | API | requêtes/minute/IP, 0 = désactivé |
| `VITE_DUERP_API_BASE` | Front | URL de l'API (`http://localhost:8787` en dev) |
| `VITE_USE_REMOTE_ENGINE` | Front | `true` pour activer le moteur V4 distant (sinon V3 local uniquement) |
| `VITE_DUERP_API_TOKEN` | Front | jeton envoyé sur les routes A |
| `VITE_DUERP_TENANT_ID` | Front | tenant envoyé en header `X-Tenant-Id` |
| `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Front / API | Clerk |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | API | Stripe |
| `STRIPE_PRICE_ID_{STARTER,PME,CONSULTANTS}[_ANNUAL]` | API | 6 price IDs Stripe |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` / `STRIPE_PORTAL_RETURN_URL` | API | redirections post-Stripe |
| `RESEND_API_KEY` / `FROM_EMAIL` | API | envoi d'emails |
| `APP_URL` | API | base URL utilisée dans les liens des emails envoyés |

**Incohérence relevée dans `.env.example` :** il liste encore `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, alors que Supabase a été entièrement retiré du code le 18/07/2026 (voir mémoire `duerp_supabase_incident` et `ARCHITECTURE.md` §4). Ces deux lignes n'ont plus aucun effet — à supprimer du fichier pour ne pas induire en erreur un futur setup.

---

## 13. Dette technique et incohérences connues (identifiées en écrivant cette doc, 19/07/2026)

1. **`.env.example` obsolète** — variables Supabase mortes (voir §12).
2. **`org_id` = id utilisateur Clerk, pas un vrai id d'organisation** — un cabinet "Consultants" gérant plusieurs clients n'a aujourd'hui aucune notion de multi-utilisateurs partageant un même espace de données ; `invitations` existe en base mais rien dans `api/server.ts` ne semble accorder l'accès aux données d'un `org_id` à un invité accepté (à vérifier/construire si le usage "cabinet" est mis en avant commercialement).
3. **Pas de paywall réel** — `RequireSubscription` (§9) laisse passer tout utilisateur connecté, abonné ou non.
4. **Deux jeux de catalogues parallèles** (`src/config/**` pour V3, `config/**` pour V4) — un contributeur peut éditer le mauvais et ne rien voir changer là où il regarde. Documenté mais pas techniquement empêché (pas de garde-fou automatisé).
5. **`riskLibrary.ts` (repli générique, §6) n'a aucune source** — contrairement aux 55 risques du catalogue V4 sourcés le 19/07/2026 (voir `REFERENTIELS.md`).
6. **Pas de CI** — voir §2. `tsc -b`, `config:validate`, `test:api:smoke/integration` sont à lancer manuellement.
7. **Pas de réconciliation Stripe↔Clerk périodique** — voir §9, un webhook manqué peut désynchroniser durablement l'état d'un abonnement.
8. **Rate-limit et cache Clerk en mémoire process** — perdus à chaque redémarrage/redéploiement Render ; sans incidence fonctionnelle grave, mais à savoir si le rate-limit doit un jour être fiable sous forte charge (nécessiterait un store partagé type Redis).
9. **Config Render non versionnée** — pas de `render.yaml`, tout est réglé à la main dans le dashboard ; en cas de perte d'accès au dashboard, la configuration (variables d'env, plan, région) n'est reconstituable qu'à la main.
10. **Pages légales avec champs `[À COMPLÉTER]`** — `Terms.tsx`, `Privacy.tsx` (SIRET, adresse, email de contact) — bloquant avant mise en production de paiements réels.

---

## 14. Règles d'édition et qualité

- JSON en UTF-8 sans BOM (des fichiers `config/naf/*.json` ont eu une corruption d'encodage réelle, corrigée le 19/07/2026 — voir plan `enumerated-marinating-quail.md`).
- Ne jamais mélanger `src/config/**` (V3/front) et `config/**` (V4/API) — voir dette technique #4.
- Après modification de `src/config/**`, régénérer le bundle front (`npm run config:build:front`).
- Après modification de `config/**`, valider (`npm run config:validate`) — pas de rechargement à chaud côté API, redémarrage nécessaire (§2).
- Avant tout push : `npx tsc -b`, `npm run config:validate`, `npm run test:api:smoke` (pas de CI qui le fait à ta place, §13.6).

---

## 15. Checklist de démarrage rapide

1. `.env.local` : copier `.env.example`, renseigner `DATABASE_URL`, clés Clerk/Stripe/Resend en mode test.
2. `npm install`
3. `npm run config:build:front`
4. `npm run dev:full` puis ouvrir `http://localhost:5173` (`/` dashboard, `/landing` marketing).
5. `npm run config:validate` et `npm run test:api:smoke` avant de committer.

---

## 16. Environnements (production / staging)

**Mis en place le 20/07/2026** — objectif : ne plus jamais tester en poussant directement sur `master` (qui déclenche le vrai déploiement de prod sur Vercel + Render).

- **Branche `master`** → seule branche qui déclenche un déploiement de production (Vercel + Render, domaine `kaijos.com`).
- **Branche `staging`** → environnement de test, isolé :
  - Vercel : déploiement de preview automatique à chaque push, protégé par l'authentification Vercel (accessible uniquement en étant connecté au compte/workspace). URL stable : `https://kairos-git-staging-mistergros-projects.vercel.app`. **Important** : les variables `VITE_*` doivent être définies séparément pour l'environnement **Preview** dans *Settings → Environment Variables* (sinon le front de staging appellerait l'API de prod par défaut) ; en particulier `VITE_DUERP_API_BASE` doit pointer vers l'API de staging (voir ci-dessous), pas vers celle de prod.
  - Render : second Web Service `kaijos-api-staging` (région Frankfurt, même Build/Start Command que le service de prod : `npm install; npm run build` / `npx tsx api/server.ts`), suivant la branche `staging`. Variables d'environnement identiques au service de prod (Clerk/Stripe/Resend restent en mode **test** des deux côtés à ce stade — la prod n'est pas encore basculée en clés live), sauf `DATABASE_URL` (branche Neon `staging`), `API_ALLOWED_ORIGINS` et `APP_URL` (URL Vercel de staging ci-dessus, sans slash final).
  - Neon : branche de base de données `staging` (parent : branche de production), créée depuis la console Neon avec **auto-delete désactivé** (le réglage par défaut la supprime après 1 jour — à corriger si ce n'est pas déjà fait). Isolée des vraies données clients.
  - `VITE_BYPASS_AUTH=true` activé sur Vercel, scope **Preview** uniquement (jamais Production), pour contourner un blocage de connexion Clerk local pendant les tests — à retirer une fois ce blocage résolu, et à ne jamais laisser actif en dehors de Preview.
- **Limite connue** : `STRIPE_WEBHOOK_SECRET` du service staging est encore celui de prod — un checkout Stripe complet (jusqu'au passage de l'abonnement à "actif") n'est donc pas testable de bout en bout sur staging tant qu'un second endpoint webhook Stripe (pointant vers l'URL de `kaijos-api-staging`) n'a pas été créé avec son propre secret.
- **Workflow** : travailler sur `staging` → tester sur les URLs de preview/staging → une fois validé, fusionner `staging` dans `master` → seul ce merge déclenche la mise en prod.
- **Rollback** : Vercel (Deployments → ancien déploiement → "Promote to Production"), Render (Deploys → ancien déploiement → "Rollback"), ou `git revert` + push sur `master`. Pour un problème de données : Point-in-Time Restore côté Neon.
