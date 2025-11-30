import mapping from "../../kairos_duerp_naf_mapping.json";
import { Hazard } from "../types";

type MappingCategory = {
  category: string;
  label: string;
  items: string[];
};

type NafMapping = {
  rules?: {
    sections?: Record<string, { label: string; risks: MappingCategory[] }>;
    divisions?: Record<string, { label: string; risks: MappingCategory[] }>;
    overrides?: Record<string, { label: string; add: MappingCategory[]; remove_categories?: string[] }>;
  };
};

const typedMapping = mapping as NafMapping;

const normalizeCode = (code?: string) => code?.trim().toUpperCase() ?? "";
const extractDivision = (code: string) => {
  const match = code.match(/\d{2}/);
  return match ? match[0] : "";
};

export type NafHint = {
  category: string;
  label: string;
  items: string[];
};

/**
 * Retourne les risques (catégories + items) issus du mapping NAF :
 * - override exact (ex: 62.02A) si présent
 * - sinon division (ex: 62)
 * (sections ne sont pas utilisées ici faute de lettre explicite dans le code NAF)
 */
export const getNafHints = (nafCode?: string): NafHint[] => {
  const code = normalizeCode(nafCode);
  if (!code) return [];

  const { divisions = {}, overrides = {} } = typedMapping.rules || {};

  const fromOverride = overrides[code];
  const divisionKey = extractDivision(code);
  const fromDivision = divisionKey ? divisions[divisionKey] : undefined;

  const collected: NafHint[] = [];
  const pushAll = (source?: { risks: MappingCategory[] }) => {
    source?.risks?.forEach((r) => {
      collected.push({
        category: r.category,
        label: r.label,
        items: r.items,
      });
    });
  };

  pushAll(fromDivision);

  if (fromOverride) {
    pushAll({ risks: fromOverride.add });
    if (fromOverride.remove_categories?.length) {
      const toRemove = new Set(fromOverride.remove_categories);
      return collected.filter((r) => !toRemove.has(r.category));
    }
  }

  // Dédoublonnage par category + label
  const seen = new Set<string>();
  return collected.filter((r) => {
    const key = `${r.category}-${r.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Pondérations par grande catégorie (approximation générique)
const defaultWeights: Record<
  string,
  { gravity: number; frequency: number; control: number }
> = {
  security: { gravity: 8, frequency: 5, control: 0.8 },
  ergonomics: { gravity: 6, frequency: 5, control: 0.8 },
  psr: { gravity: 8, frequency: 6, control: 0.8 },
  ambiences: { gravity: 6, frequency: 5, control: 0.8 },
  chemical: { gravity: 7, frequency: 5, control: 0.8 },
  biological: { gravity: 8, frequency: 5, control: 0.8 },
  org: { gravity: 6, frequency: 5, control: 0.8 },
  workplace: { gravity: 6, frequency: 5, control: 0.8 },
  env: { gravity: 6, frequency: 4, control: 0.8 },
  public: { gravity: 6, frequency: 5, control: 0.8 },
  mobility: { gravity: 7, frequency: 6, control: 0.8 },
  sector_specific: { gravity: 8, frequency: 6, control: 0.9 },
};

// Transforme les pistes NAF en hazards concrets à afficher/pondérer
export const buildHazardsFromMapping = (nafCode?: string): (Hazard & { gravity?: number; frequency?: number; control?: number })[] => {
  const hints = getNafHints(nafCode);
  if (!hints.length) return [];

  const hazards: (Hazard & { gravity?: number; frequency?: number; control?: number })[] = [];
  hints.forEach((hint) => {
    const weights = defaultWeights[hint.category] ?? { gravity: 6, frequency: 5, control: 0.8 };
    hint.items.forEach((item) => {
      const id = `naf-${hint.category}-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      hazards.push({
        id,
        category: hint.label,
        risk: item,
        damages: item,
        example_prevention: "",
        gravity: weights.gravity,
        frequency: weights.frequency,
        control: weights.control,
      });
    });
  });

  // Dédoublonnage par id
  const seen = new Set<string>();
  return hazards.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
};
