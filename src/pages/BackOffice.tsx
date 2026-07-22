import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import duerpApi, { type AdminConfigBundle } from "../services/duerpApi";

type TabKey = "naf" | "risks" | "actions" | "obligations" | "simulator";

const TABS: { key: TabKey; label: string }[] = [
  { key: "naf", label: "Profils NAF" },
  { key: "risks", label: "Risques" },
  { key: "actions", label: "Actions" },
  { key: "obligations", label: "Obligations" },
  { key: "simulator", label: "Simulateur" },
];

const FEATURE_OPTIONS: { key: string; label: string }[] = [
  { key: "solvents", label: "Solvants / COV" },
  { key: "cold_room", label: "Chambre froide" },
  { key: "night_work", label: "Travail de nuit" },
  { key: "public_facing", label: "Relation public" },
  { key: "vibrating_tools", label: "Outils vibrants" },
  { key: "outdoor_uv", label: "Exposition UV" },
  { key: "machines", label: "Machines" },
];

const UNITY_OPTIONS = ["Cuisine", "Plonge", "Salle", "Chambre froide", "Bureau", "Chantier", "Entrepôt"];

const matches = (search: string, ...fields: (string | undefined | null)[]) => {
  if (!search.trim()) return true;
  const s = search.trim().toLowerCase();
  return fields.some((f) => (f || "").toLowerCase().includes(s));
};

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top text-sm text-slate-700 ${className}`}>{children}</td>;
}
function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  );
}

function RiskChip({ id, risksById, onSimulate }: { id: string; risksById: Map<string, any>; onSimulate?: (id: string) => void }) {
  const risk = risksById.get(id);
  return (
    <button
      type="button"
      title={risk ? risk.name : "Aucun risque avec cet identifiant dans le catalogue — référence morte"}
      onClick={() => onSimulate?.(id)}
      className={`mb-1 mr-1 inline-block rounded-full px-2 py-0.5 text-xs ${
        risk ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-sunset/10 text-sunset ring-1 ring-sunset/30"
      }`}
    >
      {!risk && "⚠ "}
      {id}
    </button>
  );
}

function NafTable({
  rows,
  search,
  risksById,
  onSimulate,
}: {
  rows: any[];
  search: string;
  risksById: Map<string, any>;
  onSimulate: (code: string) => void;
}) {
  const filtered = rows.filter((n) => matches(search, n.code, n.label)).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-slate-100">
          <Th>Code</Th>
          <Th>Libellé</Th>
          <Th>Risques obligatoires</Th>
          <Th>Risques prioritaires</Th>
          <Th>—</Th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((n) => (
          <tr key={n.code} className="border-b border-slate-50 last:border-0">
            <Td className="font-mono font-semibold text-ink">{n.code}</Td>
            <Td>{n.label}</Td>
            <Td>{(n.risks_mandatory || []).map((id: string) => <RiskChip key={id} id={id} risksById={risksById} />)}</Td>
            <Td>{(n.risks_priority || []).map((id: string) => <RiskChip key={id} id={id} risksById={risksById} />)}</Td>
            <Td>
              <button
                onClick={() => onSimulate(n.code)}
                className="rounded-lg bg-kairos/10 px-2 py-1 text-xs font-medium text-kairos hover:bg-kairos/20"
              >
                Simuler
              </button>
            </Td>
          </tr>
        ))}
        {!filtered.length && (
          <tr>
            <Td className="py-6 text-center text-slate-400">Aucun résultat</Td>
          </tr>
        )}
      </tbody>
    </TableShell>
  );
}

function RisksTable({ rows, search }: { rows: any[]; search: string }) {
  const filtered = rows
    .filter((r) => matches(search, r.id, r.name, r.category))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-slate-100">
          <Th>ID</Th>
          <Th>Nom</Th>
          <Th>Catégorie</Th>
          <Th>Source(s)</Th>
          <Th>Vérifié le</Th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r) => (
          <tr key={r.id} className="border-b border-slate-50 last:border-0">
            <Td className="font-mono text-xs text-ink">{r.id}</Td>
            <Td className="font-medium text-slate-900">{r.name}</Td>
            <Td>{r.category}</Td>
            <Td>
              {(r.sources || []).length ? (
                (r.sources as string[]).map((s: string, i: number) => {
                  const url = r.sourceUrls?.[i];
                  const label = s.split(" (")[0];
                  return (
                    <div key={i} className="mb-1">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-ocean underline decoration-dotted hover:text-kairos">
                          {label}
                        </a>
                      ) : (
                        <span>{label}</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-sunset">Aucune source</span>
              )}
            </Td>
            <Td className="text-xs text-slate-500">{r.sources_verified || "—"}</Td>
          </tr>
        ))}
        {!filtered.length && (
          <tr>
            <Td className="py-6 text-center text-slate-400">Aucun résultat</Td>
          </tr>
        )}
      </tbody>
    </TableShell>
  );
}

function ActionsTable({ rows, search }: { rows: any[]; search: string }) {
  const filtered = rows.filter((a) => matches(search, a.id, a.title, a.risk_id));
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-slate-100">
          <Th>Risque</Th>
          <Th>Action</Th>
          <Th>Type</Th>
          <Th>Difficulté / Coût</Th>
          <Th>Références</Th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((a) => (
          <tr key={a.id} className="border-b border-slate-50 last:border-0">
            <Td className="font-mono text-xs text-ink">{a.risk_id}</Td>
            <Td className="font-medium text-slate-900">{a.title}</Td>
            <Td>{a.type}</Td>
            <Td>
              {a.difficulty} / {a.cost}
            </Td>
            <Td>
              {(a.references || []).map((ref: string, i: number) => {
                const url = a.referenceUrls?.[i];
                return (
                  <div key={i} className="mb-1">
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="text-ocean underline decoration-dotted hover:text-kairos">
                        {ref}
                      </a>
                    ) : (
                      <span>{ref}</span>
                    )}
                  </div>
                );
              })}
            </Td>
          </tr>
        ))}
        {!filtered.length && (
          <tr>
            <Td className="py-6 text-center text-slate-400">Aucun résultat</Td>
          </tr>
        )}
      </tbody>
    </TableShell>
  );
}

function ObligationsTable({ rows, search }: { rows: any[]; search: string }) {
  const filtered = rows.filter((o) => matches(search, o.id, o.title, o.reference));
  return (
    <TableShell>
      <thead>
        <tr className="border-b border-slate-100">
          <Th>ID</Th>
          <Th>Titre</Th>
          <Th>Référence</Th>
          <Th>Portée</Th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((o) => (
          <tr key={o.id} className="border-b border-slate-50 last:border-0">
            <Td className="font-mono text-xs text-ink">{o.id}</Td>
            <Td className="font-medium text-slate-900">{o.title}</Td>
            <Td>{o.reference}</Td>
            <Td>{o.applies_to_all ? "Toutes activités" : (o.naf_specific || []).join(", ") || "—"}</Td>
          </tr>
        ))}
        {!filtered.length && (
          <tr>
            <Td className="py-6 text-center text-slate-400">Aucun résultat</Td>
          </tr>
        )}
      </tbody>
    </TableShell>
  );
}

function Simulator({ initialNaf, risksById }: { initialNaf: string; risksById: Map<string, any> }) {
  const [nafCode, setNafCode] = useState(initialNaf || "");
  const [unity, setUnity] = useState("Bureau");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialNaf) setNafCode(initialNaf);
  }, [initialNaf]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await duerpApi.evaluateV4({ ctx: { nafCode, unity, features } });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Échec de la simulation");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card title="Contexte simulé">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Code NAF</label>
            <input
              value={nafCode}
              onChange={(e) => setNafCode(e.target.value)}
              placeholder="ex : 43.29A"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Unité de travail</label>
            <select value={unity} onChange={(e) => setUnity(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {UNITY_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Facteurs</label>
            <div className="space-y-1">
              {FEATURE_OPTIONS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-kairos"
                    checked={!!features[f.key]}
                    onChange={() => setFeatures((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={run}
            disabled={!nafCode || loading}
            className="w-full rounded-xl bg-kairos px-3 py-2 text-sm font-semibold text-white hover:bg-kairos/90 disabled:opacity-50"
          >
            {loading ? "Évaluation…" : "Évaluer"}
          </button>
          {error && <p className="text-sm text-sunset">{error}</p>}
        </div>
      </Card>

      <div className="space-y-4">
        {!result && !loading && <Card><p className="text-sm text-slate-500">Renseigne un code NAF puis clique sur « Évaluer » pour voir ce que renvoie le moteur.</p></Card>}
        {result && (
          <>
            <Card title={`${result.risks?.length || 0} risque(s) retenu(s)`} subtitle={`Tenant : ${result.tenantId || "—"}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <Th>Risque</Th>
                      <Th>Gravité</Th>
                      <Th>Fréquence</Th>
                      <Th>Maîtrise</Th>
                      <Th>Score</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.evaluations || [])
                      .slice()
                      .sort((a: any, b: any) => b.score - a.score)
                      .map((ev: any) => (
                        <tr key={ev.risk.id} className="border-b border-slate-50 last:border-0">
                          <Td className="font-medium text-slate-900">
                            {ev.risk.name} <span className="ml-1 font-mono text-xs text-slate-400">{ev.risk.id}</span>
                          </Td>
                          <Td>{ev.severity?.toFixed(1)}</Td>
                          <Td>{ev.frequency?.toFixed(1)}</Td>
                          <Td>{ev.control?.toFixed(1)}</Td>
                          <Td className="font-semibold text-ink">{ev.score?.toFixed(0)}</Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Plan d'action généré">
              <ul className="space-y-1 text-sm text-slate-700">
                {(result.plan?.items || []).map((it: any) => (
                  <li key={it.action.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-1 last:border-0">
                    <span>{it.action.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        it.priority === "Haute" ? "bg-sunset/10 text-sunset" : it.priority === "Moyenne" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {it.priority}
                    </span>
                  </li>
                ))}
                {!result.plan?.items?.length && <li className="text-slate-400">Aucune action générée</li>}
              </ul>
            </Card>
            <Card title="Obligations légales">
              <ul className="space-y-1 text-sm text-slate-700">
                {(result.obligations || []).map((o: any) => (
                  <li key={o.id} className="border-b border-slate-50 py-1 last:border-0">
                    {o.title} <span className="text-xs text-slate-400">({o.reference})</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export function BackOffice() {
  const [data, setData] = useState<AdminConfigBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("naf");
  const [search, setSearch] = useState("");
  const [simNaf, setSimNaf] = useState("");

  useEffect(() => {
    let cancelled = false;
    duerpApi
      .getAdminConfig()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Échec du chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const risksById = useMemo(() => {
    const map = new Map<string, any>();
    (data?.risks || []).forEach((r) => map.set(r.id, r));
    return map;
  }, [data]);

  const obligationRows = useMemo(() => [...(data?.obligations.general || []), ...(data?.obligations.sector || [])], [data]);

  const goSimulate = (code: string) => {
    setSimNaf(code);
    setTab("simulator");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Back-office</h1>
        <p className="text-sm text-slate-600">
          Consultation en lecture seule des référentiels (config/*.json) et simulateur du moteur de risques — outil interne, pas de modification depuis
          cette page.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-kairos text-kairos" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <Card>
          <p className="text-sm text-slate-500">Chargement des référentiels…</p>
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-sm text-sunset">{error}</p>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {tab !== "simulator" && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (id, libellé, catégorie)…"
              className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          )}
          {tab === "naf" && <NafTable rows={data.naf} search={search} risksById={risksById} onSimulate={goSimulate} />}
          {tab === "risks" && <RisksTable rows={data.risks} search={search} />}
          {tab === "actions" && <ActionsTable rows={data.actions} search={search} />}
          {tab === "obligations" && <ObligationsTable rows={obligationRows} search={search} />}
          {tab === "simulator" && <Simulator initialNaf={simNaf} risksById={risksById} />}
        </>
      )}
    </div>
  );
}

export default BackOffice;
