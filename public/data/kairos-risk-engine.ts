// kairos-risk-engine.ts
export type RiskMeasure = { CO: string[]; ORG: string[]; TE: string[]; IND: string[]; };
export type RiskItem = { risk: string; G: number; F: number; M: number; score: number; priority: 1|2|3|4; };
export type ActionItem = { action: string; applies_to_risk: string; recommended_priority: 1|2|3|4; owner_role: string; eta: string; cost: string; notes?: string; };
export type DuerpOutput = { naf: string; sectorLabel: string; units: { name: string }[]; inventory: RiskItem[]; measures: Record<string, RiskMeasure>; actions: ActionItem[]; version: string; };
type Mapping = any;

export async function loadJson<T=any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.json();
}

export async function buildFromAllInOne(baseUrl = "/data") {
  const data = await loadJson(`${baseUrl}/kairos_all_in_one.json`);
  return { mapping: data.mapping_naf, measures: data.measures, actions: data.actions, templates: data.sector_templates };
}

export async function buildFromModular(baseUrl = "/data") {
  const [mapping, b1, b2, b3, b4, actions] = await Promise.all([
    loadJson(`${baseUrl}/kairos_duerp_naf_mapping.json`),
    loadJson(`${baseUrl}/kairos_measures_block1_security.json`),
    loadJson(`${baseUrl}/kairos_measures_block2_ambiences_erg_psr.json`),
    loadJson(`${baseUrl}/kairos_measures_block3_chem_bio_env.json`),
    loadJson(`${baseUrl}/kairos_measures_block4_org_public_mobility_sector.json`),
    loadJson(`${baseUrl}/kairos_actions_library.json`),
  ]);
  return { mapping, measures: { block1_security: b1, block2_ambiences_erg_psr: b2, block3_chem_bio_env: b3, block4_org_public_mobility_sector: b4 }, actions };
}

function priorityFromScore(score: number): 1|2|3|4 {
  if (score >= 300) return 1;
  if (score >= 170) return 2;
  if (score >= 100) return 3;
  return 4;
}

function resolveRisksForNAF(mapping: Mapping, naf: string): string[] {
  const section = naf[0];
  const division = naf.slice(0, 2);
  const sec = mapping.rules.sections[section]?.risks ?? [];
  const div = mapping.rules.divisions[division]?.risks ?? [];
  const names = new Set<string>();
  [...sec, ...div].forEach((cat: any) => (cat.items || []).forEach((it: string) => names.add(it)));
  const ov = mapping.rules.overrides?.[naf];
  if (ov?.add) ov.add.forEach((cat: any) => (cat.items || []).forEach((it: string) => names.add(it)));
  return Array.from(names);
}

function measuresIndex(measures: any): Record<string, RiskMeasure> {
  const out: Record<string, RiskMeasure> = {};
  Object.values(measures).forEach((b: any) => (b.items || []).forEach((it: any) => { out[it.risk] = it.measures; }));
  return out;
}

function actionsForRisks(all: { items: ActionItem[] }, risks: string[]): ActionItem[] {
  const set = new Set(risks);
  return all.items.filter(a => set.has(a.applies_to_risk));
}

function defaultGFM(risk: string) {
  const low = new Set(["Éclairage / éblouissement","Travail sur écran","Chute de plain-pied"]);
  const isHigh = ["Chute de hauteur","Électricité","ATEX"].some(k => risk.includes(k));
  if (isHigh) return { G: 10, F: 3, M: 0.5 };
  if (low.has(risk)) return { G: 3, F: 7, M: 0.5 };
  return { G: 7, F: 7, M: 0.35 };
}

export async function recommendDUERP(naf: string, opts?: { baseUrl?: string; mode?: "modular" | "all-in-one"; unitsHint?: { name: string }[]; }): Promise<DuerpOutput> {
  const mode = opts?.mode || "modular";
  const baseUrl = opts?.baseUrl || "/data";
  const loader = mode === "all-in-one" ? buildFromAllInOne : buildFromModular;
  const { mapping, measures, actions } = await loader(baseUrl);

  const riskNames = resolveRisksForNAF(mapping, naf);
  const measIdx = measuresIndex(measures);
  const inventory = riskNames.map(name => {
    const { G, F, M } = defaultGFM(name);
    const score = Math.round(G * F * M);
    const priority = priorityFromScore(score);
    return { risk: name, G, F, M, score, priority };
  });

  const division = naf.slice(0,2);
  const sectorLabel = mapping.rules.divisions[division]?.label || mapping.rules.sections[naf[0]]?.label || "Secteur non identifié";
  const units = opts?.unitsHint || [{ name: "Unité principale" }];
  const actionsList = actionsForRisks(actions, riskNames);
  const selectedMeasures: Record<string, RiskMeasure> = {};
  riskNames.forEach(r => { if (measIdx[r]) selectedMeasures[r] = measIdx[r]; });

  return { naf, sectorLabel, units, inventory, measures: selectedMeasures, actions: actionsList, version: "1.0" };
}
