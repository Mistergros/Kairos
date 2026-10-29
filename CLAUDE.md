# Consignes pour les agents (Claude Code et autres)

Lire `docs/GUIDE-MAINTENEUR.md` avant toute modification : il décrit l'architecture, le déploiement, les migrations et les pièges connus de ce dépôt.

## Documentation à tenir à jour

Toute modification qui touche l'un des points de la section « Tenir ce guide à jour » de `docs/GUIDE-MAINTENEUR.md` doit mettre ce guide à jour dans le même commit :
- routes, tables, colonnes, migrations ;
- variables d'environnement ;
- offres, prix, limites ;
- services externes ;
- commandes, tests, CI ;
- déploiement ;
- pièges rencontrés.

Mettre à jour la date et le commit en tête du guide. Si un changement concerne un service externe vu par le propriétaire du projet (coût, configuration pas à pas), mettre aussi à jour `ARCHITECTURE.md`.

## Règles du dépôt

- Garder alignés `PLAN_LIMITS` (`api/server.ts`), `PLAN_CONFIG` (`src/hooks/usePlan.ts`), `src/data/pricing.json` et `PRICING_PLANS` (`src/pages/Landing.tsx`).
- Toute nouvelle colonne ou table : une fonction `ensure…` idempotente dans `api/server.ts`, appelée par chaque route qui en dépend, et une entrée dans `duerp_pro_spec/db/schema.sql`.
- Avant de commiter : `npx tsc -b`, `npm run config:validate`, `npm run test:slots`, `npm run test:branding`, `npm run build`. Puis `git checkout -- vite.config.js vite.config.d.ts`, que `tsc -b` régénère.
- Les fichiers sont en CRLF : gérer `\r\n` dans les scripts de remplacement.
- Ne jamais pousser sur `master` (production) sans l'accord du propriétaire.
- Langue du produit, des commentaires et des messages : français.
