import type { ActionItem, Assessment, Establishment, VersionEntry, WorkUnit } from "../types";

// La mise à jour du DUERP est obligatoire au moins une fois par an à partir de
// 11 salariés (art. R.4121-2 du Code du travail) ; en dessous, elle reste
// recommandée et due à chaque changement important. On applique la même
// échéance de 12 mois à tous, l'alerte sert de rappel au consultant.
export const REVISION_MONTHS = 12;
// Fenêtre pendant laquelle une révision est signalée « à prévoir ».
export const REVISION_WARNING_DAYS = 30;

export type RevisionStatus = "never" | "overdue" | "soon" | "ok";

export type RevisionInfo = {
  status: RevisionStatus;
  lastVersionAt?: Date;
  dueAt?: Date;
};

const addMonths = (d: Date, months: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
};

export function revisionInfo(versionDates: Date[], now: Date = new Date()): RevisionInfo {
  if (!versionDates.length) return { status: "never" };
  const lastVersionAt = new Date(Math.max(...versionDates.map((d) => d.getTime())));
  const dueAt = addMonths(lastVersionAt, REVISION_MONTHS);
  const msLeft = dueAt.getTime() - now.getTime();
  const status: RevisionStatus =
    msLeft < 0 ? "overdue" : msLeft <= REVISION_WARNING_DAYS * 86_400_000 ? "soon" : "ok";
  return { status, lastVersionAt, dueAt };
}

export type ClientSummary = {
  key: string;
  name: string;
  establishments: Establishment[];
  workUnitCount: number;
  riskCount: number;
  openActions: number;
  lateActions: number;
  revision: RevisionInfo;
};

// Un établissement sans client renseigné est son propre client.
export const clientKeyOf = (e: Establishment) => e.clientName?.trim().toLowerCase() || `#${e.id}`;
export const clientNameOf = (e: Establishment) => e.clientName?.trim() || e.name;

const isLate = (a: ActionItem, now: Date) =>
  a.status !== "DONE" && (a.status === "LATE" || (!!a.dueDate && new Date(a.dueDate).getTime() < now.getTime()));

const STATUS_ORDER: Record<RevisionStatus, number> = { overdue: 0, never: 1, soon: 2, ok: 3 };

export function summarizeClients(
  data: {
    establishments: Establishment[];
    workUnits: WorkUnit[];
    assessments: Assessment[];
    actions: ActionItem[];
    versions: VersionEntry[];
  },
  now: Date = new Date()
): ClientSummary[] {
  const groups = new Map<string, Establishment[]>();
  for (const e of data.establishments) {
    const key = clientKeyOf(e);
    groups.set(key, [...(groups.get(key) || []), e]);
  }

  const summaries: ClientSummary[] = [];
  for (const [key, ests] of groups) {
    const estIds = new Set(ests.map((e) => e.id));
    const units = data.workUnits.filter((u) => estIds.has(u.establishmentId));
    const unitIds = new Set(units.map((u) => u.id));
    const actions = data.actions.filter((a) => estIds.has(a.establishmentId));
    // Révision du client = la plus en retard de ses établissements : chaque
    // établissement a son propre document à tenir à jour.
    const perEstablishment = ests.map((e) =>
      revisionInfo(
        data.versions.filter((v) => v.establishmentId === e.id).map((v) => new Date(v.createdAt)),
        now
      )
    );
    const revision = perEstablishment.reduce((worst, r) => {
      if (STATUS_ORDER[r.status] !== STATUS_ORDER[worst.status]) {
        return STATUS_ORDER[r.status] < STATUS_ORDER[worst.status] ? r : worst;
      }
      // À statut égal, garder l'échéance la plus proche.
      if (r.dueAt && (!worst.dueAt || r.dueAt < worst.dueAt)) return r;
      return worst;
    });
    summaries.push({
      key,
      name: clientNameOf(ests[0]),
      establishments: ests,
      workUnitCount: units.length,
      riskCount: data.assessments.filter((a) => unitIds.has(a.workUnitId)).length,
      openActions: actions.filter((a) => a.status !== "DONE").length,
      lateActions: actions.filter((a) => isLate(a, now)).length,
      revision,
    });
  }

  return summaries.sort(
    (a, b) =>
      STATUS_ORDER[a.revision.status] - STATUS_ORDER[b.revision.status] ||
      (a.revision.dueAt?.getTime() ?? 0) - (b.revision.dueAt?.getTime() ?? 0) ||
      a.name.localeCompare(b.name, "fr")
  );
}
