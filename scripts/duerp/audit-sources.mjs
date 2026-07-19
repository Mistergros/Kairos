// Revue périodique du sourcing du catalogue de risques (voir REFERENTIELS.md).
// Signale : sources manquantes, sources génériques non traçables (juste un
// nom d'organisme), entrées sans lien vérifiable, et entrées dont la
// vérification a plus d'un an.
// Usage : npm run duerp:sources:audit
//         npm run duerp:sources:audit -- --check-links   (vérifie aussi que les liens répondent)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const STALE_DAYS = 365;
const CHECK_LINKS = process.argv.includes("--check-links");

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
    urls: d.sourceUrls,
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
  const sourceUrl = block.match(/sourceUrl:\s*"([^"]*)"/)?.[1];
  const verified = block.match(/source_verified:\s*'([^']+)'/)?.[1];
  if (id) rows.push({ from: "riskLibrary.ts", id, name: risk, sources: source ? [source] : [], urls: sourceUrl ? [sourceUrl] : [], verified });
}

const missing = rows.filter((r) => !r.sources || !r.sources.length);
const generic = rows.filter((r) => r.sources?.length && isGeneric(r.sources));
const stale = rows.filter((r) => r.verified && daysSince(r.verified) > STALE_DAYS);
const neverVerified = rows.filter((r) => !r.verified);
const noLink = rows.filter((r) => r.sources?.length && !(r.urls || []).some((u) => u));

console.log(`Audit du sourcing — ${rows.length} risques au total\n`);
console.log(`Sans aucune source            : ${missing.length}`);
console.log(`Source générique (pas de n° de document) : ${generic.length}`);
console.log(`Sans lien vérifiable          : ${noLink.length}`);
console.log(`Jamais vérifiées              : ${neverVerified.length}`);
console.log(`Vérifiées il y a plus d'un an : ${stale.length}`);

if (missing.length) {
  console.log("\n--- Sans source ---");
  missing.forEach((r) => console.log(`  ${r.id} (${r.from}) — ${r.name}`));
}
if (noLink.length) {
  console.log("\n--- Sans lien (source citée mais pas d'URL) ---");
  noLink.forEach((r) => console.log(`  ${r.id} (${r.from}) — ${r.name}`));
}
if (stale.length) {
  console.log("\n--- À revérifier (> 1 an) ---");
  stale.forEach((r) => console.log(`  ${r.id} (${r.from}) — dernière vérif. ${r.verified}`));
}

if (CHECK_LINKS) {
  const uniqueUrls = [...new Set(rows.flatMap((r) => (r.urls || []).filter(Boolean)))];
  console.log(`\n--- Vérification de ${uniqueUrls.length} lien(s) unique(s) (--check-links) ---`);
  const results = await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        let res = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (!res.ok && res.status === 405) res = await fetch(url, { method: "GET", redirect: "follow" });
        return { url, ok: res.ok, status: res.status };
      } catch (e) {
        return { url, ok: false, status: "erreur réseau: " + e.message };
      }
    })
  );
  const broken = results.filter((r) => !r.ok);
  if (broken.length) {
    console.log(`\n${broken.length} lien(s) cassé(s) ou inaccessible(s) :`);
    broken.forEach((r) => console.log(`  [${r.status}] ${r.url}`));
    if (broken.some((r) => r.url.includes("legifrance.gouv.fr"))) {
      console.log(
        "\nNote : legifrance.gouv.fr bloque systématiquement les requêtes automatisées (403 même avec un\n" +
        "en-tête de navigateur) — un 403 sur ce domaine ne veut pas dire que le lien est mort, il faut le\n" +
        "vérifier manuellement dans un vrai navigateur avant de le considérer comme cassé."
      );
    }
  } else {
    console.log("Tous les liens répondent correctement.");
  }
}
