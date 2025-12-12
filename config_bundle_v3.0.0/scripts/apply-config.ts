
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";
import { fileURLToPath } from "url";

type SeedRow = Record<string, any>;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function readJSON(p: string): any {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function listMigrations(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".sql"))
    .sort((a,b)=> a.localeCompare(b));
}

async function ensureMetaTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS _config_version (
        id BIGSERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        hash TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

async function applyMigrations(migrationsDir: string, reset = false) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (reset) {
      console.warn("⚠️  RESET demandé : suppression des tables de paramétrage (hors données métier).");
      await client.query(`
        DROP TABLE IF EXISTS activity_scoring CASCADE;
        DROP TABLE IF EXISTS unit_template CASCADE;
        DROP TABLE IF EXISTS naf CASCADE;
        DROP TABLE IF EXISTS risk CASCADE;
        DROP TABLE IF EXISTS action CASCADE;
        DROP TABLE IF EXISTS obligation CASCADE;
      `);
    }

    const files = listMigrations(migrationsDir);
    const res = await client.query<{filename:string}>(`SELECT filename FROM _migrations`);
    const done = new Set(res.rows.map(r => r.filename));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query(sql);
      await client.query(`INSERT INTO _migrations(filename) VALUES ($1) ON CONFLICT DO NOTHING`, [file]);
      console.log(`✅ Migration appliquée: ${file}`);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Échec migration:", e);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function upsert(table: string, rows: SeedRow[], conflictCols: string[], updateCols?: string[]) {
  if (!rows?.length) return 0;
  const client = await pool.connect();
  try {
    let count = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((_, i) => `$${i+1}`);
      const updates = (updateCols ?? cols.filter(c => !conflictCols.includes(c)))
        .map((c) => `${c}=EXCLUDED.${c}`)
        .join(", ");
      const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${vals.join(",")})
        ON CONFLICT (${conflictCols.join(",")}) DO UPDATE SET ${updates}`;
      await client.query(sql, cols.map(c => row[c]));
      count++;
    }
    return count;
  } finally {
    client.release();
  }
}

async function ensureActivityScoringTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_scoring (
        id BIGSERIAL PRIMARY KEY,
        activity TEXT NOT NULL,
        risk_id TEXT NOT NULL REFERENCES risk(id) ON DELETE CASCADE,
        severity INT CHECK (severity BETWEEN 0 AND 5),
        frequency INT CHECK (frequency BETWEEN 0 AND 5),
        control INT CHECK (control BETWEEN -5 AND 5) DEFAULT 0,
        UNIQUE(activity, risk_id)
      );
    `);
  } finally {
    client.release();
  }
}

function computeBundleHash(seedsDir: string): string {
  const h = crypto.createHash("sha256");
  const files = ["risks.json","actions.json","obligations.json","naf.json","unit_templates.json","scoring.activity.json"];
  for (const f of files) {
    const p = path.join(seedsDir, f);
    const buf = fs.readFileSync(p);
    h.update(buf);
  }
  return h.digest("hex");
}

async function writeConfigVersion(version: string, hash: string) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO _config_version(version, hash) VALUES ($1,$2)`,
      [version, hash]
    );
    console.log(`🧾 _config_version enregistré: v${version} (${hash.slice(0,8)}…)`);
  } finally {
    client.release();
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const bundleRoot = path.resolve(__dirname, "..");
  const migrationsDir = path.join(bundleRoot, "migrations");
  const seedsDir = path.join(bundleRoot, "seeds");

  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const versionFlagIdx = args.findIndex(a => a === "--version");
  const hashFlagIdx = args.findIndex(a => a === "--hash");
  const version = versionFlagIdx >= 0 ? (args[versionFlagIdx+1] ?? "0.0.0") : (process.env.CONFIG_VERSION ?? "0.0.0");
  const manualHash = hashFlagIdx >= 0 ? (args[hashFlagIdx+1] ?? "") : "";

  await ensureMetaTables();
  await applyMigrations(migrationsDir, reset);

  const risks = readJSON(path.join(seedsDir, "risks.json"));
  const actions = readJSON(path.join(seedsDir, "actions.json"));
  const obligations = readJSON(path.join(seedsDir, "obligations.json"));
  const nafs = readJSON(path.join(seedsDir, "naf.json"));
  const unitTemplates = readJSON(path.join(seedsDir, "unit_templates.json"));
  const activityScoring = readJSON(path.join(seedsDir, "scoring.activity.json"));

  const nRisk = await upsert("risk", risks, ["id"]);
  const nAct = await upsert("action", actions, ["id"]);
  const nObl = await upsert("obligation", obligations, ["id"]);
  const nNaf = await upsert("naf", nafs, ["code"]);
  const nUT = await upsert("unit_template", unitTemplates, ["id"]);

  await ensureActivityScoringTable();
  const nAS = await upsert("activity_scoring", activityScoring, ["activity","risk_id"]);

  console.log(`📦 Upserts: risk=${nRisk}, action=${nAct}, obligation=${nObl}, naf=${nNaf}, unit_template=${nUT}, activity_scoring=${nAS}`);

  const hash = manualHash || computeBundleHash(seedsDir);
  await writeConfigVersion(version, hash);
  console.log("✅ Configuration DUERP appliquée.");
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(async () => { await pool.end(); });
