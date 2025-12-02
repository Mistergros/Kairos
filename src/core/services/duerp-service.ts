import { getRisksFor } from "../engine/risk-engine";
import { matchActions, matchObligations } from "../engine/match-engine";
import { evaluateRisk } from "../engine/score-engine";
import { generateActionPlan } from "../engine/recommendation-engine";
import { checkMissingObligations } from "../engine/compliance-engine";
import type { Action, ActionPlan } from "../models/action";
import type { ComplianceReport } from "../models/legal";
import type { DUERP, RiskEvaluation } from "../models/duerp";
import type { Unity, UnityContext } from "../models/unity";
import type { DUERPRepository } from "../repositories/duerp-repo";
import { MemoryRepository } from "../repositories/memory-repo";
import { RiskEngineV3, type RiskEngineV3Input } from "../engine/risk-engine.v3";
import type { RiskPriority } from "../models/duerp";

export interface DUERPGenerationOptions {
  companyName: string;
  year: number;
  nafCode: string;
  units: Unity[];
  contextByUnit?: Record<string, Partial<UnityContext>>;
}

export interface DUERPBundle {
  duerp: DUERP;
  actionPlan: ActionPlan;
  compliance: ComplianceReport;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `duerp-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultContext(unit: Unity): UnityContext {
  return {
    unity: unit,
    severity: 5,
    probability: 5,
    control: 1,
  };
}

export class DUERPService {
  constructor(private repository: DUERPRepository = new MemoryRepository()) {}

  generate(options: DUERPGenerationOptions): DUERPBundle {
    const evaluations: RiskEvaluation[] = [];

    options.units.forEach((unit) => {
      const context = {
        ...defaultContext(unit),
        ...(options.contextByUnit?.[unit.id] || {}),
      };

      const risks = getRisksFor(options.nafCode, unit.name);
      risks.forEach((risk) => {
        const evaluation = evaluateRisk(risk, context);
        evaluation.matchedActions = matchActions(risk, options.nafCode);
        evaluation.obligations = matchObligations(risk, options.nafCode);
        evaluations.push(evaluation);
      });
    });

    const actions = this.collectActions(evaluations);
    const actionPlan = generateActionPlan(evaluations, options.nafCode);
    const compliance = checkMissingObligations(
      options.nafCode,
      evaluations.flatMap((r) => r.obligations || [])
    );

    const duerp: DUERP = {
      id: createId(),
      year: options.year,
      companyName: options.companyName,
      nafCode: options.nafCode,
      units: options.units,
      risks: evaluations,
      actions,
      history: [
        {
          date: new Date().toISOString(),
          user: "system",
          change: "DUERP genere par le moteur core",
        },
      ],
      actionPlan,
    };

    this.repository.save(duerp);
    return { duerp, actionPlan, compliance };
  }

  private collectActions(evaluations: RiskEvaluation[]): Action[] {
    const map = new Map<string, Action>();
    evaluations.forEach((evaluation) => {
      (evaluation.matchedActions || []).forEach((action) => {
        if (!map.has(action.id)) {
          map.set(action.id, action);
        }
      });
    });
    return Array.from(map.values());
  }
}

export class DuerpService {
  private engine = new RiskEngineV3();

  private priorityLetter(priority: RiskPriority): "H" | "M" | "B" {
    if (priority === "critical" || priority === "high") return "H";
    if (priority === "medium") return "M";
    return "B";
  }

  getRisks(input: RiskEngineV3Input) {
    return this.engine.getRisks(input);
  }

  evaluate(input: RiskEngineV3Input) {
    return this.engine.evaluate(input).map((evaluation) => ({
      ...evaluation,
      priorityLetter: this.priorityLetter(evaluation.priority),
    }));
  }

  plan(input: RiskEngineV3Input | RiskEvaluation[]) {
    const evaluations = Array.isArray(input) ? (input as RiskEvaluation[]) : this.engine.evaluate(input);
    return this.engine.plan(evaluations, Array.isArray(input) ? undefined : input.nafCode);
  }

  obligations(input: RiskEngineV3Input) {
    return this.engine.obligations(input);
  }
}
