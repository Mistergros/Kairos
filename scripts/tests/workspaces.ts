// Scénarios des espaces partagés (api/workspaces.ts) contre un Postgres embarqué (PGlite).
// Lancer : npm run test:workspaces
import { PGlite } from "@electric-sql/pglite";
import {
  acceptInvitation, canEditEstablishmentData, clientCapacity, createInvitation, listJoinedWorkspaces, memberCapacity,
  resolveAccess, seatsUsed, visibleEstablishments, WORKSPACE_DDL,
} from "../../api/workspaces.ts";

const db = new PGlite();
const query = (t: string, p?: unknown[]) => db.query(t, p as any[]);
await db.exec(`CREATE TABLE establishments (id TEXT PRIMARY KEY, org_id TEXT, name TEXT, client_name TEXT, archived_at TIMESTAMPTZ);`);
for (const ddl of WORKSPACE_DDL) await db.exec(ddl);
await db.exec(`INSERT INTO establishments (id, org_id, name) VALUES ('estA','cab','Boulangerie A'), ('estB','cab','Garage B')`);

let fails = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? "  -> " + detail : ""}`);
};

// --- Places et dossiers par offre ---
check("Essentiel : 2 places", memberCapacity("starter") === 2);
check("PME : 10 places", memberCapacity("pme") === 10);
check("Pro : 5 places + 3 achetées = 8", memberCapacity("consultants", 3) === 8);
check("PME : places achetées ignorées hors Pro", memberCapacity("pme", 3) === 10);
check("Pro : 25 dossiers + 5 par place achetée", clientCapacity(25, "consultants", 3) === 40);
check("PME : dossiers inchangés", clientCapacity(-1, "pme", 3) === -1);

// --- Accès ---
const own = await resolveAccess(query, "cab", null);
check("Son propre espace : propriétaire", own?.role === "owner");
check("Espace d'un autre sans invitation : aucun accès", (await resolveAccess(query, "intrus", "cab")) === null);

// Invitation d'un membre
const tokenM = await createInvitation(query, { workspaceId: "cab", email: "associe@cabinet.fr", kind: "member", role: "editor", createdBy: "cab" });
check("Invitation en attente : réserve une place", (await seatsUsed(query, "cab")) === 2);
const wrong = await acceptInvitation(query, tokenM, "autre", ["autre@mail.fr"]);
check("Invitation refusée pour une autre adresse", !wrong.ok);
const okM = await acceptInvitation(query, tokenM, "assoc", ["Associe@Cabinet.fr"]);
check("Invitation acceptée avec la bonne adresse (casse ignorée)", okM.ok);
check("Membre : accès à tout l'espace", (await resolveAccess(query, "assoc", "cab"))?.role === "editor");
check("Membre accepté : toujours une seule place occupée en plus", (await seatsUsed(query, "cab")) === 2);
check("Réutiliser le lien par un autre compte : refusé", !(await acceptInvitation(query, tokenM, "x", ["associe@cabinet.fr"])).ok);
check("Réouvrir son propre lien : accepté", (await acceptInvitation(query, tokenM, "assoc", ["associe@cabinet.fr"])).ok);

// Invité d'un dossier (client du consultant)
const tokenG = await createInvitation(query, { workspaceId: "cab", email: "gerant@boulangerie.fr", kind: "guest", role: "contrib", establishmentId: "estA", createdBy: "cab" });
check("Invitation client : ne prend pas de place", (await seatsUsed(query, "cab")) === 2);
await acceptInvitation(query, tokenG, "client", ["gerant@boulangerie.fr"]);
const guest = await resolveAccess(query, "client", "cab");
check("Client : accès invité", guest?.role === "guest");
check("Client : ne voit que son dossier", JSON.stringify(guest && visibleEstablishments(guest)) === JSON.stringify(["estA"]));
check("Client contributeur : modifie son dossier", Boolean(guest && canEditEstablishmentData(guest, "estA")));
check("Client : ne modifie pas un autre dossier", Boolean(guest && !canEditEstablishmentData(guest, "estB")));

const tokenV = await createInvitation(query, { workspaceId: "cab", email: "cse@garage.fr", kind: "guest", role: "viewer", establishmentId: "estB", createdBy: "cab" });
await acceptInvitation(query, tokenV, "lecteur", ["cse@garage.fr"]);
const viewer = await resolveAccess(query, "lecteur", "cab");
check("Lecteur : ne modifie pas son dossier", Boolean(viewer && !canEditEstablishmentData(viewer, "estB")));

// Remplacement et expiration
const t1 = await createInvitation(query, { workspaceId: "cab", email: "x@y.fr", kind: "member", role: "editor", createdBy: "cab" });
await createInvitation(query, { workspaceId: "cab", email: "x@y.fr", kind: "member", role: "editor", createdBy: "cab" });
check("Nouvelle invitation : l'ancienne est annulée", !(await acceptInvitation(query, t1, "xy", ["x@y.fr"])).ok);
check("Invitations remplacées : une seule place réservée", (await seatsUsed(query, "cab")) === 3);
const t2 = await createInvitation(query, { workspaceId: "cab", email: "late@y.fr", kind: "member", role: "editor", createdBy: "cab" });
await db.exec(`UPDATE workspace_invitations SET expires_at = now() - interval '1 day' WHERE email='late@y.fr'`);
check("Invitation expirée : refusée", !(await acceptInvitation(query, t2, "late", ["late@y.fr"])).ok);
check("Invitation expirée : ne réserve plus de place", (await seatsUsed(query, "cab")) === 3);
const self = await createInvitation(query, { workspaceId: "cab", email: "moi@cab.fr", kind: "member", role: "editor", createdBy: "cab" });
check("Rejoindre son propre espace : refusé", !(await acceptInvitation(query, self, "cab", ["moi@cab.fr"])).ok);

// Liste des espaces rejoints
const joined = await listJoinedWorkspaces(query, "client");
check("Client : l'espace du cabinet apparaît avec son dossier", joined.length === 1 && joined[0].establishments[0]?.name === "Boulangerie A");

// Retrait : plus d'accès
await query(`DELETE FROM establishment_guests WHERE user_id='client'`);
check("Accès retiré : plus rien", (await resolveAccess(query, "client", "cab")) === null);

console.log(fails ? `\n${fails} échec(s)` : "\nTous les scénarios passent.");
process.exit(fails ? 1 : 0);
