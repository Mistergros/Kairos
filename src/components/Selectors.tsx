import { Establishment, WorkUnit } from "../types";
import { InfoHint } from "./Tooltip";

type Props = {
  establishments: Establishment[];
  workUnits: WorkUnit[];
  selectedEstablishmentId?: string;
  selectedWorkUnitId?: string;
  onSelectEstablishment: (id: string) => void;
  onSelectWorkUnit: (id: string) => void;
};

export const ContextSelectors = ({
  establishments,
  workUnits,
  selectedEstablishmentId,
  selectedWorkUnitId,
  onSelectEstablishment,
  onSelectWorkUnit,
}: Props) => {
  const unitsForEstablishment = workUnits.filter((w) => w.establishmentId === selectedEstablishmentId);
  return (
    <div className="flex flex-wrap gap-3">
      <label className="text-sm font-semibold text-slate flex w-full min-w-0 items-center gap-2 sm:w-auto">
        Établissement
        <InfoHint text="Toutes les pages (inventaire, plan d'action, exports...) n'affichent que les données de l'établissement choisi ici." />
        <select
          className="min-w-0 flex-1 rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm shadow-sm sm:max-w-xs"
          value={selectedEstablishmentId}
          onChange={(e) => onSelectEstablishment(e.target.value)}
          title="Choisissez l'établissement en cours"
        >
          {establishments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.clientName ? `${e.clientName} — ${e.name}` : e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate flex w-full min-w-0 items-center gap-2 sm:w-auto">
        Unité
        <InfoHint text="Change d'unité de travail pour voir son propre inventaire de risques." />
        <select
          className="min-w-0 flex-1 rounded-xl border border-slate/20 bg-white px-3 py-2 text-sm shadow-sm sm:max-w-xs"
          value={selectedWorkUnitId}
          onChange={(e) => onSelectWorkUnit(e.target.value)}
          title="Choisissez l'unité de travail"
        >
          {unitsForEstablishment.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
