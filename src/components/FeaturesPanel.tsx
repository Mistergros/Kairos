import { useEffect, useMemo, useState } from "react";

type FeatureKey =
  | "solvents"
  | "cold_room"
  | "night_work"
  | "public_facing"
  | "vibrating_tools"
  | "outdoor_uv"
  | "machines";

const FEATURE_LIST: { key: FeatureKey; label: string; description: string }[] = [
  { key: "solvents", label: "Solvants / COV", description: "Peintures, degraissants, produits chimiques volatils" },
  { key: "cold_room", label: "Chambre froide", description: "Travail en froid positif / negatif" },
  { key: "night_work", label: "Travail de nuit", description: "Horaires nocturnes, isolement" },
  { key: "public_facing", label: "Relation public", description: "Accueil, incivilites, tensions" },
  { key: "vibrating_tools", label: "Outils vibrants", description: "Perceuses, meuleuses, marteaux-piqueurs" },
  { key: "outdoor_uv", label: "Exposition UV", description: "Travail exterieur soleil / UV" },
  { key: "machines", label: "Machines", description: "Machines avec pieces en mouvement" },
];

interface FeaturesPanelProps {
  nafCode?: string;
  unity?: string;
  onResult?: (payload: any) => void;
}

export function FeaturesPanel({ nafCode = "47", unity = "Magasin", onResult }: FeaturesPanelProps) {
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() =>
    FEATURE_LIST.reduce((acc, item) => ({ ...acc, [item.key]: false }), {} as Record<FeatureKey, boolean>)
  );
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const body = useMemo(() => ({ nafCode, unity, features }), [nafCode, unity, features]);

  const toggle = (key: FeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/duerp/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await response.json();
        const withMeta = { ...json, meta: { nafCode, unity, features } };
        setPayload(withMeta);
        onResult?.(withMeta);
      } catch (err) {
        setError("Echec de l'appel API");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [body, onResult]);

  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Contexte / facteurs</h3>
          <p className="text-sm text-slate-600">Chaque changement relance l'API DUERP</p>
        </div>
        <span className="text-xs text-slate-500">NAF {nafCode} • {unity}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {FEATURE_LIST.map((feature) => (
          <label
            key={feature.key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
              checked={features[feature.key]}
              onChange={() => toggle(feature.key)}
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">{feature.label}</div>
              <div className="text-xs text-slate-600">{feature.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {loading ? "Chargement..." : error ? error : <pre className="whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>}
      </div>
    </div>
  );
}
