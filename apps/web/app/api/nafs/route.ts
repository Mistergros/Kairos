import { query } from "../../../server/db";
import { json } from "../../../server/http";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const res = q
    ? await query(`SELECT code, label, risk_tags FROM naf WHERE label ILIKE $1 OR code ILIKE $1 ORDER BY code LIMIT 100`, [`%${q}%`])
    : await query(`SELECT code, label, risk_tags FROM naf ORDER BY code LIMIT 200`);
  return json(res.rows);
}
