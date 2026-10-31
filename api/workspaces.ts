// Espaces partagés : plusieurs personnes travaillent sur les mêmes dossiers.
//
// Un espace porte l'identifiant Clerk de son propriétaire : les données déjà
// enregistrées (org_id = identifiant de l'utilisateur) deviennent son espace
// sans migration. Le propriétaire paie l'abonnement ; l'offre de l'espace est
// la sienne.
//
// Deux niveaux d'accès :
// - membre (workspace_members, rôle "editor") : tous les dossiers de l'espace.
//   Compte dans les places de l'offre (propriétaire compris).
// - invité d'un dossier (establishment_guests, rôle "contrib" ou "viewer") :
//   un seul établissement, typiquement le client d'un consultant. Offre Pro,
//   sans limite de nombre, gratuit pour l'invité.
//
// Module séparé de server.ts (query injectée) pour être testable contre une
// vraie base Postgres (scripts/tests/workspaces.ts).

import crypto from "crypto";
import type { Query } from "./slots.js";

export type GuestRole = "contrib" | "viewer";
export type Access =
  | { role: "owner" | "editor"; workspaceId: string; userId: string; establishments: null }
  | { role: "guest"; workspaceId: string; userId: string; establishments: Map<string, GuestRole> };

export const WORKSPACE_DDL = [
  `CREATE TABLE IF NOT EXISTS workspace_members (
     workspace_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'editor',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (workspace_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id)`,
  `CREATE TABLE IF NOT EXISTS establishment_guests (
     workspace_id TEXT NOT NULL,
     establishment_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     role TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (establishment_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS establishment_guests_user_idx ON establishment_guests (user_id)`,
  `CREATE TABLE IF NOT EXISTS workspace_invitations (
     id TEXT PRIMARY KEY,
     workspace_id TEXT NOT NULL,
     email TEXT NOT NULL,
     kind TEXT NOT NULL,
     role TEXT NOT NULL,
     establishment_id TEXT,
     token_hash TEXT NOT NULL UNIQUE,
     created_by TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     expires_at TIMESTAMPTZ NOT NULL,
     accepted_by TEXT,
     accepted_at TIMESTAMPTZ,
     revoked_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS workspace_invitations_ws_idx ON workspace_invitations (workspace_id)`,
];

// Places incluses par offre (propriétaire compris). Garder aligné sur
// PLAN_LIMITS (api/server.ts) et PLAN_CONFIG (src/hooks/usePlan.ts).
export const INCLUDED_MEMBERS: Record<string, number> = { free: 1, starter: 2, pme: 10, consultants: 5 };
// Offre Pro : chaque place achetée ajoute aussi des dossiers clients.
export const CLIENTS_PER_EXTRA_SEAT = 5;
export const INVITATION_DAYS = 14;

export const memberCapacity = (planId: string, extraSeats = 0) =>
  (INCLUDED_MEMBERS[planId] ?? 1) + (planId === "consultants" ? Math.max(0, extraSeats) : 0);

export const clientCapacity = (baseClients: number, planId: string, extraSeats = 0) =>
  baseClients === -1 || planId !== "consultants" ? baseClients : baseClients + CLIENTS_PER_EXTRA_SEAT * Math.max(0, extraSeats);

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Droits de l'utilisateur sur l'espace demandé, ou null s'il n'y a pas accès.
export const resolveAccess = async (query: Query, userId: string, workspaceId?: string | null): Promise<Access | null> => {
  const ws = workspaceId || userId;
  if (ws === userId) return { role: "owner", workspaceId: ws, userId, establishments: null };
  const member = await query(`SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, [ws, userId]);
  if (member.rows.length) return { role: "editor", workspaceId: ws, userId, establishments: null };
  const guest = await query(`SELECT establishment_id, role FROM establishment_guests WHERE workspace_id=$1 AND user_id=$2`, [ws, userId]);
  if (!guest.rows.length) return null;
  return {
    role: "guest",
    workspaceId: ws,
    userId,
    establishments: new Map(guest.rows.map((r: any) => [r.establishment_id, r.role === "contrib" ? "contrib" : "viewer"])),
  };
};

export const isMember = (a: Access) => a.role === "owner" || a.role === "editor";
// Identifiants des établissements visibles, ou null = tous.
export const visibleEstablishments = (a: Access) => (a.establishments ? [...a.establishments.keys()] : null);
export const canEditEstablishmentData = (a: Access, establishmentId: string | null | undefined) =>
  isMember(a) || (Boolean(establishmentId) && a.establishments?.get(establishmentId as string) === "contrib");

// Places occupées : propriétaire + membres + invitations de membre en attente
// (une invitation envoyée réserve sa place jusqu'à acceptation ou expiration).
export const seatsUsed = async (query: Query, workspaceId: string) => {
  const members = await query(`SELECT count(*)::int AS n FROM workspace_members WHERE workspace_id=$1`, [workspaceId]);
  const pending = await query(
    `SELECT count(*)::int AS n FROM workspace_invitations
      WHERE workspace_id=$1 AND kind='member' AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
    [workspaceId]
  );
  return 1 + Number(members.rows[0]?.n || 0) + Number(pending.rows[0]?.n || 0);
};

