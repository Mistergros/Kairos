const fs = require("fs");
const path = require("path");
const readline = require("readline");
const fg = require("fast-glob");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

const ROOT = process.cwd();
const SPEC_ROOT = path.join(ROOT, "duerp_pro_spec");

async function runSQL(filePath) {
  const sql = fs.readFileSync(filePath, "utf-8");
  await query(sql);
}

async function seedJSONArray(table, rows, map) {
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

function askConfirmation(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    let host = "?";
    let dbName = "?";
    try {
      const url = new URL(connectionString);
      host = url.hostname;
      dbName = url.pathname.replace(/^\//, "");
    } catch {
      // connectionString non-standard, on garde les valeurs par defaut "?"
    }
    console.log("\n⚠️  ATTENTION — vous etes sur le point de SUPPRIMER TOUTES LES DONNEES de cette base :");
    console.log(`   Hote : ${host}`);
    console.log(`   Base : ${dbName}`);
    console.log("\nSi cette base contient des donnees de vrais clients (production), NE CONTINUEZ PAS.\n");
    const answer = await askConfirmation(`Tapez le nom de la base ("${dbName}") pour confirmer la suppression : `);
    if (answer.trim() !== dbName) {
      console.error("\nConfirmation incorrecte — operation annulee, aucune donnee supprimee.");
      process.exit(1);
    }
    await query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  }

  await runSQL(path.join(SPEC_ROOT, "db", "schema.sql"));

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

  const riskActions = [];
  const riskObligs = [];
  for (const r of riskSample) {
    (r.recommended_action_ids ?? []).forEach((a) => riskActions.push({ risk_id: r.id, action_id: a }));
    (r.legal_obligation_ids ?? []).forEach((o) => riskObligs.push({ risk_id: r.id, obligation_id: o }));
  }

  const actions = JSON.parse(fs.readFileSync(path.join(SPEC_ROOT, "seed", "action_catalog", "sample.json"), "utf-8"));
  const actionsById = new Map();
  await seedJSONArray(
    "action",
    actions,
    (r) => {
      const row = {
        id: r.id,
        type: r.type ?? r.category ?? null,
        label: r.label ?? r.name ?? r.title ?? "",
        details: r.details ?? r.description ?? null,
      };
      actionsById.set(r.id, true);
      return row;
    }
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

  const filteredRiskActions = riskActions.filter((ra) => actionsById.has(ra.action_id));
  await seedJSONArray("risk_action", filteredRiskActions);
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
