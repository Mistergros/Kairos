import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage, apiGet, apiPost } from "../utils/apiClient";
import { useDuerpStore } from "../state/store";
import { switchWorkspace, useWorkspaceStore } from "../state/workspace";

// Équipe de l'espace courant : membres (tous les dossiers, comptent dans les
// places de l'offre), accès des clients à leur dossier (offre Pro), invitations
// en attente et, pour le titulaire Pro, achat de places supplémentaires.
// Règles côté serveur : api/workspaces.ts et les routes /api/team, /api/seats.

type Person = { userId: string; name: string; email: string };
type Team = {
  role: "owner" | "editor";
  planId: string;
  seats: { used: number; included: number; extra: number; capacity: number };
  owner: Person;
  members: (Person & { role: string; since: string })[];
  guests: (Person & { establishmentId: string; establishmentName: string | null; role: "contrib" | "viewer" })[];
  invitations: { id: string; email: string; kind: "member" | "guest"; role: string; establishmentId: string | null; expiresAt: string }[];
};

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const ROLE_LABEL: Record<string, string> = { contrib: "Peut compléter", viewer: "Consultation" };

// Paliers du tarif « membre supplémentaire » (Stripe, par membre et par an, HT).
// Garder aligné sur le tarif Stripe STRIPE_PRICE_ID_EXTRA_MEMBER et la page Tarifs.
export const EXTRA_MEMBER_TIERS = [
  { label: "6e à 10e membre", price: 290 },
  { label: "11e à 20e membre", price: 240 },
  { label: "21e membre et plus", price: 190 },
];