export type InvitationInput = {
  workspaceId: string;
  email: string;
  kind: "member" | "guest";
  role: "editor" | GuestRole;
  establishmentId?: string | null;
  createdBy: string;
};

// Crée l'invitation et renvoie le jeton en clair (seul son empreinte est gardée).
// Une invitation encore valide pour la même adresse et le même accès est remplacée.
export const createInvitation = async (query: Query, input: InvitationInput) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await query(
    `UPDATE workspace_invitations SET revoked_at=now()
      WHERE workspace_id=$1 AND email=$2 AND kind=$3 AND COALESCE(establishment_id,'')=COALESCE($4,'')
        AND accepted_at IS NULL AND revoked_at IS NULL`,
    [input.workspaceId, input.email, input.kind, input.establishmentId ?? null]
  );
  await query(
    `INSERT INTO workspace_invitations (id, workspace_id, email, kind, role, establishment_id, token_hash, created_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() + ($9 || ' days')::interval)`,
    [crypto.randomUUID(), input.workspaceId, input.email, input.kind, input.role, input.establishmentId ?? null,
     hashToken(token), input.createdBy, String(INVITATION_DAYS)]
  );
  return token;
};

export type AcceptResult = { ok: true; workspaceId: string; kind: "member" | "guest" } | { ok: false; error: string; status: number };

// L'invitation ne vaut que pour l'adresse invitée : le compte qui l'accepte doit
// avoir cette adresse (vérifiée par Clerk), sinon un lien transféré ou intercepté
// ouvrirait les dossiers à n'importe qui.
export const acceptInvitation = async (query: Query, token: string, userId: string, userEmails: string[]): Promise<AcceptResult> => {
  const res = await query(`SELECT * FROM workspace_invitations WHERE token_hash=$1`, [hashToken(token)]);
  const inv = res.rows[0];
  if (!inv || inv.revoked_at) return { ok: false, error: "Cette invitation n'existe pas ou a été annulée.", status: 404 };
  if (inv.accepted_at) {
    return inv.accepted_by === userId
      ? { ok: true, workspaceId: inv.workspace_id, kind: inv.kind }
      : { ok: false, error: "Cette invitation a déjà été utilisée.", status: 409 };
  }
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Cette invitation a expiré. Demandez-en une nouvelle.", status: 410 };
  }
  if (!userEmails.map((e) => e.toLowerCase()).includes(String(inv.email).toLowerCase())) {
    return { ok: false, error: `Cette invitation a été envoyée à ${inv.email}. Connectez-vous avec cette adresse.`, status: 403 };
  }
  if (inv.workspace_id === userId) return { ok: false, error: "Vous ne pouvez pas rejoindre votre propre espace.", status: 400 };
  if (inv.kind === "member") {
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'editor') ON CONFLICT DO NOTHING`,
      [inv.workspace_id, userId]
    );
  } else {
    await query(
      `INSERT INTO establishment_guests (workspace_id, establishment_id, user_id, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (establishment_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
      [inv.workspace_id, inv.establishment_id, userId, inv.role]
    );
  }
  await query(`UPDATE workspace_invitations SET accepted_by=$2, accepted_at=now() WHERE id=$1`, [inv.id, userId]);
  return { ok: true, workspaceId: inv.workspace_id, kind: inv.kind };
};

// Espaces auxquels l'utilisateur a accès en plus du sien.
export const listJoinedWorkspaces = async (query: Query, userId: string) => {
  const members = await query(`SELECT workspace_id FROM workspace_members WHERE user_id=$1`, [userId]);
  const guests = await query(
    `SELECT g.workspace_id, g.establishment_id, g.role, e.name AS establishment_name
       FROM establishment_guests g LEFT JOIN establishments e ON e.id = g.establishment_id
      WHERE g.user_id=$1`,
    [userId]
  );
  const result = new Map<string, { workspaceId: string; role: "editor" | "guest"; establishments: { id: string; name: string; role: GuestRole }[] }>();
  for (const r of members.rows as any[]) result.set(r.workspace_id, { workspaceId: r.workspace_id, role: "editor", establishments: [] });
  for (const r of guests.rows as any[]) {
    const entry = result.get(r.workspace_id) || { workspaceId: r.workspace_id, role: "guest" as const, establishments: [] };
    entry.establishments.push({ id: r.establishment_id, name: r.establishment_name || "Dossier", role: r.role });
    result.set(r.workspace_id, entry);
  }
  return [...result.values()];
};

export const listTeam = async (query: Query, workspaceId: string) => {
  const members = (await query(`SELECT user_id, role, created_at FROM workspace_members WHERE workspace_id=$1 ORDER BY created_at`, [workspaceId])).rows;
  const guests = (
    await query(
      `SELECT g.user_id, g.establishment_id, g.role, g.created_at, e.name AS establishment_name
         FROM establishment_guests g LEFT JOIN establishments e ON e.id = g.establishment_id
        WHERE g.workspace_id=$1 ORDER BY g.created_at`,
      [workspaceId]
    )
  ).rows;
  const invitations = (
    await query(
      `SELECT id, email, kind, role, establishment_id, created_at, expires_at FROM workspace_invitations
        WHERE workspace_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at`,
      [workspaceId]
    )
  ).rows;
  return { members, guests, invitations };
};
