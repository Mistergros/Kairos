# DUERP SaaS – Technical Blueprint  
Version 1.0 — Architecture & Specifications

This document defines the full technical, functional, and architectural blueprint
for building a professional-grade DUERP (Document Unique d'Évaluation des Risques Professionnels) SaaS.

It is intended to be read and used by GitHub Copilot / Codex inside VS Code
to generate the entire application consistently.

---

# 1. Vision & Purpose

The objective is to build a modern and modular SaaS platform that allows companies to:

1. Create a DUERP per year
2. Define units of work (unités de travail)
3. Identify hazards and risks
4. Evaluate risks via a scoring system
5. Generate recommended actions automatically using:
   - NAF-sector rules
   - legal obligations (Code du travail)
   - standardized risk catalogs
6. Track and plan actions (Gantt, Kanban, reminders)
7. Export the DUERP in PDF and Excel formats
8. Maintain a full audit trail
9. Be extendable via AI modules:
   - RAG (Retrieval-Augmented Generation)
   - recommendation agents
   - sector-specific intelligence

The core of the system is a **DUERP Core Engine**, isolated and independent from UI.

---

# 2. Global Architecture

Create the following folder structure:

```
src/
  app/
    pages/
    layout/
    api/
  core/
    models/
      duerp.ts
      risk.ts
      action.ts
      unity.ts
      legal.ts
    engine/
      risk-engine.ts
      match-engine.ts
      score-engine.ts
      recommendation-engine.ts
      compliance-engine.ts
    services/
      duerp-service.ts
      recommendation-service.ts
      export-service.ts
      audit-service.ts
    repositories/
      duerp-repo.ts
      file-repo.ts
      memory-repo.ts
  config/
    risks.catalog.json
    actions.catalog.json
    obligations.catalog.json
    legal.references.json
    scoring.json
    naf/
      47-commerce.json
      56-restauration.json
      86-sante.json
      88-action-sociale.json
  ai/
    rag.ts
    embeddings/
    knowledge-base/
      naf/
      obligations/
      risks/
    agents/
      recommendation-agent.ts
      audit-agent.ts
      sector-agent.ts
  modules/
    action-plan/
      gantt.ts
      kanban.ts
      calendar.ts
      reminders.ts
    audit/
      audit-history.ts
    export/
      pdf-generator.ts
      excel-generator.ts
  ui/
    components/
    layouts/
    dashboard/
  state/
    stores/
      duerp.store.ts
      risks.store.ts
      actions.store.ts
      settings.store.ts
specs/
  duerp-blueprint.md (this file)
```

---

# 3. Models (TypeScript Interfaces)

Copilot must generate these models inside `src/core/models`.

### `risk.ts`
```
export interface Risk {
  id: string;
  name: string;
  category: string;
  description: string;
  naf_specific?: string[];
  units?: string[];
}
```

### `action.ts`
```
export interface Action {
  id: string;
  risk_id: string;
  title: string;
  type: string;
  difficulty: string;
  cost: string;
  naf_specific?: string[];
  impact: string;
}
```

### `unity.ts`
```
export interface Unity {
  id: string;
  name: string;
  description?: string;
}
```

### `duerp.ts`
```
export interface DUERP {
  id: string;
  year: number;
  companyName: string;
  nafCode: string;
  units: Unity[];
  risks: RiskEvaluation[];
  actions: Action[];
  history: AuditRecord[];
}
```

---

# 4. DUERP Core Engine — Specifications

The core engine is the heart of the system.  
Each file inside `src/core/engine` must follow this logic.

---

## 4.1. `risk-engine.ts`

Functions:
- loadRiskCatalog()
- loadNAFMapping(nafCode)
- mergeGenericAndSectorRisks()
- getRisksFor(nafCode: string, unity: string): Risk[]

Specifications:
- Load `/config/risks.catalog.json`
- Load `/config/naf/{nafCode}.json`
- Merge risks intelligently (avoid duplicates)
- Return final list of risks for specific sector & unit

---

## 4.2. `match-engine.ts`

Functions:
- matchActions(risk: Risk): Action[]
- matchObligations(risk: Risk): Obligation[]

Loads:
- `/config/actions.catalog.json`
- `/config/obligations.catalog.json`

Rules:
- Match by `risk_id`
- Match by `naf_specific`
- Return sorted list of actions per risk

---

## 4.3. `score-engine.ts`

Scoring formula:
```
score = severity * probability * control
```

Load scoring configuration from:
```
/config/scoring.json
```

Function:
- evaluateRisk(risk: Risk, context: UnityContext): RiskEvaluation

---

## 4.4. `recommendation-engine.ts`

Responsible for generating the full action plan.

Function:
```
generateActionPlan(evaluatedRisks: RiskEvaluation[]): ActionPlan
```

Rules:
- High risk → priority actions
- NAF-specific → emphasized
- Duplicate actions merged
- Return structured plan with ordering

---

## 4.5. `compliance-engine.ts`

Functions:
- checkMissingObligations()
- generateComplianceReport()

Loads:
- `/config/legal.references.json`

Logic:
- Map sector-specific obligations
- Detect missing requirements
- Produce a compliance report

---

# 5. Config Files — Specifications

Each catalog must be standard JSON and easy to update.

---

## 5.1. `risks.catalog.json`

Example entry:
```
[
  {
    "id": "R-TMS",
    "name": "Troubles musculo-squelettiques",
    "category": "Physique",
    "description": "Tâches répétitives, postures statiques",
    "naf_specific": ["5610A", "4711D"],
    "units": ["Cuisine", "Bureau"]
  }
]
```

---

## 5.2. `actions.catalog.json`

Example:
```
[
  {
    "id": "A-TMS-POSTURE",
    "risk_id": "R-TMS",
    "type": "Technique",
    "title": "Installer un plan de prévention TMS",
    "difficulty": "Faible",
    "cost": "Faible",
    "impact": "Réduit les risques liés aux postures"
  }
]
```

---

## 5.3. NAF-specific files

Placed inside `/config/naf/`.

Example: `56-restauration.json`
```
{
  "naf": "56",
  "risks_priority": ["R-TMS", "R-CHUTE", "R-RPS"],
  "actions_recommended": ["A-TMS-POSTURE"],
  "legal_specific": ["OB-HYGIENE-RESTO"]
}
```

---

# 6. AI Module (Optional but Future-Proof)

## 6.1. `rag.ts`
Implements:
- document embedding
- vector search
- retrieval for recommendations

## 6.2. Agents

### `recommendation-agent.ts`
Enhances:
- action suggestions
- missing risks detection
- sector intelligence

### `audit-agent.ts`
Provides:
- global DUERP audit
- recommendations for improvements

### `sector-agent.ts`
Explains:
- sector-specific risks
- best practices

---

# 7. Action Plan Module

UI + logic for:
- Kanban (todo / doing / review / done)
- Gantt timeline
- Calendar reminders

---

# 8. Export Module

### PDF:
- full DUERP report
- compliance section
- risks evaluation table
- action plan

### Excel:
- risks per unit
- risks per NAF
- full action plan

---

# 9. Audit Trail

Each DUERP update creates an audit entry.

Model:
```
export interface AuditRecord {
  date: string;
  user: string;
  change: string;
}
```

---

# 10. Instructions for Copilot

Developers may invoke Copilot using:

```
Use the specs in specs/duerp-blueprint.md to generate:
- engine implementations
- services
- config loaders
- JSON catalogs
- UI components
- PDF/Excel export functions
```

Or:

```
@copilot Implement risk-engine.ts according to the DUERP blueprint.
```

Or:

```
@copilot Generate the complete folder structure described in the DUERP blueprint.
```

---

# End of Blueprint
