import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { pool, query } from "../../apps/web/server/db.js";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../");
const SPEC_ROOT = path.join(ROOT, "duerp_pro_spec");

dotenv.config({ path: path.join(ROOT, ".env.local") });

async function runSQL(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf-8");
  await query(sql);
}

async function seedJSONArray(table: string, rows: any[], map?: (r: any) => any) {
  if (!rows?.length) return;
  const cols = Object.keys(map ? map(rows[0]) : rows[0]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  for (const r of rows) {
    const data = map ? map(r) : r;
    const values = cols.map((c) => data[c] ?? null);
    await query(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})
       ON CONFLICT DO NOTHING`,
      values
    );
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    await query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  }

  // 1) DDL
  await runSQL(path.join(SPEC_ROOT, "db", "schema.sql"));

  // 2) Seeds référentiels
  const riskSample = JSON.parse(
    fs.readFileSync(path.join(SPEC_ROOT, "seed", "risk_catalog", "sample.json"), "utf-8")
  );
  await seedJSONArray("risk", riskSample, (r) => ({
    id: r.id,
    family: r.family,
    name: r.name,
    description: r.description ?? null,
    examples: r.examples ?? null,
    default_severity: r.default_scoring?.severity ?? null,
    default_frequency: r.default_scoring?.frequency ?? null,
    default_mastery: r.default_scoring?.mastery ?? null,
  }));

  const riskActions: Array<{ risk_id: string; action_id: string }> = [];
  const riskObligs: Array<{ risk_id: string; obligation_id: string }> = [];
  for (const r of riskSample) {
    (r.recommended_action_ids ?? []).forEach((a: string) => riskActions.push({ risk_id: r.id, action_id: a }));
    (r.legal_obligation_ids ?? []).forEach((o: string) => riskObligs.push({ risk_id: r.id, obligation_id: o }));
  }

  const actions = JSON.parse(fs.readFileSync(path.join(SPEC_ROOT, "seed", "action_catalog", "sample.json"), "utf-8"));
  await seedJSONArray(
    "action",
    actions,
    (r) => ({
      id: r.id,
      type: r.type ?? r.category ?? null,
      label: r.label ?? r.name ?? r.title ?? "",
      details: r.details ?? r.description ?? null,
    })
  );

  const obligs = JSON.parse(fs.readFileSync(path.join(SPEC_ROOT, "seed", "obligation_catalog", "sample.json"), "utf-8"));
  await seedJSONArray(
    "obligation",
    obligs,
    (r) => ({
      id: r.id,
      source: r.source ?? "NA",
      title: r.title ?? r.name ?? "",
      reference: r.reference ?? null,
      summary: r.summary ?? r.description ?? null,
    })
  );

  await seedJSONArray("risk_action", riskActions);
  await seedJSONArray("risk_obligation", riskObligs);

  const nafFiles = await fg("duerp_pro_spec/seed/naf/*.json", { cwd: ROOT, absolute: true });
  for (const nf of nafFiles) {
    const n = JSON.parse(fs.readFileSync(nf, "utf-8"));
    await seedJSONArray("naf", [n], (r) => ({
      code: r.code,
      label: r.label,
      risk_tags: r.risk_tags ?? null,
    }));
    for (const ut of n.unit_templates ?? []) {
      await seedJSONArray("unit_template", [
        {
          id: ut.id,
          naf_code: n.code,
          name: ut.name,
          description: ut.description ?? null,
          default_risk_ids: ut.default_risk_ids ?? null,
          suggested: ut.suggested ?? true,
        },
      ]);
    }
  }

  console.log("✅ DUERP bootstrap terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
