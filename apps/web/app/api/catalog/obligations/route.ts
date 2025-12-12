import { query } from "../../../../server/db";
import { json } from "../../../../server/http";

export async function GET() {
  const res = await query(`SELECT id, source, title, reference, summary FROM obligation ORDER BY source, title`);
  return json(res.rows);
}
