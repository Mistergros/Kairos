import { query } from "../../../../server/db";
import { json } from "../../../../server/http";

export async function GET() {
  const res = await query(`SELECT id, type, label, details FROM action ORDER BY label`);
  return json(res.rows);
}
