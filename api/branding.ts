// Marque du cabinet sur les documents (offre Pro) : nom, coordonnées, couleur
// et logo, une ligne par compte. Module séparé de server.ts (query injectée)
// pour être testable contre une vraie base Postgres.

import type { Query } from "./slots.js";

export type Branding = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  color?: string;
  logo?: { dataUrl: string; width: number; height: number } | null;
  hideKaijos?: boolean;
};

// ~300 Ko d'image une fois décodée : largement assez pour un logo de 600 px,
// le navigateur le redimensionne avant envoi.
export const MAX_LOGO_DATA_URL = 400_000;

export const BRANDING_DDL = `CREATE TABLE IF NOT EXISTS org_branding (
  org_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

const text = (value: unknown, max: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
};

// Ne garde que des champs connus, bornés, et un logo PNG/JPEG (jsPDF ne sait
// pas intégrer de SVG ; un data URL arbitraire pourrait aussi porter autre
// chose qu'une image). Renvoie une erreur lisible si le logo est refusé.
export const sanitizeBranding = (input: any): { branding: Branding } | { error: string } => {
  const out: Branding = {
    name: text(input?.name, 120),
    address: text(input?.address, 300),
    phone: text(input?.phone, 40),
    email: text(input?.email, 120),
    website: text(input?.website, 120),
    color: typeof input?.color === "string" && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color.toLowerCase() : undefined,
    hideKaijos: input?.hideKaijos === true,
    logo: null,
  };
  const logo = input?.logo;
  if (logo) {
    const dataUrl = typeof logo.dataUrl === "string" ? logo.dataUrl : "";
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return { error: "Le logo doit être une image PNG ou JPEG." };
    if (dataUrl.length > MAX_LOGO_DATA_URL) return { error: "Le logo est trop lourd (300 Ko maximum)." };
    const width = Number(logo.width);
    const height = Number(logo.height);
    if (!(width > 0 && height > 0 && width <= 4000 && height <= 4000)) return { error: "Dimensions du logo invalides." };
    out.logo = { dataUrl, width: Math.round(width), height: Math.round(height) };
  }
  return { branding: out };
};

export const getBranding = async (query: Query, orgId: string): Promise<Branding> => {
  const res = await query(`SELECT data FROM org_branding WHERE org_id=$1`, [orgId]);
  return (res.rows[0]?.data as Branding) || {};
};

export const saveBranding = async (query: Query, orgId: string, branding: Branding) => {
  await query(
    `INSERT INTO org_branding (org_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (org_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
    [orgId, JSON.stringify(branding)]
  );
};
