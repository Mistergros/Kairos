// Revue périodique du sourcing du catalogue de risques (voir REFERENTIELS.md).
// Signale : sources manquantes, sources génériques non traçables (juste un
// nom d'organisme), et entrées dont la vérification a plus d'un an.
// Usage : npm run duerp:sources:audit
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const STALE_DAYS = 365;

const isGeneric = (sources) =>
  !sources || !sources.length || sources.every((s) => !/\d/.test(s)); // pas de numéro de document = probablement générique

const daysSince = (dateStr) => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
};

const rows = [];

// 1. Catalogue V4 (config/risks/*.json)
const risksDir = path.join(ROOT, "config", "risks");
for (const f of fs.readdirSync(risksDir).filter((f) => f.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(risksDir, f), "utf-8"));
  rows.push({
    from: "config/risks/" + f,
    id: d.id,
    name: d.name,
    sources: d.sources,
    verified: d.sources_verified,
  });
}

// 2. Bibliothèque générique (src/data/riskLibrary.ts) — extraction simple par regex,
// suffisant pour un audit (pas besoin de compiler le TS ici).
const libPath = path.join(ROOT, "src", "data", "riskLibrary.ts");
const libSrc = fs.readFileSync(libPath, "utf-8");
// Chaque entrée est un bloc `{ ... },` — on découpe puis on cherche les
// champs indépendamment dans chaque bloc (évite les pièges des quantifieurs
// paresseux avec des champs optionnels sur un regex global).
const blocks = libSrc.split(/\n {2}\{/).slice(1);
for (const block of blocks) {
  const id = block.match(/id:\s*'([^']+)'/)?.[1];
  const risk = block.match(/risk:\s*'([^']+)'/)?.[1];
  const source = block.match(/source:\s*"([^"]*)"/)?.[1];
  const verified = block.match(/source_verified:\s*'([^']+)'/)?.[1];
  if (id) rows.push({ from: "riskLibrary.ts", id, name: risk, sources: source ? [source] : [], verified });
}

const missing = rows.filter((r) => !r.sources || !r.sources.length);
const generic = rows.filter((r) => r.sources?.length && isGeneric(r.sources));
const stale = rows.filter((r) => r.verified && daysSince(r.verified) > STALE_DAYS);
const neverVerified = rows.filter((r) => !r.verified);

console.log(`Audit du sourcing — ${rows.length} risques au total\n`);
console.log(`Sans aucune source        : ${missing.length}`);
console.log(`Source générique (pas de n° de document) : ${generic.length}`);
console.log(`Jamais vérifiées          : ${neverVerified.length}`);
console.log(`Vérifiées il y a plus d'un an : ${stale.length}`);

if (missing.length) {
  console.log("\n--- Sans source ---");
  missing.forEach((r) => console.log(`  ${r.id} (${r.from}) — ${r.name}`));
}
if (stale.length) {
  console.log("\n--- À revérifier (> 1 an) ---");
  stale.forEach((r) => console.log(`  ${r.id} (${r.from}) — dernière vérif. ${r.verified}`));
}
