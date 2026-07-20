import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDuerpStore } from "../state/store";
import { PLAN_CONFIG, type PlanId } from "../hooks/usePlan";
import { apiGet, apiPost } from "../utils/apiClient";

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || "http://localhost:8787";

type Invite = { id: string; invitee_email: string; role: string; status: string; created_at: string };

export default function AccountPage() {
  const { user } = useUser();
  const { establishments, selectedEstablishmentId } = useDuerpStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentEstablishment = establishments.find((e) => e.id === selectedEstablishmentId) || establishments[0];

  // Collaborateurs
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "contrib">("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    apiGet<{ invites: Invite[] }>("/api/invites")
      .then((d) => setInvites(d.invites || []))
      .catch(() => null);
  }, [user?.id]);

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !user?.id) return;
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      await apiPost("/api/invites", {
        ownerName: user.fullName || user.primaryEmailAddress?.emailAddress,
        email: inviteEmail.trim(),
        role: inviteRole,
        establishmentName: currentEstablishment?.name || "",
      });
      setInviteMsg({ ok: true, text: "Invitation envoyée." });
      setInviteEmail("");
      const updated = await apiGet<{ invites: Invite[] }>("/api/invites").catch(() => ({ invites: [] }));
      setInvites(updated.invites || []);
    } catch {
      setInviteMsg({ ok: false, text: "Erreur lors de l'envoi." });
    } finally {
      setInviteLoading(false);
    }
  };

  const revokeInvite = async (email: string) => {
    if (!user?.id) return;
    await apiPost("/api/invites/revoke", { email }).catch(() => null);
    setInvites((prev) => prev.filter((i) => i.invitee_email !== email));
  };

  const status = String((user?.publicMetadata as any)?.subscriptionStatus || "inactive");
  const rawPlanId = (user?.publicMetadata as any)?.planId as string | undefined;
  const planLabel = rawPlanId && rawPlanId in PLAN_CONFIG ? PLAN_CONFIG[rawPlanId as PlanId].label : null;
  const customerId = String((user?.publicMetadata as any)?.stripeCustomerId || "");
  const portalAvailable = Boolean(customerId);

  const openPortal = async () => {
    if (!user || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/customer-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserId: user.id }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Portal failed (${res.status})`);
      }
      const data = await res.json();
      if (!data?.url) throw new Error("Portal url missing");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError("Impossible d'ouvrir le portail client. Reessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Mon compte</h1>
            <p className="mt-2 text-slate-600">Gerez votre abonnement et vos informations de facturation.</p>
          </div>
          <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            Retour a l'application
          </a>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Abonnement</p>
            <div className="mt-4 text-lg font-semibold">{planLabel ? `Plan ${planLabel}` : "Aucun abonnement actif"}</div>
            {planLabel && <div className="mt-2 text-sm text-slate-600">Statut : {status === "active" ? "Actif" : status === "canceled" ? "Résilié" : status === "past_due" ? "Paiement en retard" : status}</div>}
            {customerId && <div className="mt-2 text-xs text-slate-400">Client Stripe: {customerId}</div>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Facturation</p>
            <p className="mt-3 text-sm text-slate-600">
              Mettez a jour votre moyen de paiement, vos factures et votre abonnement.
            </p>
            <button
              type="button"
              onClick={openPortal}
              disabled={loading || !portalAvailable}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Redirection..." : portalAvailable ? "Ouvrir le portail client" : "Aucun abonnement actif"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── Collaborateurs ── */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Collaborateurs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Invitez un collègue à créer son propre compte Kaijos. Il recevra un email avec un lien d'inscription.
            L'accès partagé à un même établissement n'est pas encore disponible — chaque compte reste indépendant pour l'instant.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.fr"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Rôle</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "viewer" | "contrib")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="viewer">Lecteur</option>
                <option value="contrib">Contributeur</option>
              </select>
            </div>
            <button
              onClick={sendInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {inviteLoading ? "Envoi…" : "Inviter"}
            </button>
          </div>

          {inviteMsg && (
            <p className={`mt-2 text-sm ${inviteMsg.ok ? "text-green-600" : "text-rose-600"}`}>{inviteMsg.text}</p>
          )}

          {invites.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 text-slate-800">{inv.invitee_email}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{inv.role}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          inv.status === "accepted" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status === "accepted" ? "Acceptée" : "En attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => revokeInvite(inv.invitee_email)} className="text-xs text-rose-500 hover:underline">
                          Révoquer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invites.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">Aucun collaborateur invité pour le moment.</p>
          )}
        </div>
      </div>
    </main>
  );
}
