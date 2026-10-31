# Guide du mainteneur Kaijos

Ce guide s'adresse à toute personne qui doit comprendre, faire évoluer et exploiter le code de Kaijos sans l'aide de son auteur. Il décrit l'état réel du dépôt : ce qui tourne en production, où se règle chaque chose, et les pièges déjà rencontrés.

Documents complémentaires :
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) : les services externes expliqués simplement, avec leur coût et leur configuration pas à pas.
- [`REFERENTIELS.md`](../REFERENTIELS.md) : d'où viennent les risques, les questions et les mesures proposés, et comment ils sont sourcés.

> Dernière mise à jour : 31 octobre 2026. Voir la section « Tenir ce guide à jour » en fin de document.

---

## 1. En bref

Kaijos est un SaaS français pour réaliser le DUERP (document unique d'évaluation des risques professionnels), édité par Milante Consulting. L'utilisateur crée ses établissements et ses unités de travail. Kaijos pré-remplit l'inventaire des risques à partir du code NAF, l'utilisateur cote chaque risque et construit son plan d'action, puis il télécharge le document en PDF.

| Élément | Technologie | Hébergement |
|---|---|---|
| Interface | React 18, Vite 5, Tailwind, Zustand | Vercel, projet `kairos`, domaine `kaijos.com` |
| API | Node, serveur HTTP natif en TypeScript, lancé par `tsx` | Render, service `kaijos-api` (branche `master`) |
| Base de données | Postgres | Neon, projet `Kaijos`, branche `production`, Francfort |
| Comptes | Clerk | Instance de développement à ce jour (voir §11) |
| Paiement | Stripe Checkout + webhook | Clés de test à ce jour (voir §11) |
| Emails | Resend, domaine `kaijos.com` vérifié | |
| Tâches planifiées | GitHub Actions | `.github/workflows/` |
| Alertes d'erreur | Sentry, inactif tant que les clés ne sont pas définies | |
| DNS | OVH | |

Offres : Découverte (gratuite : on construit son DUERP mais on ne le télécharge pas), Essentiel 149 €/an, PME 490 €/an, Pro 1 990 €/an. Dans le code, les identifiants restent `free`, `starter`, `pme` et `consultants`.

---

## 2. Accès à obtenir pour avoir la maîtrise

Sans ces accès, le code seul ne suffit pas à exploiter le service. Demandez à être ajouté comme membre (ou propriétaire) de :

- **GitHub** `Mistergros/Kairos` : code, secrets des tâches planifiées, CI.
- **Vercel** (équipe « Mistergros' projects », projet `kairos`) : interface, domaines, variables `VITE_*`.
- **Render** (espace « Kaijos ») : API, variables serveur, journaux.
- **Neon** (organisation de Pierre, projet `Kaijos`) : base de données, restauration.
- **Clerk** : comptes utilisateurs et métadonnées d'abonnement.
- **Stripe** (compte « Kaijos ») : tarifs, coupons, webhook, factures.
- **Resend** : envoi d'emails.
- **OVH** : zone DNS de `kaijos.com`.
- **Sentry**, une fois activé.

---

## 3. Démarrer en local

Prérequis : Node 20 ou plus, et une base Postgres (une branche Neon de développement convient).

```bash
git clone https://github.com/Mistergros/Kairos.git
cd Kairos
npm ci
cp .env.example .env.local      # puis remplir les valeurs
npm run duerp:db:init           # crée les tables (base vide uniquement)
npm run dev:full                # API sur :8787 + interface sur :5173
```

**Démo sans compte ni API.** Dans `.env.local`, mettez `VITE_BYPASS_AUTH=true`. L'interface s'ouvre sans connexion, avec l'offre Pro par défaut. `VITE_DEMO_PLAN=free` (ou `starter`, `pme`) permet de tester une autre offre. Le bouton « Voir un exemple rempli » de l'accueil charge une boulangerie fictive. **Ne jamais activer `VITE_BYPASS_AUTH` sur Vercel.**

Sous Windows, l'API lit `API_PORT` (8787 par défaut), pas `PORT`.

---

## 4. Organisation du code

### Ce qui est utilisé

```
api/
  server.ts          Toute l'API : routes, auth Clerk, Stripe, webhook, cron, migrations au démarrage
  slots.ts           Quotas d'établissements et de clients sur 12 mois glissants
  branding.ts        Marque du cabinet sur les PDF (offre Pro) : nettoyage et stockage
apps/web/server/db.ts Pool Postgres (DATABASE_URL) utilisé par l'API
src/
  main.tsx           Point d'entrée : Clerk, Sentry, écran d'erreur
  App.tsx            Routes, garde « connecté », menu, bandeaux
  pages/             Un fichier par écran (Landing, Pricing, Units, Inventory, ActionPlan, Exports, Clients…)
  state/store.ts     Store Zustand persistant (clé localStorage `kaijos-duerp-v1`), synchronisé avec l'API
  repos/             Appels API par entité (établissements, unités, évaluations, actions, versions)
  services/          Pré-remplissage, catalogue d'actions, génération PDF (printService), marque cabinet
  hooks/usePlan.ts   Offre courante et droits (export, XLSX, marque…) lus dans Clerk
  core/engine/       Moteurs de risques : V4 côté serveur (config/), V3 côté navigateur (src/config/)
  data/              Bibliothèques de risques, mapping NAF détaillé, tarifs affichés (pricing.json)
config/              Catalogue V4 : risks/, actions/, naf/ (profils par code NAF), obligations/, schema/
scripts/
  config/validate-config.ts  Validation des JSON de config + cohérence des profils NAF
  tests/             Tests exécutables (quotas, marque cabinet, API)
  duerp/             Création de la base, audit des sources, effacement RGPD d'un utilisateur
duerp_pro_spec/db/schema.sql Schéma de référence de la base
.github/workflows/   ci.yml (vérifications), revision-reminders.yml (rappels quotidiens)
```

### Ce qui est historique

Ces dossiers sont des restes de versions précédentes et ne sont pas utilisés par l'application en production : `kairos-saas/`, `duerp-premium-v4-full/`, `duerp-naf-pack-v3/`, `config_bundle_v3.0.0/`, `tools.bak/`, `specs/`, `export/`, `mock-api.js`, `temp.ps1`. `apps/web` n'est utilisé que pour `apps/web/server/db.ts`. Vérifiez qu'un fichier n'est importé nulle part avant de supprimer quoi que ce soit.

---

## 5. Déploiement

| Branche | Effet |
|---|---|
| `master` | Production. Vercel redéploie l'interface, Render redéploie `kaijos-api`. |
| `staging` | Render déploie `kaijos-api-staging` (offre gratuite, se met en veille). |
| Toute autre branche | Vercel crée un aperçu protégé par l'authentification Vercel. Pas de déploiement Render. |

Habitude de travail : développer sur une branche, laisser la CI passer, vérifier l'aperçu Vercel, puis fusionner dans `master`.

Render lance `npx tsx api/server.ts` : les fichiers TypeScript de `api/` sont exécutés directement, sans compilation. La commande de build Render exécute aussi `vite build`. C'est inutile pour l'API mais sans danger, et on peut la remplacer par `npm ci`.

**Domaine.** `kaijos.com` est l'adresse principale (projet Vercel → Domains) et `www.kaijos.com` y redirige en 308. Ne pas inverser : l'API n'accepte que les origines listées dans `API_ALLOWED_ORIGINS`, et les URL de retour Stripe et des emails utilisent `kaijos.com`.

---

## 6. Base de données et migrations

Il n'y a pas d'outil de migration. Le serveur applique au premier appel des migrations **idempotentes** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) :

| Fonction (`api/server.ts`) | Effet |
|---|---|
| `ensureEstablishmentsSchema` | Ajoute les colonnes `establishments.client_name`, `establishments.logo` (JSONB) et `establishments.archived_at`, et crée `slot_log` (quotas) |
| `ensureReminderSchema` | Crée `reminder_log` : un même rappel n'est jamais envoyé deux fois |
| `ensureBrandingSchema` | Crée `org_branding` : marque cabinet, une ligne par compte |

**Règle :** toute route qui lit une colonne ajoutée par une migration doit appeler la fonction `ensure…` correspondante avant sa requête, même si une autre route le fait déjà. En production, personne n'a peut-être encore appelé cette autre route. C'est exactement ce qui a cassé la route des rappels le 29/10/2026 (correctif `66c9beb`).

**Archivage, jamais de suppression.** `DELETE /api/establishments/:id` renseigne `archived_at` et n’efface rien : le DUERP et ses versions doivent être conservés 40 ans (art. L.4121-3-1). Un établissement archivé :
- sort des listes et des quotas instantanés, mais reste compté 12 mois dans `slot_log` ;
- ne reçoit plus de rappels ;
- peut être restauré en le renvoyant avec `archivedAt: null`.

Les versions enregistrent l’établissement à leur date (`snapshot.establishment`) et se réimpriment depuis la page Versions (`printDuerpDocument` avec `asOf`).

Toute nouvelle table ou colonne doit être ajoutée à deux endroits : dans une fonction `ensure…` et dans `duerp_pro_spec/db/schema.sql`.

Toutes les données applicatives sont rattachées à `org_id`, qui est l'identifiant de l'utilisateur Clerk (`sub` du jeton). Chaque requête SQL doit filtrer sur `org_id`.

Sauvegardes : Neon (offre Launch) garde 7 jours d'historique, réglage « History window ». La branche `production` doit être protégée (Settings → General → Protect this branch).

---

## 7. Offres, limites et paiement

### Les quatre endroits à garder alignés

Changer une limite ou un prix demande de modifier **tous** ces fichiers :

1. `api/server.ts` → `PLAN_LIMITS` : limites appliquées par le serveur, qui font foi.
2. `src/hooks/usePlan.ts` → `PLAN_CONFIG` : droits côté interface (export, XLSX, marque cabinet, nombre d'unités).
3. `src/data/pricing.json` : page Tarifs de l'application.
4. `src/pages/Landing.tsx` → `PRICING_PLANS` : tarifs de la page d'accueil.

Pensez aussi aux CGV (`src/pages/Terms.tsx`) si l'offre change.

### Ce que vérifie le serveur

- **Établissements et clients**, dans `api/slots.ts`, sur 12 mois glissants. Un établissement supprimé, ou un client supprimé ou renommé, continue de compter 12 mois. Une marge de 10 % (au moins 1) est tolérée, et recréer le même SIRET ne consomme pas de place. Testé par `npm run test:slots`.
- **Marque cabinet** : l'écriture (`POST /api/branding`) est réservée à l'offre `consultants`.
- **Téléchargement** : bloqué côté interface pour l'offre Découverte (`canExportDocuments`). Les PDF sont générés dans le navigateur. C'est un frein commercial, pas une protection forte.

### Flux de paiement

1. L'interface appelle `POST /api/checkout-sessions` avec `planId`. Le **tarif est choisi par le serveur** (`getStripePriceId`), jamais par le navigateur.
2. Stripe Checkout encaisse. Les codes promo sont acceptés (`allow_promotion_codes`).
3. Le webhook `POST /api/webhooks/stripe` (signature vérifiée) écrit `subscriptionStatus` et `planId` dans les `publicMetadata` de l'utilisateur Clerk.
4. L'interface (`usePlan`) et le serveur (`getUserPlan`, cache de 60 s pour les abonnements actifs) lisent ces métadonnées.

**Changement d'offre.**
- **Vers une offre supérieure** : `POST /api/change-plan`. L'abonnement existant change de tarif, la différence au prorata est facturée immédiatement (`always_invoice`) et la date de renouvellement ne bouge pas. `POST /api/change-plan/preview` renvoie le montant avant confirmation.
- **Vers une offre inférieure** : par le portail client Stripe, à la fin de la période. Le portail est à configurer dans Stripe : Paramètres → Billing → Portail client, avec les trois produits.
- **Mise à jour du compte** : le webhook `customer.subscription.updated` déduit l'offre du tarif de l'abonnement (`api/plans.ts`), quel que soit le chemin suivi.
- **Pas de doublon** : `/api/checkout-sessions` refuse (409) un utilisateur qui a déjà un abonnement actif.

Toutes les offres sont annuelles. Variables : `STRIPE_PRICE_ID_STARTER_ANNUAL`, `STRIPE_PRICE_ID_PME_ANNUAL` et `STRIPE_PRICE_ID_CONSULTANTS_ANNUAL`. L'offre Pro s'appelle toujours `CONSULTANTS` dans les variables. Le code promo `FONDATEUR` (−500 € à vie sur Pro, 20 utilisations) se gère uniquement dans Stripe.

---

## 8. Authentification et sécurité

- **Routes de données** (établissements, unités, évaluations, actions, versions, marque) : jeton de session Clerk vérifié côté serveur (`getClerkOrgId`). Son `sub` donne le périmètre `org_id`.
- **Routes catalogue** (`/api/evaluate`, `/api/compliance`…) : jetons statiques `API_TOKEN_*` ou JWT `API_JWT_SECRET`. Sans aucun jeton configuré, elles sont ouvertes.
- **CORS** : `API_ALLOWED_ORIGINS`, liste séparée par des virgules. Une origine absente reçoit une erreur 403.
- **Limite de requêtes** : `API_RATE_LIMIT` requêtes par minute et par adresse IP pour les visiteurs, 10 fois plus pour une requête qui porte un jeton. Le webhook Stripe et la tâche planifiée ne sont pas limités. Au-delà, réponse 429.
- **Cron** : `POST /api/cron/revision-reminders` exige `Authorization: Bearer $CRON_SECRET`, comparé en temps constant.
- **Données reçues** : la marque cabinet n'accepte qu'un logo PNG ou JPEG de 400 Ko maximum, une couleur hexadécimale et des champs bornés (`sanitizeBranding`).
- **RGPD** : `npm run duerp:erase-user` efface les données d'un utilisateur. Les sous-traitants sont listés dans `src/pages/Privacy.tsx` et `src/pages/Dpa.tsx` : tenir les deux listes alignées à chaque nouveau prestataire.

---

## 9. Contenu métier (risques, profils NAF)

- Les **profils NAF** du moteur V4 sont dans `config/naf/*.json` (115 profils). Chacun liste des identifiants de risques (`risks_priority`, `risks_mandatory`) qui doivent exister dans `config/risks/`. Le profil retenu est celui dont le code est le plus long, parmi ceux qui sont préfixes du code NAF de l'établissement (avec ou sans point).
- `npm run config:validate` refuse un profil qui cite un risque inexistant ou un code NAF en double.
- Les risques et les actions sont sourcés (INRS, Code du travail…) : voir `REFERENTIELS.md`, et `npm run duerp:sources:audit` (une fois par an au minimum).

**Ajouter une activité :** créez `config/naf/<CODE>-<libelle>.json` avec `code`, `label`, `risks_priority` et `risks_mandatory`, puis lancez `npm run config:validate`.

---

## 9 bis. Documents PDF

Les PDF sont générés dans le navigateur par `src/services/printService.ts` (jsPDF + jspdf-autotable) :
- **DUERP complet** (`printDuerpDocument`, A4 portrait). Il comprend : couverture, sommaire, synthèse, méthode d’évaluation, unités de travail, inventaire par unité, plan d’action, validation et historique des versions. Les numéros du sommaire sont écrits en dernier, une fois les pages connues.
- **Résumé TPE** (`printDuerpSimplified`) et **rapport multi-sites** (`printDuerpMultiSites`).

Deux logos peuvent apparaître :
- celui de l’**entreprise évaluée** (`establishments.logo`, réglé sur la fiche établissement, 400 px et 200 000 caractères au maximum) ;
- celui du **cabinet** (`org_branding`, offre Pro uniquement).

Les deux passent par `sanitizeLogo` (`api/branding.ts`) côté serveur et par `prepareLogo` (`src/services/brandingService.ts`) côté navigateur.

La page « Méthode » décrit l’échelle de cotation de `src/pages/Inventory.tsx` et les seuils de `src/utils/score.ts` : **mettre la page à jour si l’un des deux change.** Les polices standard de jsPDF ne couvrent pas tous les caractères Unicode : éviter les flèches et les symboles hors Latin-1 dans les textes du PDF.

## 10. Tests et intégration continue

| Commande | Ce qu'elle vérifie |
|---|---|
| `npx tsc -b` | Types de l'interface |
| `npm run config:validate` | Schémas JSON de `config/` et cohérence des profils NAF |
| `npm run test:slots` | 14 scénarios de quotas sur un Postgres embarqué (PGlite) |
| `npm run test:branding` | 12 scénarios de nettoyage et stockage de la marque cabinet |
| `npm run test:plans` | Correspondance tarif → offre et ordre des offres |
| `npm run build` | Build de production |

La CI (`.github/workflows/ci.yml`) exécute ces cinq étapes à chaque push et pull request sur `master` et `staging`.

Pour vérifier les types de l'API (non couverte par `tsc -b`) :
`npx tsc --noEmit --skipLibCheck --esModuleInterop --module nodenext --moduleResolution nodenext --target es2022 api/server.ts`.
Trois erreurs sont connues et sans effet : deux types Stripe et Clerk dans `server.ts`, et une extension d'import dans `risk-engine.server.ts` due à ces options.

---

## 11. Tâches planifiées, emails et alertes

- **Rappels de révision** : `.github/workflows/revision-reminders.yml`, chaque jour à 6 h UTC. Le serveur envoie un email par compte abonné dont un DUERP arrive à 12 mois après sa dernière version (30 jours avant, puis après l'échéance). Secrets GitHub : `CRON_SECRET` et `KAIJOS_API_URL`. Test manuel : Actions → « Rappels de révision DUERP » → Run workflow.
- **Emails** : Resend, expéditeur `FROM_EMAIL` (en `@kaijos.com`). Enregistrements DNS chez OVH : `resend._domainkey` (TXT), `send` et `rsend` (CNAME), `_dmarc` (TXT).
- **Sentry** : `VITE_SENTRY_DSN` (Vercel) et `SENTRY_DSN` (Render). Sans clé, rien n'est envoyé. Le serveur remonte les erreurs 500, les échecs du webhook Stripe et les échecs d'envoi de rappel.

### Passage en production (à faire le jour du lancement)

- **Stripe** : remplacer sur Render `STRIPE_SECRET_KEY` par la clé `sk_live_…`. Mettre les trois `STRIPE_PRICE_ID_*_ANNUAL` sur les tarifs du mode réel (les tarifs et coupons ne sont pas partagés entre modes). Créer le webhook en mode réel et mettre son secret dans `STRIPE_WEBHOOK_SECRET`.
- **Clerk** : créer l'instance de production, ajouter chez OVH les CNAME demandés par Clerk, puis remplacer `VITE_CLERK_PUBLISHABLE_KEY` (Vercel) et `CLERK_SECRET_KEY` (Render). Les comptes de l'instance de développement ne sont pas repris.

---

## 12. Variables d'environnement

La liste complète, commentée, est dans [`.env.example`](../.env.example). Où les définir :

| Où | Variables |
|---|---|
| **Vercel** (interface) | `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_DUERP_API_BASE`, `VITE_ADMIN_EMAIL`, `VITE_SENTRY_DSN`, et autres `VITE_*`. Jamais `VITE_BYPASS_AUTH=true`. |
| **Render** (API) | `DATABASE_URL`, `CLERK_SECRET_KEY`, `STRIPE_*`, `RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`, `API_ALLOWED_ORIGINS`, `CRON_SECRET`, `SENTRY_DSN`, `API_TOKEN_*`, `API_JWT_SECRET` |
| **GitHub** (secrets Actions) | `CRON_SECRET` (même valeur que sur Render), `KAIJOS_API_URL` |

Une variable `VITE_*` est intégrée au code à la compilation : après l'avoir modifiée, il faut **redéployer** sur Vercel.

---

## 13. Pièges connus

- **`tsc -b` régénère `vite.config.js` et `vite.config.d.ts`.** Ne pas les commiter : `git checkout -- vite.config.js vite.config.d.ts`.
- **Fins de ligne CRLF** dans la plupart des fichiers. Un script qui remplace du texte doit gérer `\r\n`.
- **Migrations à la demande** : voir §6. Une route qui lit une nouvelle colonne doit appeler la fonction `ensure…` correspondante.
- **Clé Stripe et tarifs de modes différents** : l'erreur `resource_missing` sur `line_items[0][price]` signifie que le `price_…` vient d'un autre mode (test ou réel) ou d'un autre bac à sable que la clé.
- **Données locales et comptes** : le store persistant porte `ownerId`. Les données d’un autre compte, ou d’origine inconnue, sont effacées à la connexion (`setOrgId`) et ne sont jamais envoyées au serveur. La déconnexion depuis « Mon compte » efface aussi les données locales. Avant ce correctif, un compte neuf récupérait les données du compte précédent sur le même navigateur.
- **Données de démonstration** : les identifiants `demo-…` (exemple boulangerie) ne sont jamais envoyés au serveur (`src/services/supabaseSync.ts`).
- **Requêtes** : 2 Mo maximum (`readBody`).
- **Invitations** : réservées aux abonnés, 20 par jour, expéditeur pris dans le compte Clerk.
- **Les écritures vers l’API doivent rester séquentielles.** `sync()` dans `src/state/store.ts` les met en file d’attente. En parallèle, une action pouvait arriver avant le risque auquel elle se rattache, et la clé étrangère était refusée. Le serveur répond désormais 409 avec un message clair sur ce cas (code Postgres 23503).
- **Le serveur masque les erreurs Stripe** derrière `Internal error`. Le détail est dans les journaux Render.
- **Stripe ne permet pas de modifier le montant d'un tarif** : il en crée un nouveau, avec un nouvel identifiant à reporter sur Render.
- **Le bypass d'authentification** s'active par `VITE_BYPASS_AUTH` : il doit rester `false` en production.
- **Les noms de variables d'offre** restent `STARTER`, `PME` et `CONSULTANTS`, alors que les noms commerciaux sont Essentiel, PME et Pro.

---

## 14. Tenir ce guide à jour

Ce guide fait partie du code. Toute modification qui change l'un des points ci-dessous doit mettre ce fichier à jour **dans le même commit** :
- nouvelle route, table, colonne ou migration ;
- variable d'environnement ajoutée, renommée ou supprimée ;
- changement d'offre, de prix ou de limite ;
- nouveau service externe ou sous-traitant ;
- nouvelle commande, nouveau test ou étape de CI ;
- changement du flux de déploiement ;
- piège rencontré en production.

Mettre à jour la date et le commit en tête de document.
