import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Branding } from "../types";
import { Card } from "./Card";
import { prepareLogo, saveBranding } from "../services/brandingService";

type Props = {
  branding: Branding;
  canEdit: boolean;
  onSaved: (branding: Branding) => void;
};

const field = "w-full rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm";

// Réglage de la marque du cabinet sur les PDF (offre Pro). Hors Pro, la carte
// présente l'option et renvoie vers les offres.
export const BrandingCard = ({ branding, canEdit, onSaved }: Props) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Branding>(branding);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(branding), [branding]);

  if (!canEdit) {
    return (
      <Card title="Vos documents à votre marque" subtitle="Inclus dans l'offre Pro">
        <p className="mb-3 text-sm text-slate/70">
          Votre logo, votre couleur et vos coordonnées sur chaque DUERP remis à vos clients, à la place de celles de Kaijos.
        </p>
        <button onClick={() => navigate("/pricing")} className="rounded-xl bg-kairos px-4 py-2 text-sm font-semibold text-white shadow">
          Découvrir l'offre Pro
        </button>
      </Card>
    );
  }

  const set = (key: keyof Branding) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const logo = await prepareLogo(file);
      setDraft((d) => ({ ...d, logo }));
      setStatus(null);
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Logo illisible." });
    }
  };

  const onSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const saved = await saveBranding(draft);
      onSaved(saved);
      setStatus({ kind: "ok", text: "Enregistré : vos prochains PDF seront à votre marque." });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      let text = "L'enregistrement a échoué. Réessayez dans quelques secondes.";
      try {
        text = JSON.parse(raw).error || text;
      } catch {
        // message brut non JSON : on garde le message générique
      }
      setStatus({ kind: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const color = draft.color || "#5b61f6";

  return (
    <Card title="Vos documents à votre marque" subtitle="Logo, couleur et coordonnées sur les PDF remis à vos clients">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm text-slate/70">
          Nom du cabinet
          <input className={field} value={draft.name || ""} onChange={set("name")} placeholder="Cabinet Prévention Conseil" maxLength={120} />
        </label>
        <label className="text-sm text-slate/70">
          Email
          <input className={field} type="email" value={draft.email || ""} onChange={set("email")} placeholder="contact@cabinet.fr" maxLength={120} />
        </label>
        <label className="text-sm text-slate/70">
          Téléphone
          <input className={field} value={draft.phone || ""} onChange={set("phone")} placeholder="01 23 45 67 89" maxLength={40} />
        </label>
        <label className="text-sm text-slate/70">
          Site web
          <input className={field} value={draft.website || ""} onChange={set("website")} placeholder="www.cabinet.fr" maxLength={120} />
        </label>
        <label className="text-sm text-slate/70 md:col-span-2">
          Adresse
          <input className={field} value={draft.address || ""} onChange={set("address")} placeholder="12 rue de la Paix, 75002 Paris" maxLength={300} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate/30 bg-white">
            {draft.logo?.dataUrl ? (
              <img src={draft.logo.dataUrl} alt="Logo du cabinet" className="max-h-14 max-w-[7.5rem] object-contain" />
            ) : (
              <span className="text-xs text-slate/40">Aucun logo</span>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="cursor-pointer font-semibold text-kairos hover:underline">
              {draft.logo ? "Changer le logo" : "Ajouter un logo"}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onLogo} />
            </label>
            {draft.logo && (
              <button type="button" className="text-left text-xs text-red-500 hover:underline" onClick={() => setDraft((d) => ({ ...d, logo: null }))}>
                Retirer le logo
              </button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate/70">
          Couleur
          <input
            type="color"
            value={color}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            className="h-9 w-12 cursor-pointer rounded-lg border border-slate/20 bg-white p-1"
          />
        </label>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-slate/70">
        <input
          type="checkbox"
          checked={!!draft.hideKaijos}
          onChange={(e) => setDraft((d) => ({ ...d, hideKaijos: e.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-slate/30 text-kairos"
        />
        Ne pas mentionner Kaijos sur les documents (sinon : « réalisé avec Kaijos » en pied de page)
      </label>

      {/* Aperçu du haut de page */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate/15 bg-white">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-bold" style={{ background: color, color: isLight(color) ? "#1e1e32" : "#fff" }}>
          <span>INVENTAIRE DES RISQUES</span>
          <span className="font-normal">{draft.name || "Votre cabinet"}</span>
        </div>
        <p className="px-4 py-2 text-[11px] text-slate/50">
          Aperçu : {footerPreview(draft)} — Page 1 / 3
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status && <span className={`text-sm ${status.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{status.text}</span>}
      </div>
    </Card>
  );
};

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.65;
};

const footerPreview = (b: Branding) => {
  const name = b.name?.trim();
  if (!name) return "Kaijos";
  return b.hideKaijos ? name : `${name} — réalisé avec Kaijos`;
};
