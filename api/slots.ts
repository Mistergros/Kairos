// Quotas sur 12 mois glissants : un établissement ou un client supprimé
// continue d'occuper sa place pendant 12 mois après sa dernière modification
// (table slot_log). Sinon on pouvait livrer un DUERP, supprimer l'entreprise
// et en créer une autre : clients illimités pour le prix d'une place.
// La marge (+10 %, au moins 1) laisse corriger une erreur de saisie, et
// recréer un établissement avec le même SIRET ne consomme pas de place.
//
// Module séparé de server.ts (query injectée) pour être testable contre une
// vraie base Postgres.

export type Query = (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
export type Limits = { maxEstablishments: number; maxClients: number };

export const SLOT_WINDOW_DAYS = 365;

export const SLOT_LOG_DDL = `CREATE TABLE IF NOT EXISTS slot_log (
  org_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  siret TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, kind, slot_key)
)`;

export const withTolerance = (max: number) => (max === -1 ? -1 : max + Math.max(1, Math.ceil(max * 0.1)));

export const normalizeSiret = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
};

const establishmentSlotKey = (row: { id: string; siret?: string | null }) => normalizeSiret(row.siret) || `id:${row.id}`;
const clientSlotKey = (row: { id: string; client_name?: string | null }) =>
  row.client_name?.trim().toLowerCase() || `id:${row.id}`;

const recentSlots = async (query: Query, orgId: string, kind: "establishment" | "client") =>
  (
    await query(
      `SELECT slot_key, siret FROM slot_log
        WHERE org_id=$1 AND kind=$2 AND last_seen > now() - ($3 || ' days')::interval`,
      [orgId, kind, String(SLOT_WINDOW_DAYS)]
    )
  ).rows as { slot_key: string; siret: string | null }[];

export const recordSlots = async (query: Query, orgId: string, e: any) => {
  await query(
    `INSERT INTO slot_log (org_id, kind, slot_key, siret) VALUES ($1,'establishment',$2,$3)
     ON CONFLICT (org_id, kind, slot_key) DO UPDATE SET last_seen=now(), siret=COALESCE(EXCLUDED.siret, slot_log.siret)`,
    [orgId, `id:${e.id}`, normalizeSiret(e.siret)]
  );
  const clientName = typeof e.clientName === "string" ? e.clientName : null;
  await query(
    `INSERT INTO slot_log (org_id, kind, slot_key) VALUES ($1,'client',$2)
     ON CONFLICT (org_id, kind, slot_key) DO UPDATE SET last_seen=now()`,
    [orgId, clientSlotKey({ id: e.id, client_name: clientName })]
  );
};

// Renvoie le message de refus, ou null si l'enregistrement est autorisé.
export const checkEstablishmentLimits = async (
  query: Query,
  orgId: string,
  e: any,
  limits: Limits,
  active: boolean
): Promise<string | null> => {
  const existing = (
    await query(`SELECT id, siret, client_name FROM establishments WHERE org_id=$1`, [orgId])
  ).rows as { id: string; siret: string | null; client_name: string | null }[];
  const isNew = !existing.some((row) => row.id === e.id);
  const upgradeHint = active ? "" : " Abonnez-vous pour en ajouter davantage.";
  const plural = limits.maxEstablishments > 1 ? "s" : "";

  if (limits.maxEstablishments !== -1 && isNew) {
    // Limite instantanée : établissements présents en ce moment.
    if (existing.length >= limits.maxEstablishments) {
      return `Votre offre permet ${limits.maxEstablishments} établissement${plural} au maximum.${upgradeHint}`;
    }
    // Limite sur 12 mois : présents + supprimés récemment, un même SIRET ne
    // comptant qu'une fois.
    const used = new Set<string>(existing.map(establishmentSlotKey));
    for (const s of await recentSlots(query, orgId, "establishment")) used.add(normalizeSiret(s.siret) || s.slot_key);
    const candidate = establishmentSlotKey({ id: e.id, siret: e.siret });
    if (!used.has(candidate) && used.size + 1 > withTolerance(limits.maxEstablishments)) {
      return `Votre offre permet ${limits.maxEstablishments} établissement${plural} par période de 12 mois : un établissement supprimé continue de compter 12 mois.${upgradeHint}`;
    }
  }

  if (limits.maxClients !== -1) {
    const clientName = typeof e.clientName === "string" ? e.clientName : null;
    const candidate = clientSlotKey({ id: e.id, client_name: clientName });
    const beforeKeys = new Set(existing.map(clientSlotKey));
    const afterKeys = new Set([...existing.filter((row) => row.id !== e.id).map(clientSlotKey), candidate]);
    // Limite instantanée. On ne bloque que ce qui augmente le nombre de
    // clients : un compte déjà au-delà (ancienne offre) garde la main sur
    // ses établissements existants.
    if (afterKeys.size > limits.maxClients && afterKeys.size > beforeKeys.size) {
      return `Votre offre permet ${limits.maxClients} clients au maximum.`;
    }
    // Limite sur 12 mois : un nouveau nom de client (création ou renommage)
    // prend une place, même si un autre client vient d'être supprimé.
    if (!beforeKeys.has(candidate)) {
      const used = new Set<string>([...beforeKeys, ...(await recentSlots(query, orgId, "client")).map((s) => s.slot_key)]);
      if (!used.has(candidate) && used.size + 1 > withTolerance(limits.maxClients)) {
        return `Votre offre permet ${limits.maxClients} clients par période de 12 mois : un client supprimé ou renommé continue de compter 12 mois.`;
      }
    }
  }
  return null;
};
