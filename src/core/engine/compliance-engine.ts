import legalReferences from "../../config/legal.references.json";
import type { ComplianceReport, Obligation } from "../models/legal";
import type { DUERP } from "../models/duerp";

interface LegalReferenceFile {
  obligations?: Obligation[];
}

const legalData = legalReferences as LegalReferenceFile;
const declaredObligations: Obligation[] = Array.isArray(legalData.obligations)
  ? (legalData.obligations as Obligation[])
  : [];

function applicableObligations(nafCode: string): Obligation[] {
  return declaredObligations.filter((obligation) => !obligation.naf_specific || obligation.naf_specific.length === 0 || obligation.naf_specific.some((code) => nafCode.startsWith(code)));
}

export function checkMissingObligations(nafCode: string, existing: Obligation[]): ComplianceReport {
  const required = applicableObligations(nafCode);
  const matched = required.filter((obligation) => existing.some((item) => item.id === obligation.id));
  const missing = required.filter((obligation) => !matched.some((m) => m.id === obligation.id));
  return { nafCode, required, matched, missing };
}

export function generateComplianceReport(duerp: DUERP): ComplianceReport {
  const obligations = duerp.risks.flatMap((risk) => risk.obligations || []);
  return checkMissingObligations(duerp.nafCode, obligations);
}
