# DUERP – moteur V4 opérationnel

## Exemple d'utilisation
```ts
import path from 'path';
import RiskEngineV4 from '@/core/engine/risk-engine.v4';

const engine = new RiskEngineV4(path.resolve(process.cwd(), 'config'));
const ctx = {
  unity: 'Cuisine',
  nafCode: '5610A',
  features: { solvents: true, public_facing: true }
};

const risks = engine.getRisksFor(ctx.nafCode, ctx.unity, ctx);
const evals = risks.map(r => engine.evaluateRisk(r, ctx));
const plan = engine.generateActionPlan(evals, ctx.nafCode, ctx);
const obligations = engine.matchObligations(ctx.nafCode, ctx);
```
