# DUERP – Vue d’ensemble, specs produit, architecture et opérations

Document unique pour produit/dev/ops. Version extrêmement détaillée et précise.

## 1. Objectif produit et périmètre
- SaaS DUERP multi-tenant : inventorier, coter, planifier et tracer les actions de prévention.
- Génération/assistance IA (dès plan Pro) : risques proposés par NAF/activité, détection d’incohérences, suggestions d’actions.
- Conformité : obligations Code du Travail, exports DUERP (PDF/Excel), historique annuel (versions), audit (qui/quoi/quand).
- Cibles : TPE/PME/ETI et cabinets (licence consultants).

## 2. Architecture applicative
- Front (Vite + React + TS) : pages dans `src/pages/**`, état global Zustand (`src/state/store.ts`), composants réutilisables (`src/components`).
- Noyau métier `src/core` : modèles (`core/models`), moteurs (`risk-engine.v3.ts`, `risk-engine.v4.ts`, `match-engine.ts`, `recommendation-engine.ts`, `compliance-engine.ts`, `score-engine.ts`).
- Configs :
  - Front/V3 : `src/config/**` (catalogues compacts, rules, scoring, templates unités).
  - API/V4 : `config/**` (risques/actions par fichier, obligations, NAF, rules/conditional, modifiers, schemas).
  - Bundle front (V4 -> V3) : `npm run config:build:front` => `src/config_generated/bundle.json`.
- API locale : `api/server.ts` (HTTP 8787), accès DB (Postgres) via `apps/web/server/db.ts`.
- Landing marketing isolée : `apps/web/app/(marketing)/landing/page.tsx` (pas de sidebar/topbar). Dashboard SPA : routes Vite (`src/App.tsx`).

## 3. Modèle de données (Postgres)
- Référentiels : `naf (code,label,risk_tags)`, `unit_template (naf_code,name,default_risk_ids,suggested)`, `risk`, `action`, `obligation`.
- Liaisons : `risk_action`, `risk_obligation`, `activity_scoring (activity,risk_id,severity,frequency,control)`.
- Métier : `company_unit (tenant_id, name, naf_code, headcount)`, `unit_risk_assessment (tenant_id, risk_id, scores, context, existing_measures)`, `corrective_action (tenant_id, assessment_id, action_id, owner, due_date, status, attachments, comments)`.
- Meta : `_migrations`, `_config_version` (hash/versions de config).

## 4. Catalogues et paramétrage (JSON)
- Front/V3 (`src/config`) :
  - `risks.catalog.json`, `actions.catalog.json`, `obligations.catalog.json`
  - `naf.catalog.json`, `unit_templates.json`
  - `scoring.json`, `scoring.activity.json`, `rules/activity.rules.json`, `units/modifiers.ext.json`
- API/V4 (`config`) :
  - `risks/*.json` (1 par risque), `actions/*.json` (actions par risque)
  - `obligations/general.json`, `obligations/sector.json`
  - `naf/*.json` (profils : risks_priority/mandatory, actions_recommended, extra_risks/actions)
  - `rules/conditional.json` (conditions -> add_risks/add_actions/add_obligations)
  - `units/modifiers.json`, `scoring.json`, `schema/*.schema.json`
- Build bundle front : `npm run config:build:front` -> `src/config_generated/bundle.json`.
- Validation : `npm run config:validate` (schemas `config/schema/*.json`).

## 5. Moteurs et algorithmes
### V3 (front) – `src/core/engine/risk-engine.v3.ts`
- Entrées : nafCode, unity, activity, features, tags, measurements.
- Risques : base + profil NAF + `rules/activity.rules.json` + features; filtre naf_specific/unity; tri par `risks_priority`.
- Scoring : socle `scoring.activity.json` (default 7/6/1) + modifiers ext + boosts features (borne 1..10). Score = sev*prob*control. Priorités H/M/B (critical>=80, high>=50, medium>=25).
- Actions : filtrage par risk_id/naf/features/rules, dédup, tri par score.
- Obligations : filtrage par naf/risk + add_obligations (rules/features).
- Sortie compute : {risks, evaluations, plan, obligations}.

### V4 (API/back) – `src/core/engine/risk-engine.v4.ts`
- Sources : `config/` (risques, actions par risque, obligations, naf, rules/conditional, modifiers, scoring).
- Risques : mandatory/prioritaires NAF + add_risks rules; fallback si vide (R-ECRAN, R-RPS, R-INCENDIE).
- Scoring : échelles 1..5 (sev/prob/freq/control base 3/3/2/2) + modifiers unité + ctx.modifiers; clamp; Score = sev*prob*freq*control.
- Actions : mapping direct par risk_id.
- Obligations : general + sector + add_obligations rules/features, dédup par id.
- Plan : poids = somme des scores des risques reliés; priorités Haute>=200, Moyenne>=100 sinon Basse; tri descendant.

