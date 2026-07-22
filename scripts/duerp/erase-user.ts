// Efface un utilisateur et toutes ses données (droit à l'effacement RGPD).
//
// Usage :
//   npx tsx scripts/duerp/erase-user.ts <email-ou-id-clerk>              (aperçu, ne supprime rien)
//   npx tsx scripts/duerp/erase-user.ts <email-ou-id-clerk> --confirm    (supprime pour de vrai)
//
// Nécessite DATABASE_URL et CLERK_SECRET_KEY dans .env.local (ou l'environnement),
// pointant vers la même base/instance Clerk que celle à nettoyer — vérifiez lequel
// avant de lancer avec --confirm (production vs staging).

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { clerkClient } from "@clerk/clerk-sdk-node";
import { query } from "../../apps/web/server/db";

const TABLES = ["establishments", "work_units", "assessments", "actions", "duerp_versions"] as const;

async function resolveUser(idOrEmail: string) {
  if (idOrEmail.startsWith("user_")) {
    return clerkClient.users.getUser(idOrEmail).catch(() => null);
  }
  const list = await clerkClient.users.getUserList({ emailAddress: [idOrEmail] });
  return list[0] || null;
}

async function main() {
  const arg = process.argv[2];
  const confirm = process.argv.includes("--confirm");

  if (!arg) {
    console.error("Usage : npx tsx scripts/duerp/erase-user.ts <email-ou-id-clerk> [--confirm]");
    process.exit(1);
  }

  const user = await resolveUser(arg);
  if (!user) {
    console.error(`Aucun utilisateur Clerk trouvé pour "${arg}".`);
    process.exit(1);
  }

  const orgId = user.id;
  console.log(`Utilisateur : ${user.emailAddresses?.[0]?.emailAddress || "(sans email)"} (${orgId})`);
  console.log(confirm ? "Mode : SUPPRESSION RÉELLE" : "Mode : aperçu seulement (ajoutez --confirm pour supprimer)");
  console.log("");

  let total = 0;
  for (const table of TABLES) {
    const res = await query(`SELECT COUNT(*) FROM ${table} WHERE org_id = $1`, [orgId]);
    const count = Number(res.rows[0].count);
    total += count;
    if (count > 0) console.log(`  ${table}: ${count} ligne(s)`);
  }
  console.log(`Total : ${total} ligne(s) en base + 1 compte Clerk.`);

  if (!confirm) {
    console.log("\nRien n'a été supprimé (aperçu). Relancez avec --confirm pour effacer réellement.");
    process.exit(0);
  }

  console.log("\nSuppression en cours...");
  for (const table of TABLES) {
    await query(`DELETE FROM ${table} WHERE org_id = $1`, [orgId]);
  }
  await clerkClient.users.deleteUser(orgId);
  console.log("Terminé : données Neon et compte Clerk supprimés.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
