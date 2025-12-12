import { useMemo, useRef, useState } from "react";
import duerpApi, { AssistResponse } from "../services/duerpApi";

type AssistRisk = {
  id?: string;
  riskLabel?: string;
  hazardCategory?: string;
  severity?: number;
  frequency?: number;
  mastery?: number;
  context?: string;
};

type Props = {
  enabled: boolean;
  nafCode?: string;
  unitName?: string;
  activity?: string;
  risks?: AssistRisk[];
};

type Tab = "justifications" | "incoherences" | "synthese" | "recommandations";

function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}

function normalizeResponse(res: AssistResponse) {
  const explanations = res.explanations || {};
  const inconsistencies = res.inconsistencies || [];
  const recommendations = res.recommendations || [];
  return { explanations, inconsistencies, recommendations, narrative: res.narrative || "", tenantId: res.tenantId };
}

export function AssistPanel({ enabled, nafCode, unitName, activity, risks = [] }: Props) {
  const [prompt, setPrompt] = useState("");
  const [situation, setSituation] = useState<"habituelle" | "exceptionnelle" | "">("");
  const [coactivity, setCoactivity] = useState<"oui" | "non" | "">("");
  const contextRef = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("justifications");
  const [data, setData] = useState<AssistResponse | null>(null);

  const payload = useMemo(
    () => ({
      nafCode,
      unitName,
      activity,
      freeText: [prompt, situation && `Situation ${situation}`, coactivity && `Coactivité/intervenants: ${coactivity}`]
        .filter(Boolean)
        .join(" | "),
      risks: risks.map((r) => ({
        id: r.id,
        label: r.riskLabel,
        category: r.hazardCategory,
        severity: r.severity,
        frequency: r.frequency,
        mastery: r.mastery,
        context: r.context,
      })),
    }),
    [nafCode, unitName, activity, prompt, risks]
  );

  const summaryParts = useMemo(
    () =>
      [
        activity || unitName || "votre unité",
        situation ? `situation ${situation}` : null,
        coactivity ? (coactivity === "oui" ? "avec coactivité/intervenants extérieurs" : "sans coactivité particulière") : null,
        prompt ? `contexte: ${prompt}` : null,
      ].filter(Boolean),
    [activity, unitName, situation, coactivity, prompt]
  );

  const summary = summaryParts.length ? summaryParts.join(", ") : "Pas encore de contexte saisi.";

  const scrollToContext = () => {
    contextRef.current?.focus();
  };

  const callAssist = async () => {
    if (!enabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await duerpApi.assist(payload);
      setData(res);
    } catch (err: any) {
      if (err?.status === 403) setError("IA désactivée");
      else if (err?.status === 400) setError("Données invalides pour l'assistant.");
      else setError(err?.message || "Impossible d'obtenir la réponse IA.");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  const normalized = data ? normalizeResponse(data) : null;

  const guidanceText = {
    justifications:
      "Vérifie que cette analyse correspond bien à ton terrain. Ajuste les risques ou cotations si nécessaire avant de valider.",
    incoherences:
      "Vérifie que cette analyse correspond bien à ton terrain. Ajuste les risques ou cotations si nécessaire avant de valider.",
    synthese: "Cette synthèse peut être reprise telle quelle dans ton DUERP. Relis et complète avec tes éléments terrain.",
    recommandations:
      "Ces recommandations sont à adapter : assigne responsables/échéances et conserve les preuves (photos, contrôles).",
  } as const;

  const renderTab = () => {
    if (loading) return <SkeletonLines count={4} />;
    if (!normalized)
      return <p className="text-xs text-slate-600">Clique sur “Relire et expliquer mon DUERP” pour obtenir une assistance textuelle.</p>;

    if (tab === "justifications") {
      const entries = Object.entries(normalized.explanations);
      if (!entries.length) return <p className="text-xs text-slate-600">Aucune justification fournie pour l’instant.</p>;
      return (
        <ul className="space-y-2 text-sm text-slate-800">
          {entries.map(([riskId, text]) => (
            <li key={riskId} className="rounded-xl border border-slate/15 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-500">Risque {riskId}</div>
              <div>Pour ce risque, l’assistant précise : {text}</div>
            </li>
          ))}
        </ul>
      );
    }

    if (tab === "incoherences") {
      const items = normalized.inconsistencies;
      if (!items.length) return <p className="text-xs text-slate-600">Aucune incohérence détectée.</p>;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate/10 text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Message</th>
                <th className="px-3 py-2 text-left">Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {items.map((i, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{i.type}</td>
                  <td className="px-3 py-2 text-slate-800">À vérifier : {i.msg}</td>
                  <td className="px-3 py-2 text-slate-700">{i.fix ? `Piste de correction : ${i.fix}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (tab === "synthese") {
      return (
        <div className="space-y-2">
          <p className="text-sm text-slate-800">
            {normalized.narrative ? `Résumé exploitable : ${normalized.narrative}` : "Pas de synthèse fournie pour le moment."}
          </p>
          <button
            className="rounded-lg border border-slate/20 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => navigator.clipboard.writeText(normalized.narrative || "")}
            disabled={!normalized.narrative}
          >
            Copier
          </button>
        </div>
      );
    }

    if (tab === "recommandations") {
      const recos = normalized.recommendations;
      if (!recos.length) return <p className="text-xs text-slate-600">Aucune recommandation textuelle pour l’instant.</p>;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {recos.map((r, idx) => (
            <div key={idx} className="rounded-2xl border border-slate/20 bg-white px-3 py-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="text-sm text-slate-700">Proposition à adapter : {r.desc}</p>
              {r.related && r.related.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  {r.related.map((rel) => (
                    <span key={rel} className="rounded-full bg-slate-100 px-2 py-1">
                      {rel}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-2xl border border-slate/20 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Aide à la rédaction et à la relecture DUERP</p>
          <p className="text-xs text-slate-600">
            Assistant de relecture et de cohérence : il reformule, explique et signale des points à vérifier. Il ne modifie rien,
            ne décide pas et reste entièrement consultatif.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Je vais relire votre DUERP pour vérifier la cohérence des risques et vous aider à formuler le document. Rien n’est automatique.
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">IA V2</span>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Décrivez votre situation réelle (facultatif)
        <textarea
          className="mt-1 w-full rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          ref={contextRef}
          placeholder="Ex: maintenance machines avec consignation, travail en hauteur, saison estivale..."
        />
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Écrivez en langage naturel : il n’y a pas de bonne ou mauvaise réponse. Ce contexte aide l’IA à refléter la réalité terrain.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          La situation est-elle habituelle ou exceptionnelle ?
          <div className="mt-1 flex gap-2 text-xs">
            {(["habituelle", "exceptionnelle"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSituation((v) => (v === opt ? "" : opt))}
                className={`rounded-full border px-3 py-1 font-semibold transition ${
                  situation === opt ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate/30 bg-white text-slate-700"
                }`}
                type="button"
              >
                {opt === "habituelle" ? "Habituelle" : "Exceptionnelle"}
              </button>
            ))}
          </div>
        </label>

        <label className="text-sm text-slate-700">
          Y a-t-il de la coactivité ou des intervenants extérieurs ?
          <div className="mt-1 flex gap-2 text-xs">
            {(["oui", "non"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setCoactivity((v) => (v === opt ? "" : opt))}
                className={`rounded-full border px-3 py-1 font-semibold transition ${
                  coactivity === opt ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate/30 bg-white text-slate-700"
                }`}
                type="button"
              >
                {opt === "oui" ? "Oui" : "Non"}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-slate/10 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span>Si je résume : {summary}</span>
          <button
            type="button"
            className="rounded-full border border-slate/30 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
            onClick={scrollToContext}
          >
            Corriger
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {nafCode && <span className="rounded-full bg-slate-100 px-3 py-1">NAF {nafCode}</span>}
        {unitName && <span className="rounded-full bg-slate-100 px-3 py-1">{unitName}</span>}
        {activity && <span className="rounded-full bg-slate-100 px-3 py-1">{activity}</span>}
      </div>

      <button
        className="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        onClick={callAssist}
        disabled={loading}
        aria-label="Relire et expliquer mon DUERP"
      >
        {loading ? "Analyse en cours..." : "Relire et expliquer mon DUERP"}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
        {(["justifications", "incoherences", "synthese", "recommandations"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`rounded-full px-3 py-1 ring-1 ${
              tab === t ? "bg-slate-900 text-white ring-slate-900/10" : "bg-white ring-slate-300"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "justifications"
              ? "Justifications"
              : t === "incoherences"
              ? "Incohérences"
              : t === "synthese"
              ? "Synthèse"
              : "Recommandations"}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {renderTab()}
        {normalized && (
          <p className="mt-3 text-[12px] text-slate-600">
            {tab === "justifications" && guidanceText.justifications}
            {tab === "incoherences" && guidanceText.incoherences}
            {tab === "synthese" && guidanceText.synthese}
            {tab === "recommandations" && guidanceText.recommandations}
          </p>
        )}
      </div>
    </div>
  );
}
