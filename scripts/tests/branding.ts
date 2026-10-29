// Marque du cabinet (api/branding.ts) : nettoyage des champs et stockage,
// contre un Postgres embarqué (PGlite). Lancer : npm run test:branding
import { PGlite } from "@electric-sql/pglite";
import { BRANDING_DDL, getBranding, MAX_LOGO_DATA_URL, sanitizeBranding, saveBranding } from "../../api/branding.ts";

const db = new PGlite();
const query = (t: string, p?: unknown[]) => db.query(t, p as any[]);
await db.exec(BRANDING_DDL);

let fails = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
};

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const ok = sanitizeBranding({ name: "  Cabinet Dupont  ", color: "#1A73E8", hideKaijos: true, logo: { dataUrl: PNG, width: 300, height: 120 }, extra: "ignoré" });
check("champs valides acceptés", "branding" in ok && ok.branding.name === "Cabinet Dupont" && ok.branding.color === "#1a73e8" && ok.branding.logo?.width === 300);
check("champ inconnu ignoré", "branding" in ok && !("extra" in ok.branding));
check("couleur invalide ignorée", (() => { const r = sanitizeBranding({ color: "red; background:url(x)" }); return "branding" in r && r.branding.color === undefined; })());
check("nom tronqué à 120 caractères", (() => { const r = sanitizeBranding({ name: "x".repeat(500) }); return "branding" in r && r.branding.name?.length === 120; })());
check("logo SVG refusé", "error" in sanitizeBranding({ logo: { dataUrl: "data:image/svg+xml;base64,PHN2Zz4=", width: 10, height: 10 } }));
check("logo trop lourd refusé", "error" in sanitizeBranding({ logo: { dataUrl: "data:image/png;base64," + "A".repeat(MAX_LOGO_DATA_URL), width: 10, height: 10 } }));
check("logo sans dimensions refusé", "error" in sanitizeBranding({ logo: { dataUrl: PNG } }));
check("masquer Kaijos uniquement si true", (() => { const r = sanitizeBranding({ hideKaijos: "oui" }); return "branding" in r && r.branding.hideKaijos === false; })());

check("compte sans marque : objet vide", Object.keys(await getBranding(query, "u1")).length === 0);
if ("branding" in ok) await saveBranding(query, "u1", ok.branding);
check("marque enregistrée puis relue", (await getBranding(query, "u1")).name === "Cabinet Dupont");
await saveBranding(query, "u1", { name: "Nouveau nom" });
check("mise à jour remplace l'ancienne", (await getBranding(query, "u1")).name === "Nouveau nom" && !(await getBranding(query, "u1")).logo);
check("isolée par compte", Object.keys(await getBranding(query, "u2")).length === 0);

if (fails) {
  console.error(`${fails} scénario(s) en échec`);
  process.exit(1);
}
console.log("Tous les scénarios passent");
