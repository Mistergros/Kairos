import { Hazard } from '../types';
import { riskLibrary } from '../data/riskLibrary';

const API_BASE = import.meta.env.VITE_DUERP_API_BASE || '';
const COMPANY_API = import.meta.env.VITE_COMPANY_API || (typeof window !== 'undefined' ? `${window.location.origin}/api/companies` : '');

const normalizeSector = (sector: string) => sector.toLowerCase().replace(/\s+/g, '-');

const sectorFallbacks: Record<string, Hazard[]> = {
  'btp': [
    {
      id: 'btp-chute-hauteur',
      category: 'Chutes (plain-pied / hauteur)',
      risk: 'Travaux en hauteur / échafaudage',
      damages: 'Chute de hauteur, fractures, décès',
      example_prevention: 'Plan de montage, garde-corps, harnais, contrôle journalier',
      source: 'OPPBTP',
      sector: 'BTP',
    },
    {
      id: 'btp-engins',
      category: 'Manutention mécanique / engins',
      risk: 'Circulation engins / zones partagées',
      damages: 'Collision, écrasement',
      example_prevention: 'Plan de circulation, balisage, chef de manœuvre, contrôle VGP',
      source: 'OPPBTP',
      sector: 'BTP',
    },
  ],
  'tertiaire': [
    {
      id: 'tertiaire-rps-charge',
      category: 'Risques psychosociaux (RPS)',
      risk: 'Charge mentale / délais courts',
      damages: 'Stress, épuisement',
      example_prevention: 'Priorisation, ajustement charges, espaces de discussion ANACT',
      source: 'ANACT',
      sector: 'Tertiaire',
    },
    {
      id: 'tertiaire-ecran',
      category: 'Travail sur écran',
      risk: 'Postes fixes mal aménagés',
      damages: 'TMS, fatigue visuelle',
      example_prevention: 'Ergonomie poste, pauses, filtres anti-reflets',
      source: 'INRS',
      sector: 'Tertiaire',
    },
  ],
  'logistique': [
    {
      id: 'logistique-chariots',
      category: 'Manutention mécanique / engins',
      risk: 'Conduite de chariots en allées étroites',
      damages: 'Collision, chute de charge',
      example_prevention: 'Formation CACES, miroirs, limitation vitesse, contrôle charge',
      source: 'CARSAT',
      sector: 'Logistique',
    },
    {
      id: 'logistique-manuelle',
      category: 'Manutention manuelle',
      risk: 'Prélèvements et port de charges répétitifs',
      damages: 'TMS, lombalgies',
      example_prevention: 'Aides à la manutention, rotation des postes, PRAP',
      source: 'INRS',
      sector: 'Logistique',
    },
  ],
  'medico-social': [
    {
      id: 'medico-transfert',
      category: 'Manutention manuelle',
      risk: 'Transferts de personnes dépendantes',
      damages: 'TMS, chute patient',
      example_prevention: 'Lève-personnes, travail en binôme, formation gestes',
      source: 'CARSAT / INRS',
      sector: 'Médico-social',
    },
    {
      id: 'medico-bio',
      category: 'Biologique',
      risk: 'Contact avec agents infectieux',
      damages: 'Infection, zoonose',
      example_prevention: 'Vaccination, procédures d’hygiène, EPI',
      source: 'ANSES / INRS',
      sector: 'Médico-social',
    },
  ],
};

const fetchJson = async <T>(path: string): Promise<T> => {
  if (!API_BASE) {
    throw new Error('API non configurée (VITE_DUERP_API_BASE)');
  }
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} en erreur (${res.status})`);
  }
  return (await res.json()) as T;
};

export const fetchHazardsFromSources = async (sector?: string, naf?: string): Promise<Hazard[]> => {
  const collected: Hazard[] = [];

  try {
    const generic = await fetchJson<Hazard[]>('/catalog/generic');
    collected.push(...generic);
  } catch (_) {
    // Pas d’API générique joignable, on laissera le fallback.
  }

  if (naf) {
    try {
      const byNaf = await fetchJson<Hazard[]>(`/catalog/naf/${encodeURIComponent(naf)}`);
      collected.push(...byNaf);
    } catch (_) {
      // Pas d'API NAF joignable
    }
  }

  if (sector) {
    try {
      const sectorHazards = await fetchJson<Hazard[]>(`/catalog/sector/${encodeURIComponent(sector)}`);
      collected.push(...sectorHazards);
    } catch (_) {
      // Pas d’API sectorielle joignable, on bascule sur les données locales.
    }
  }

  if (collected.length > 0) {
    return collected;
  }

  const fallback = [...riskLibrary];
  if (sector || naf) {
    const key = sector ? normalizeSector(sector) : '';
    if (key && sectorFallbacks[key]) {
      fallback.push(...sectorFallbacks[key]);
    }
  }
  return fallback;
};

export type CompanySearchHit = {
  id: string;
  name: string;
  siren?: string;
  siret?: string;
  naf?: string;
  address?: string;
  city?: string;
  postalCode?: string;
};

export const searchCompanies = async (query: string): Promise<CompanySearchHit[]> => {
  if (!query || query.length < 3) return [];

  try {
    const url = `${COMPANY_API}/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Recherche entreprise KO (${res.status})`);
    }
    return (await res.json()) as CompanySearchHit[];
  } catch (err) {
    console.warn('Recherche entreprise en erreur, utilisation du mock local.', err);
    return [
      {
        id: 'mock-1',
        name: `Demo ${query.toUpperCase()}`,
        siren: '123456789',
        siret: '12345678900011',
        naf: '62.01Z',
        address: '1 rue de la Paix',
        city: 'Paris',
        postalCode: '75002',
      },
    ];
  }
};
