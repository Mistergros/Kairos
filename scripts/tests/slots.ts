// Scénarios des quotas sur 12 mois (api/slots.ts) contre un Postgres embarqué (PGlite).
// Lancer : npm run test:slots
import { PGlite } from "@electric-sql/pglite";
import { checkEstablishmentLimits, recordSlots, SLOT_LOG_DDL } from "../../api/slots.ts";

const db = new PGlite();
const query = (t: string, p?: unknown[]) => db.query(t, p as any[]);
await db.exec(`CREATE TABLE establishments (id TEXT PRIMARY KEY, org_id TEXT, name TEXT, siret TEXT, client_name TEXT);`);
await db.exec(SLOT_LOG_DDL);

const ESSENTIEL = { maxEstablishments: 1, maxClients: -1 };
const PRO = { maxEstablishments: -1, maxClients: 25 };
let fails = 0;
const save = async (org: string, e: any, limits: any) => {
  const err = await checkEstablishmentLimits(query, org, e, limits, true);
  if (!err) {
    await query(`INSERT INTO establishments (id, org_id, name, siret, client_name) VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (id) DO UPDATE SET siret=EXCLUDED.siret, client_name=EXCLUDED.client_name`,
                [e.id, org, e.id, e.siret ?? null, e.clientName ?? null]);
    await recordSlots(query, org, e);
  }
  return err;
};
const del = (id: string) => query(`DELETE FROM establishments WHERE id=$1`, [id]);
const expect = (label: string, err: string | null, shouldPass: boolean) => {
  const ok = shouldPass ? err === null : err !== null;
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${err ? "  -> " + err : ""}`);
};

// --- Essentiel (1 établissement, marge 1) ---
expect("Essentiel : 1er établissement", await save("u1", { id: "e1", siret: "11111111100011" }, ESSENTIEL), true);
expect("Essentiel : 2e simultané refusé", await save("u1", { id: "e2", siret: "22222222200022" }, ESSENTIEL), false);
expect("Essentiel : modifier l'existant", await save("u1", { id: "e1", siret: "11111111100011" }, ESSENTIEL), true);
await del("e1");
expect("Essentiel : recréer le même SIRET après suppression", await save("u1", { id: "e1b", siret: "11111111100011" }, ESSENTIEL), true);
await del("e1b");
expect("Essentiel : remplacer par une autre entreprise (marge d'erreur)", await save("u1", { id: "e3", siret: "33333333300033" }, ESSENTIEL), true);
await del("e3");
expect("Essentiel : 3e entreprise dans l'année refusée (recyclage)", await save("u1", { id: "e4", siret: "44444444400044" }, ESSENTIEL), false);
expect("Essentiel : sans SIRET, recyclage refusé aussi", await save("u1", { id: "e5" }, ESSENTIEL), false);
// Vieillissement : on recule les dates de 13 mois
await db.exec(`UPDATE slot_log SET last_seen = now() - interval '13 months' WHERE org_id='u1'`);
expect("Essentiel : après 12 mois, nouvelle entreprise acceptée", await save("u1", { id: "e6", siret: "66666666600066" }, ESSENTIEL), true);

// --- Pro (25 clients, marge 3) ---
for (let i = 1; i <= 25; i++) await save("p1", { id: `c${i}`, clientName: `Client ${i}` }, PRO);
expect("Pro : 2e établissement d'un client existant", await save("p1", { id: "c1-bis", clientName: "client 1" }, PRO), true);
expect("Pro : 26e client simultané refusé", await save("p1", { id: "c26", clientName: "Client 26" }, PRO), false);
let accepted = 0;
for (let i = 1; i <= 5; i++) {
  await del(`c${i + 10}`);
  if (!(await save("p1", { id: `n${i}`, clientName: `Nouveau ${i}` }, PRO))) accepted++;
}
expect(`Pro : recyclage limité à la marge (3 attendus, ${accepted} acceptés)`, accepted === 3 ? null : "écart", true);
expect("Pro : renommer un client pour recycler, refusé", await save("p1", { id: "c2", clientName: "Client recyclé" }, PRO), false);
expect("Pro : modifier un client sans le renommer", await save("p1", { id: "c2", clientName: "Client 2" }, PRO), true);

// --- Comptes existants avant la fonctionnalité (pas de slot_log) ---
await query(`INSERT INTO establishments (id, org_id, name) VALUES ('old1','u9','old1')`);
expect("Ancien compte : modifier son établissement", await save("u9", { id: "old1" }, ESSENTIEL), true);

console.log(fails ? `\n${fails} échec(s)` : "\nTous les scénarios passent");
process.exit(fails ? 1 : 0);
