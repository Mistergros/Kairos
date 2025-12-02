# DUERP Pack v3 — Catalogues enrichis + Modificateurs d'unité + Règles conditionnelles
Généré le 2025-12-02

## Contenu
- config/risks.catalog.json (catalogue de risques étendu)
- config/actions.catalog.json (actions étendues, mappées par risk_id)
- config/obligations.catalog.json (obligations, y.c. travail de nuit, agressions)
- config/units.modifiers.json (modificateurs par unité de travail)
- config/rules/conditional.json (règles si features: solvents, cold_room, night_work, public_facing, vibrating_tools, outdoor_uv, machines)
- config/naf/*.json (exemples enrichis pour secteur)
- src/core/models/index.ts (types étendus)
- src/core/engine/risk-engine.v3.ts (moteur avec règles/feature flags)

## Exemple d'utilisation (Node/TS)
```ts
import path from 'path';
import RiskEngineV3 from './src/core/engine/risk-engine.v3';

const engine = new RiskEngineV3(path.resolve(process.cwd(), 'config'));
const ctx = {
  unity: 'Cuisine',
  nafCode: '5610A',
  features: { solvents: true, cold_room: false, public_facing: true }
};

const risks = engine.getRisksFor(ctx.nafCode, ctx.unity, ctx);
const evals = risks.map(r => engine.evaluateRisk(r, ctx));
const plan = engine.generateActionPlan(evals, ctx.nafCode, ctx);
const obligations = engine.matchObligations(ctx.nafCode, ctx);
```
