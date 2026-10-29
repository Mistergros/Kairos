import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { useDuerpStore } from "../state/store";
import { usePlan } from "../hooks/usePlan";
import { summarizeClients, REVISION_WARNING_DAYS, type ClientSummary, type RevisionStatus } from "../utils/revision";

// Doit rester aligné sur PLAN_LIMITS.consultants.maxClients (api/server.ts).
const MAX_CLIENTS = 25;

const STATUS_LABEL: Record<RevisionStatus, { label: string; cls: string }> = {
  overdue: { label: "Révision en retard", cls: "bg-rose-100 text-rose-700" },
  never: { label: "Jamais finalisé", cls: "bg-amber-100 text-amber-800" },
  soon: { label: "Révision à prévoir", cls: "bg-sky-100 text-sky-800" },
  ok: { label: "À jour", cls: "bg-emerald-100 text-emerald-700" },
};

const fmt = (d?: Date) => (d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export const Clients = () => {
  const { establishments, workUnits, assessments, actions, versions, setSelectedEstablishment, updateEstablishment } =
    useDuerpStore();
  const plan = usePlan();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const clients = useMemo(
    () => summarizeClients({ establishments, workUnits, assessments, actions, versions }),
    [establishments, workUnits, assessments, actions, versions]
  );
  const knownClients = useMemo(
    () => Array.from(new Set(establishments.map((e) => e.clientName).filter(Boolean) as string[])).sort(),
    [establishments]
  );

  const visible = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.establishments.some((e) => e.name.toLowerCase().includes(q));
  });

  const count = (s: RevisionStatus) => clients.filter((c) => c.revision.status === s).length;

  const open = (establishmentId: string) => {
    setSelectedEstablishment(establishmentId);
    navigate("/");
  };

  if (plan.planId !== "consultants") {
    return (
      <Card title="Portefeuille clients" subtitle="Réservé à l'offre Pro">
        <p className="text-sm text-slate/70">
          Gérez les DUERP de plusieurs entreprises clientes depuis un seul compte, avec le suivi des révisions annuelles de chacune.
        </p>
        <a href="/pricing" className="mt-4 inline-block rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
          Voir l'offre Pro
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={`${clients.length} / ${MAX_CLIENTS}`} />
        <Stat label="Révisions en retard" value={String(count("overdue"))} tone={count("overdue") ? "bad" : undefined} />
        <Stat label="Jamais finalisés" value={String(count("never"))} tone={count("never") ? "warn" : undefined} />
        <Stat label={`À prévoir sous ${REVISION_WARNING_DAYS} jours`} value={String(count("soon"))} />
      </div>

      <Card
        title="Portefeuille clients"
        subtitle="Un DUERP par établissement, à réviser au moins une fois par an (obligatoire dès 11 salariés). Une version enregistrée vaut révision."
        corner={
          <input
            id="clients-search"
            className="rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
            placeholder="Rechercher un client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate/20 p-6 text-center text-sm text-slate/70">
            Aucun client pour l'instant. Créez un établissement dans{" "}
            <button className="font-semibold text-kairos underline" onClick={() => navigate("/units")}>
              Unités de travail
            </button>{" "}
            en renseignant le champ « Client ».
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate/50">
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Révision</th>
                  <th className="py-2 pr-3">Dernière version</th>
                  <th className="py-2 pr-3 text-right">Risques</th>
                  <th className="py-2 pr-3 text-right">Actions ouvertes</th>
                  <th className="py-2 pr-3 text-right">En retard</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <ClientRow
                    key={c.key}
                    client={c}
                    editing={editingKey === c.key}
                    knownClients={knownClients}
                    onToggleEdit={() => setEditingKey(editingKey === c.key ? null : c.key)}
                    onOpen={open}
                    onRename={(id, clientName) => updateEstablishment(id, { clientName: clientName.trim() || undefined })}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="py-4 text-center text-sm text-slate/60">Aucun client ne correspond à « {search} ».</p>}
          </div>
        )}
      </Card>
    </div>
  );
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-slate";
  return (
    <div className="glass rounded-2xl p-4">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-slate/60">{label}</p>
    </div>
  );
}

function ClientRow({
  client,
  editing,
  knownClients,
  onToggleEdit,
  onOpen,
  onRename,
}: {
  client: ClientSummary;
  editing: boolean;
  knownClients: string[];
  onToggleEdit: () => void;
  onOpen: (establishmentId: string) => void;
  onRename: (establishmentId: string, clientName: string) => void;
}) {
  const status = STATUS_LABEL[client.revision.status];
  const multi = client.establishments.length > 1;
  return (
    <>
      <tr className="border-t border-slate/10 align-top">
        <td className="py-3 pr-3">
          <p className="font-semibold text-slate">{client.name}</p>
          <p className="text-xs text-slate/60">
            {client.establishments.length} établissement{multi ? "s" : ""} · {client.workUnitCount} unité{client.workUnitCount > 1 ? "s" : ""}
          </p>
        </td>
        <td className="py-3 pr-3">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
          {client.revision.dueAt && <p className="mt-1 text-xs text-slate/60">Échéance : {fmt(client.revision.dueAt)}</p>}
        </td>
        <td className="py-3 pr-3 text-slate/70">{fmt(client.revision.lastVersionAt)}</td>
        <td className="py-3 pr-3 text-right tabular-nums">{client.riskCount}</td>
        <td className="py-3 pr-3 text-right tabular-nums">{client.openActions}</td>
        <td className={`py-3 pr-3 text-right tabular-nums ${client.lateActions ? "font-semibold text-rose-600" : ""}`}>{client.lateActions}</td>
        <td className="py-3 text-right whitespace-nowrap">
          {!multi && (
            <button
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => onOpen(client.establishments[0].id)}
            >
              Ouvrir
            </button>
          )}
          <button className="ml-2 text-xs font-medium text-kairos hover:underline" onClick={onToggleEdit}>
            {editing ? "Fermer" : multi ? "Établissements" : "Modifier"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={7} className="pb-4">
            <div className="space-y-2 rounded-xl bg-slate/5 p-3">
              {client.establishments.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[160px] flex-1 text-sm font-medium text-slate">{e.name}</span>
                  <label className="text-xs text-slate/60" htmlFor={`client-of-${e.id}`}>Client</label>
                  <input
                    id={`client-of-${e.id}`}
                    list="clients-known"
                    defaultValue={e.clientName || ""}
                    placeholder={e.name}
                    className="rounded-lg border border-slate/20 bg-white px-2 py-1 text-sm"
                    onBlur={(ev) => {
                      if ((ev.target.value.trim() || undefined) !== (e.clientName || undefined)) onRename(e.id, ev.target.value);
                    }}
                  />
                  <button className="rounded-lg bg-ink px-3 py-1 text-xs font-semibold text-white" onClick={() => onOpen(e.id)}>
                    Ouvrir
                  </button>
                </div>
              ))}
              <datalist id="clients-known">
                {knownClients.map((n) => <option key={n} value={n} />)}
              </datalist>
              <p className="text-xs text-slate/50">Renseignez le même nom de client pour regrouper plusieurs établissements.</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
