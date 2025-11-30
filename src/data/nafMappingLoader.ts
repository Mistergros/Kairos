import mapping from "../../kairos_duerp_naf_mapping.json";

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

  const { sections = {}, divisions = {}, overrides = {} } = typedMapping.rules || {};

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

  // Section non utilisée ici (code NAF ne porte pas la lettre), mais on garde la place pour extension future.
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
