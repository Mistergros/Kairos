import { query } from "../../../../server/db";
import { json } from "../../../../server/http";

export async function GET(_: Request, { params }: { params: { code: string } }) {
  const { code } = params;
  const naf = await query(`SELECT code, label, risk_tags FROM naf WHERE code = $1`, [code]);
  if (naf.rowCount === 0) return json({ error: "NAF not found" }, 404);
  const unitTemplates = await query(
    `SELECT id, name, description, default_risk_ids, suggested FROM unit_template WHERE naf_code = $1 ORDER BY suggested DESC, name ASC`,
    [code]
  );
  return json({ ...naf.rows[0], unit_templates: unitTemplates.rows });
}
