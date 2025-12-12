import fs from "fs";
import path from "path";
import fg from "fast-glob";
import crypto from "crypto";

type Json = Record<string, any>;

const ROOT = process.cwd();
const CONFIG_DIR = path.join(ROOT, "config");
const OUT_DIR = path.join(ROOT, "src", "config_generated");

function readJSON<T = any>(p: string): T {
  const raw = fs
    .readFileSync(p, "utf-8")
    .replace(/^\uFEFF/, "")
    .replace(/^\u00EF\u00BB\u00BF/, "");
  return JSON.parse(raw) as T;
}

function hashFiles(files: string[]) {
  const h = crypto.createHash("sha256");
  files.sort().forEach((file) => {
    h.update(file);
    h.update(fs.readFileSync(file));
  });
  return h.digest("hex");
}

async function buildRisks() {
  const files = await fg("config/risks/*.json", { cwd: ROOT, absolute: true });
  const risks = files.map((p) => readJSON<Json>(p));
  return { risks, files };
}

async function buildActions() {
  const files = await fg("config/actions/*.json", { cwd: ROOT, absolute: true });
  const actions = files.flatMap((p) => readJSON<Json[]>(p));
  return { actions, files };
}

async function buildObligations() {
  const generalPath = path.join(CONFIG_DIR, "obligations", "general.json");
  const sectorPath = path.join(CONFIG_DIR, "obligations", "sector.json");
  const obligations = [...readJSON<Json[]>(generalPath), ...readJSON<Json[]>(sectorPath)];
  return { obligations, files: [generalPath, sectorPath] };
}

async function buildNaf() {
  const files = await fg("config/naf/*.json", { cwd: ROOT, absolute: true });
  const naf = files.map((p) => readJSON<Json>(p));
  return { naf, files };
}

async function main() {
  const { risks, files: riskFiles } = await buildRisks();
  const { actions, files: actionFiles } = await buildActions();
  const { obligations, files: obligationFiles } = await buildObligations();
  const { naf, files: nafFiles } = await buildNaf();

  const scoringPath = path.join(CONFIG_DIR, "scoring.json");
  const rulesConditionalPath = path.join(CONFIG_DIR, "rules", "conditional.json");
  const modifiersPath = path.join(CONFIG_DIR, "units", "modifiers.json");

  const scoring = readJSON<Json>(scoringPath);
  const rulesConditional = readJSON<Json>(rulesConditionalPath);
  const unitsModifiers = readJSON<Json>(modifiersPath);

  const sourceFiles = [
    ...riskFiles,
    ...actionFiles,
    ...obligationFiles,
    ...nafFiles,
    scoringPath,
    rulesConditionalPath,
    modifiersPath,
  ];
  const sourceHash = hashFiles(sourceFiles);

  const bundle = {
    metadata: {
      builtAt: new Date().toISOString(),
      sourceHash,
      files: sourceFiles.length,
    },
    risks,
    actions,
    obligations,
    naf,
    scoring,
    rulesConditional,
    unitsModifiers,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "bundle.json"), JSON.stringify(bundle, null, 2), "utf-8");
  fs.writeFileSync(
    path.join(OUT_DIR, "README.md"),
    [
      "# config_generated",
      "",
      "Bundle auto-genere a partir de `config/` (moteur V4) pour alimenter le front (moteur V3).",
      "",
      "- Ne pas editer a la main.",
      "- Regenerer avec : `npm run config:build:front`.",
      "- Contenu : risks, actions, obligations, naf, scoring, rulesConditional, unitsModifiers, metadata.",
    ].join("\n"),
    "utf-8"
  );
  console.log("OK - bundle front genere dans src/config_generated/bundle.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
