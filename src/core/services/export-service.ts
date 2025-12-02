import type { DUERP } from "../models/duerp";
import type { ActionPlan } from "../models/action";
import { generateDuerpPdf } from "../../modules/export/pdf-generator";
import { generateActionPlanSheet } from "../../modules/export/excel-generator";

export class ExportService {
  async generatePdf(duerp: DUERP, plan?: ActionPlan): Promise<Uint8Array> {
    return generateDuerpPdf(duerp, plan);
  }

  generateExcel(duerp: DUERP, plan?: ActionPlan): string {
    return generateActionPlanSheet(duerp, plan);
  }
}
