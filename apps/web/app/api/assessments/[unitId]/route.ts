import { query } from "../../../../server/db";
import { json } from "../../../../server/http";
import { randomUUID } from "crypto";

export async function PUT(req: Request, { params }: { params: { unitId: string } }) {
  const { unitId } = params;
  const body = await req.json(); // { risks: [ { risk_id, context, existing_measures, severity, frequency, mastery, actions: [...] } ] }
  if (!Array.isArray(body?.risks)) return json({ error: "risks array required" }, 400);

  await query(`DELETE FROM corrective_action WHERE assessment_id IN (SELECT id FROM unit_risk_assessment WHERE unit_id=$1)`, [unitId]);
  await query(`DELETE FROM unit_risk_assessment WHERE unit_id=$1`, [unitId]);

  for (const r of body.risks) {
    const assessId = randomUUID();
    await query(
      `INSERT INTO unit_risk_assessment (id, unit_id, risk_id, context, existing_measures, severity, frequency, mastery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [assessId, unitId, r.risk_id, r.context ?? null, r.existing_measures ?? null, r.severity, r.frequency, r.mastery]
    );
    for (const a of r.actions ?? []) {
      await query(
        `INSERT INTO corrective_action (id, assessment_id, action_id, owner, due_date, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), assessId, a.action_id, a.owner ?? null, a.due_date ?? null, a.status ?? "todo"]
      );
    }
  }

  return json({ ok: true });
}
