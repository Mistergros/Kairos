export interface Obligation {
  id: string;
  title: string;
  description: string;
  naf_specific?: string[];
  risk_ids?: string[];
  reference?: string;
}

export interface ComplianceReport {
  nafCode: string;
  required: Obligation[];
  matched: Obligation[];
  missing: Obligation[];
}
