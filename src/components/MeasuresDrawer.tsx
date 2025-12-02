import React from "react";

type Measures = { CO?: string[]; ORG?: string[]; TE?: string[]; IND?: string[] };

export default function MeasuresDrawer({
  open, onClose, riskName, reco, onAddMeasure,
}: {
  open: boolean;
  onClose: () => void;
  riskName: string;
  reco: any;                     // objet renvoyé par recommendDUERP
  onAddMeasure: (label: string) => void;
}) {
  if (!open) return null;
  const measures: Measures = reco?.measures?.[riskName] || {};
  const actions = (reco?.actions?.items || reco?.actions || []).filter((a: any) => a.applies_to_risk === riskName);

  const Block = ({ title, items }: { title: string; items: string[] }) => (
    <div className="mb-4">
      <h4 className="mb-1 font-semibold text-slate">{title}</h4>
      {(!items || items.length === 0) ? <p className="text-xs text-slate/60">—</p> : (
        <ul className="space-y-1 text-sm">
          {items.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span>{m}</span>
              <button className="rounded-lg bg-ocean px-2 py-1 text-xs font-semibold text-white" onClick={() => onAddMeasure(m)}>
                ➕ Ajouter
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[420px] overflow-y-auto bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Mesures — {riskName}</h3>
          <button className="rounded-lg px-3 py-1 text-sm text-slate hover:bg-slate/10" onClick={onClose}>✕ Fermer</button>
        </div>

        <p className="mb-3 text-xs text-slate/60">Ajoutez des mesures dans “Mesures à proposer”.</p>
        <Block title="CO — Collectives" items={measures.CO || []} />
        <Block title="ORG — Organisationnelles" items={measures.ORG || []} />
        <Block title="TE — Techniques" items={measures.TE || []} />
        <Block title="IND — Individuelles / EPI" items={measures.IND || []} />

        <hr className="my-4" />
        <h4 className="mb-1 font-semibold text-slate">Actions types</h4>
        {(actions.length === 0) ? <p className="text-xs text-slate/60">—</p> : (
          <ul className="space-y-1 text-sm">
            {actions.map((a: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>{a.action} <small className="text-slate/60">({a.eta}, {a.cost}, P{a.recommended_priority})</small></span>
                <button className="rounded-lg bg-ocean px-2 py-1 text-xs font-semibold text-white" onClick={() => onAddMeasure(a.action)}>➕ Ajouter</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
