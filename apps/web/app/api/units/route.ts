import { query } from "../../../server/db";
import { json } from "../../../server/http";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const id = randomUUID();
  const { companyId, name, description, headcount = 0, naf_code = null } = body;
  if (!companyId || !name) return json({ error: "companyId and name required" }, 400);
  await query(
    `INSERT INTO company_unit (id, company_id, name, description, headcount, naf_code)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, companyId, name, description ?? null, headcount, naf_code]
  );
  return json({ id, companyId, name, description, headcount, naf_code }, 201);
}