### Engines complémentaires
- `match-engine.ts` : association risques -> actions/obligations.
- `recommendation-engine.ts` : plan structuré (dedupe/ordonnancement).
- `compliance-engine.ts` : écarts réglementaires.
- `score-engine.ts` : formule générique.

## 6. Auth, multi-tenant, sécurité
- Auth API : token statique (`API_TOKEN` ou rôles `API_TOKEN_ADMIN|MANAGER|CONTRIB|VIEW`) ou JWT HS256 (`API_JWT_SECRET`, claims `role`, `tenant|tid`).
- Multi-tenant : `tenant_id` sur units/assessments/actions-plan, header `X-Tenant-Id` si `API_REQUIRE_TENANT=true`.
- RBAC : routes métier exigent contrib ou plus; viewer lecture; admin/manager écriture complète.
- CORS : `API_ALLOWED_ORIGINS` (liste virgules).
- Rate limit : `API_RATE_LIMIT` (req/min, 0=off).
- Sécurité données : privilégier UTF-8 sans BOM dans les JSON; exports PDF conformes; sauvegardes chiffrées (côté infra).

## 7. API (local HTTP)
- Port : 8787 (ou `API_PORT`).
- Endpoints (auth si activée) :
  - `GET /api/catalog/risks|actions|obligations`
  - `GET /api/nafs?q=` et `/api/nafs/{code}` (profil NAF + unit_templates)
  - `GET /api/units`, `/api/assessments`, `/api/actions-plan` (filtrés tenant)
  - `POST /api/evaluate` (moteur V4) : ctx -> {risks, evaluations, plan, obligations}
- Proxy front : `VITE_DUERP_API_BASE` + `VITE_USE_REMOTE_ENGINE=true` pour consommer `/api/evaluate`.

## 8. Parcours produit (front SPA)
- Units : création établissements/unités, affectation NAF/activité/features, templates NAF.
- Inventory : préremplissage risques par NAF, ajustement G/F/C, mesures existantes/proposées, filtres.
- Action Plan : actions dédupliquées, priorité, owner, dates, statut (TO_DO/IN_PROGRESS/DONE/LATE), vues liste/frise Gantt.
- Exports : stubs PDF/Excel.
- Versions : snapshots (`store.createVersion`) pour audit/DUERP annuel.

## 9. Landing marketing
- Route SPA : `/landing` (sans sidebar/topbar), fichier `src/pages/Landing.tsx`.
- Contenu : hero + CTA (/signup, #pricing), KPI, valeur (Analyser/Agir/Suivre), bénéfices/ROI, étapes, social proof, sécurité, tarifs (3 cartes style existant), FAQ, footer.

## 10. Commandes utiles
- Install : `npm install`
- Dev (SPA Vite) : `npm run dev` (port loggué par Vite, ex 5173)  
  - Dashboard : `/` ; Landing : `/landing`
- Build : `npm run build`
- Config bundle front : `npm run config:build:front`
- Validation config : `npm run config:validate`
- Smoke API : `npm run test:api:smoke` ; Intégration API : `npm run test:api:integration`
- Typecheck : `npx tsc --noEmit`

## 11. Variables d’environnement (principales)
- Front : `VITE_DUERP_API_BASE`, `VITE_USE_REMOTE_ENGINE=true`, `VITE_DUERP_API_TOKEN`, `VITE_DUERP_TENANT_ID`.
- API : `API_TOKEN` ou `API_TOKEN_*`, `API_JWT_SECRET`, `API_REQUIRE_TENANT=true`, `API_ALLOWED_ORIGINS`, `API_RATE_LIMIT`, `API_PORT`.
- DB : `DATABASE_URL` (Postgres, ajouter `?sslmode=require` si besoin).

## 12. Règles d’édition et qualité
- JSON en UTF-8 (pas de CP1252, pas de BOM).
- Ne pas mélanger les jeux de config : `src/config/**` (V3/front) vs `config/**` (V4/API).
- Après modification des JSON, regénérer le bundle front (`npm run config:build:front`) et, si DB utilisée, rejouer le bundle/migrations.
- Valider avec `npm run config:validate` avant commit.

## 13. Checklist rapide
1. `.env.local` : API base, token, tenant, CORS, rate limit, DB.
2. `npm run config:build:front`.
3. `npm run dev` et tester `/` et `/landing`.
4. Vérif encodage optionnelle : `Select-String -Path src/config_generated/bundle.json -Pattern "Ã" -SimpleMatch`.
5. Tests : `npm run config:validate`, `npm run test:api:smoke`.
