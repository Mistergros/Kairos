import { query } from "../../../../server/db";
import { json } from "../../../../server/http";

export async function GET() {
  const res = await query(
    `SELECT id, family, name, description, examples, default_severity, default_frequency, default_mastery FROM risk ORDER BY name`
  );
  return json(res.rows);
}