export function TeamCard() {
  const current = useWorkspaceStore((s) => s.current);
  const userId = useWorkspaceStore((s) => s.userId);
  const establishments = useDuerpStore((s) => s.establishments);
  const [team, setTeam] = useState<Team | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [memberEmail, setMemberEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestEstablishment, setGuestEstablishment] = useState("");
  const [guestRole, setGuestRole] = useState<"contrib" | "viewer">("contrib");
  const [extraSeats, setExtraSeats] = useState(0);
  const [seatPreview, setSeatPreview] = useState<{ amountDue: number; extraSeats: number } | null>(null);

  const isMemberOfCurrent = !current || current.role !== "guest";

  const refresh = useCallback(() => {
    if (!isMemberOfCurrent) return;
    apiGet<Team>("/api/team")
      .then((t) => {
        setTeam(t);
        setExtraSeats(t.seats.extra);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Impossible de charger l'équipe.")));
  }, [isMemberOfCurrent]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: success });
      refresh();
      return true;
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, "L'opération a échoué.") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Invité ou membre dans l'espace de quelqu'un d'autre : il peut le quitter.
  if (current && current.role !== "owner" && userId) {
    const leave = async () => {
      const ok = await run(async () => {
        if (current.role === "guest") {
          for (const e of current.establishments) await apiPost("/api/team/remove", { userId, establishmentId: e.id });
        } else {
          await apiPost("/api/team/remove", { userId });
        }
      }, "Vous avez quitté cet espace.");
      if (ok) switchWorkspace(userId, userId);
    };
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Espace partagé</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vous travaillez dans « {current.name} »
          {current.role === "guest"
            ? `, sur ${current.establishments.map((e) => e.name).join(", ")}.`
            : ", en tant que membre : vous voyez tous ses dossiers."}{" "}
          L'abonnement est celui du titulaire de l'espace.
        </p>
        <button onClick={leave} disabled={busy} className="mt-4 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
          Quitter cet espace
        </button>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-rose-600"}`}>{msg.text}</p>}
      </section>
    );
  }

  if (loadError) return <p className="mt-10 text-sm text-rose-600">{loadError}</p>;
  if (!team) return null;

  const isOwner = team.role === "owner";
  const isPro = team.planId === "consultants";
  const paid = team.planId !== "free";
  const seatsFull = team.seats.used >= team.seats.capacity;
  const establishmentName = (id: string | null) => establishments.find((e) => e.id === id)?.name || "Dossier";

  const inviteMember = () =>
    run(() => apiPost("/api/team/invite", { email: memberEmail, kind: "member" }), "Invitation envoyée.").then((ok) => ok && setMemberEmail(""));
  const inviteGuest = () =>
    run(
      () => apiPost("/api/team/invite", { email: guestEmail, kind: "guest", establishmentId: guestEstablishment, role: guestRole }),
      "Invitation envoyée."
    ).then((ok) => ok && setGuestEmail(""));

  const previewSeats = () =>
    run(async () => {
      const p = await apiPost<{ amountDue: number; extraSeats: number }>("/api/seats/preview", { extraSeats });
      setSeatPreview(p);
    }, "Montant calculé : vérifiez puis confirmez.");
  const confirmSeats = () =>
    run(async () => {
      await apiPost("/api/seats", { extraSeats });
      setSeatPreview(null);
    }, "Places mises à jour.");

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Équipe</h2>
        <p className="text-sm text-slate-600">
          <span className={seatsFull ? "font-semibold text-amber-700" : "font-semibold"}>{team.seats.used} / {team.seats.capacity}</span> places utilisées
          {isPro && team.seats.extra > 0 && ` (dont ${team.seats.extra} achetée${team.seats.extra > 1 ? "s" : ""})`}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Les membres travaillent sur tous les dossiers de l'espace et comptent dans les places de votre offre, vous compris.
        {!paid && " Le travail à plusieurs est inclus dans les offres payantes."}
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100 bg-white">
            <tr>
              <td className="px-4 py-3 text-slate-800">{team.owner.name}<div className="text-xs text-slate-500">{team.owner.email}</div></td>
              <td className="px-4 py-3 text-slate-600">Titulaire de l'abonnement</td>
              <td />
            </tr>
            {team.members.map((m) => (
              <tr key={m.userId}>
                <td className="px-4 py-3 text-slate-800">{m.name}<div className="text-xs text-slate-500">{m.email}</div></td>
                <td className="px-4 py-3 text-slate-600">Membre</td>
                <td className="px-4 py-3 text-right">
                  {isOwner && (
                    <button onClick={() => run(() => apiPost("/api/team/remove", { userId: m.userId }), "Membre retiré.")} disabled={busy} className="text-xs text-rose-500 hover:underline">
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {team.invitations.filter((i) => i.kind === "member").map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 text-slate-800">{i.email}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Invitation en attente</span></td>
                <td className="px-4 py-3 text-right">
                  {isOwner && (
                    <button onClick={() => run(() => apiPost("/api/team/revoke", { id: i.id }), "Invitation annulée.")} disabled={busy} className="text-xs text-rose-500 hover:underline">
                      Annuler
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && paid && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="member-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Inviter un membre</label>
            <input
              id="member-email"
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="prenom.nom@cabinet.fr"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <button onClick={inviteMember} disabled={busy || !memberEmail.trim() || seatsFull} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            Inviter
          </button>
          {seatsFull && (
            <p className="w-full text-xs text-amber-700">
              Toutes les places sont occupées.{isPro ? " Ajoutez une place ci-dessous." : " Passez à l'offre supérieure pour ajouter des membres."}
            </p>
          )}
        </div>
      )}

      {isOwner && isPro && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Places supplémentaires</h3>
          <p className="mt-1 text-sm text-slate-600">
            5 membres sont inclus. Chaque place achetée ajoute un membre et 5 dossiers clients, facturée à l'année au prorata de la période restante.
          </p>
          <ul className="mt-2 text-xs text-slate-600">
            {EXTRA_MEMBER_TIERS.map((t) => (
              <li key={t.label}>{t.label} : {t.price} € HT par an</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="extra-seats" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Places achetées</label>
              <input
                id="extra-seats"
                type="number"
                min={0}
                max={200}
                value={extraSeats}
                onChange={(e) => { setExtraSeats(Math.max(0, Math.floor(Number(e.target.value) || 0))); setSeatPreview(null); }}
                className="w-28 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <button onClick={previewSeats} disabled={busy || extraSeats === team.seats.extra} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60">
              Calculer le montant
            </button>
            {seatPreview && seatPreview.extraSeats === extraSeats && (
              <button onClick={confirmSeats} disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {seatPreview.amountDue >= 0 ? `Confirmer et payer ${euros(seatPreview.amountDue)}` : `Confirmer (avoir de ${euros(-seatPreview.amountDue)})`}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total : {5 + extraSeats} membres et {25 + 5 * extraSeats} dossiers clients. Un retrait de places donne un avoir sur la prochaine facture.
          </p>
        </div>
      )}

      {isPro && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900">Accès de vos clients</h3>
          <p className="mt-1 text-sm text-slate-500">
            Donnez à un client l'accès à son seul dossier, pour le compléter ou le consulter. Gratuit pour lui, sans limite de nombre, et sans place utilisée.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="guest-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email du client</label>
              <input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="gerant@entreprise.fr"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="guest-establishment" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dossier</label>
              <select id="guest-establishment" value={guestEstablishment} onChange={(e) => setGuestEstablishment(e.target.value)} className="max-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <option value="">Choisir…</option>
                {establishments.filter((e) => !e.id.startsWith("demo-")).map((e) => (
                  <option key={e.id} value={e.id}>{e.clientName ? `${e.clientName} — ${e.name}` : e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="guest-role" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Droits</label>
              <select id="guest-role" value={guestRole} onChange={(e) => setGuestRole(e.target.value as "contrib" | "viewer")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <option value="contrib">Peut compléter</option>
                <option value="viewer">Consultation seule</option>
              </select>
            </div>
            <button onClick={inviteGuest} disabled={busy || !guestEmail.trim() || !guestEstablishment} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              Inviter
            </button>
          </div>

          {(team.guests.length > 0 || team.invitations.some((i) => i.kind === "guest")) && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <tbody className="divide-y divide-slate-100 bg-white">
                  {team.guests.map((g) => (
                    <tr key={`${g.userId}-${g.establishmentId}`}>
                      <td className="px-4 py-3 text-slate-800">{g.name}<div className="text-xs text-slate-500">{g.email}</div></td>
                      <td className="px-4 py-3 text-slate-600">{g.establishmentName || establishmentName(g.establishmentId)}</td>
                      <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[g.role]}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => run(() => apiPost("/api/team/remove", { userId: g.userId, establishmentId: g.establishmentId }), "Accès retiré.")} disabled={busy} className="text-xs text-rose-500 hover:underline">
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                  {team.invitations.filter((i) => i.kind === "guest").map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 text-slate-800">{i.email}</td>
                      <td className="px-4 py-3 text-slate-600">{establishmentName(i.establishmentId)}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">En attente · {ROLE_LABEL[i.role]}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => run(() => apiPost("/api/team/revoke", { id: i.id }), "Invitation annulée.")} disabled={busy} className="text-xs text-rose-500 hover:underline">
                          Annuler
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-600" : "text-rose-600"}`}>{msg.text}</p>}
    </section>
  );
}
