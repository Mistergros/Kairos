export type RiskMeasure = { CO?: string[]; ORG?: string[]; TE?: string[]; IND?: string[] };

async function loadJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

function priorityFromScore(score: number): 1 | 2 | 3 | 4 {
  if (score >= 300) return 1;
  if (score >= 170) return 2;
  if (score >= 100) return 3;
  return 4;
}

function defaultGFM(risk: string) {
  const high = ["Chute de hauteur", "Électricité", "ATEX", "CMR"];
  if (high.some((k) => risk.includes(k))) return { G: 10, F: 3, M: 0.5 };
  if (["Travail sur écran", "Éclairage / éblouissement", "Chute de plain-pied"].includes(risk)) return { G: 3, F: 7, M: 0.5 };
  return { G: 7, F: 7, M: 0.35 };
}

function measuresIndex(measures: any): Record<string, RiskMeasure> {
  const out: Record<string, RiskMeasure> = {};
  Object.values(measures).forEach((b: any) =>
    (b as any).items?.forEach((it: any) => {
      if (it?.risk) out[it.risk] = it.measures as RiskMeasure;
    })
  );
  return out;
}

function resolveRisksForNAF(mapping: any, naf: string): string[] {
  const section = naf[0];
  const division = naf.slice(0, 2);
  const names = new Set<string>();
  const sec = mapping.rules?.sections?.[section]?.risks ?? [];
  const div = mapping.rules?.divisions?.[division]?.risks ?? [];
  [...sec, ...div].forEach((cat: any) => (cat.items || []).forEach((it: string) => names.add(it)));
  const ov = mapping.rules?.overrides?.[naf];
  if (ov?.add) ov.add.forEach((cat: any) => (cat.items || []).forEach((it: string) => names.add(it)));
  return Array.from(names);
}

export async function recommendDUERP(naf: string, opts?: { baseUrl?: string; mode?: "modular" | "all-in-one" }) {
  const baseUrl = opts?.baseUrl || "/data";
  const data = {
    mapping_naf: await loadJson(`${baseUrl}/kairos_duerp_naf_mapping.json`),
    measures: {
      block1_security: await loadJson(`${baseUrl}/kairos_measures_block1_security.json`),
      block2_ambiences_erg_psr: await loadJson(`${baseUrl}/kairos_measures_block2_ambiences_erg_psr.json`),
      block3_chem_bio_env: await loadJson(`${baseUrl}/kairos_measures_block3_chem_bio_env.json`),
      block4_org_public_mobility_sector: await loadJson(`${baseUrl}/kairos_measures_block4_org_public_mobility_sector.json`),
    },
    actions: await loadJson(`${baseUrl}/kairos_actions_library.json`),
  };

  const mapping = data.mapping_naf;
  const measures = data.measures;
  const actions = data.actions;

  const riskNames = resolveRisksForNAF(mapping, naf);
  const measIdx = measuresIndex(measures);

  const inventory = riskNames.map((name: string) => {
    const { G, F, M } = defaultGFM(name);
    const score = Math.round(G * F * M);
    const priority = priorityFromScore(score);
    return { risk: name, G, F, M, score, priority };
  });

  const selectedMeasures: Record<string, RiskMeasure> = {};
  riskNames.forEach((r) => {
    if (measIdx[r]) selectedMeasures[r] = measIdx[r];
  });

  return { naf, inventory, measures: selectedMeasures, actions };
}
