import type { ActionPlan } from "../../core/models/action";
import type { DUERP } from "../../core/models/duerp";

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildLines(duerp: DUERP, plan?: ActionPlan): string[] {
  const lines: string[] = [];
  lines.push(`DUERP ${duerp.companyName} - ${duerp.year}`);
  lines.push(`NAF ${duerp.nafCode} | Unites: ${duerp.units.length} | Actions: ${duerp.actions.length}`);
  lines.push(" ");
  lines.push("Unites de travail");
  duerp.units.forEach((u) => lines.push(`- ${u.name}${u.description ? ` : ${u.description}` : ""}`));
  lines.push(" ");
  lines.push("Risques evalues");
  duerp.risks.slice(0, 18).forEach((r) => {
    lines.push(`- ${r.risk.name} (${r.unity.name}) score ${r.score} / ${r.priority}`);
  });

  if (plan) {
    lines.push(" ");
    lines.push("Plan d'action priorise");
    plan.items.slice(0, 18).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.action.title} [${item.priorityScore}]`);
    });
  }

  return lines;
}

function renderPdf(lines: string[]): string {
  const streamContent = lines
    .map((line, index) => {
      const y = 780 - index * 16;
      return `BT /F1 12 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  const streamLength = streamContent.length;
  const objects: string[] = [];
  const offsets: number[] = [];
  let body = "%PDF-1.4\n";

  const pushObject = (content: string) => {
    offsets.push(body.length);
    body += `${objects.length + 1} 0 obj\n${content}\nendobj\n`;
    objects.push(content);
  };

  pushObject("<< /Type /Catalog /Pages 2 0 R >>");
  pushObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  pushObject(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
  );
  pushObject(`<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`);
  pushObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return body;
}

export function generateDuerpPdf(duerp: DUERP, plan?: ActionPlan): Uint8Array {
  const lines = buildLines(duerp, plan);
  const pdfString = renderPdf(lines);
  return new TextEncoder().encode(pdfString);
}
