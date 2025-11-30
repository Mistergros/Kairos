// Static hazard catalog used by the serverless endpoints.

export const genericHazards = [
  {
    id: 'gen-chimique-1',
    category: 'Risque toxique / chimique',
    risk: 'Produits corrosifs ou irritants',
    damages: 'Brulures, allergies',
    example_prevention: 'Substitution, captage a la source, EPI',
    source: 'INRS',
    sector: 'Tous',
  },
  {
    id: 'gen-chute-1',
    category: 'Chutes (plain-pied / hauteur)',
    risk: 'Sol glissant ou encombre',
    damages: 'Entorse, fracture',
    example_prevention: 'Entretien, rangement, eclairage, chaussures adaptees',
    source: 'INRS',
    sector: 'Tous',
  },
  {
    id: 'gen-rps-1',
    category: 'Risques psychosociaux (RPS)',
    risk: 'Charge mentale ou delais courts',
    damages: 'Stress, epuisement',
    example_prevention: 'Priorisation, ajustement charge, espaces de discussion',
    source: 'ANACT',
    sector: 'Tous',
  },
  {
    id: 'gen-bruit-1',
    category: 'Bruit',
    risk: 'Ambiance bruyante',
    damages: 'Inconfort, baisse concentration',
    example_prevention: 'Traitement acoustique, bouchons, isolement',
    source: 'INRS',
    sector: 'Tous',
  },
  {
    id: 'gen-incendie-1',
    category: 'Incendie / Explosion',
    risk: 'Stockage produits inflammables',
    damages: 'Brulures, intoxication',
    example_prevention: 'Suppression sources ignition, extincteurs, separation',
    source: 'INRS',
    sector: 'Tous',
  },
];

export const sectorHazards = {
  btp: [
    {
      id: 'btp-chute-hauteur',
      category: 'Chutes (plain-pied / hauteur)',
      risk: 'Travaux en hauteur / echafaudage',
      damages: 'Chute de hauteur, fractures',
      example_prevention: 'Plan de montage, garde-corps, harnais, controle journalier',
      source: 'OPPBTP',
      sector: 'BTP',
    },
    {
      id: 'btp-engins',
      category: 'Manutention mecanique / engins',
      risk: 'Circulation engins en zones partagees',
      damages: 'Collision, ecrasement',
      example_prevention: 'Plan de circulation, balisage, chef de manoeuvre, controles VGP',
      source: 'OPPBTP',
      sector: 'BTP',
    },
  ],
  tertiaire: [
    {
      id: 'tertiaire-poste-ecran',
      category: 'Travail sur ecran',
      risk: 'Postes fixes mal amenages',
      damages: 'TMS, fatigue visuelle',
      example_prevention: 'Ergonomie poste, pauses, filtres anti-reflets',
      source: 'INRS',
      sector: 'Tertiaire',
    },
    {
      id: 'tertiaire-rps',
      category: 'Risques psychosociaux (RPS)',
      risk: 'Tensions avec public ou charge emotionnelle',
      damages: 'Stress, burnout',
      example_prevention: 'Formation gestion conflit, cellules d ecoute, regulation charge',
      source: 'ANACT',
      sector: 'Tertiaire',
    },
  ],
  logistique: [
    {
      id: 'logistique-chariots',
      category: 'Manutention mecanique / engins',
      risk: 'Conduite de chariots en allees etroites',
      damages: 'Collision, chute de charge',
      example_prevention: 'CACES, miroirs, limitation vitesse, controle charge',
      source: 'CARSAT',
      sector: 'Logistique',
    },
    {
      id: 'logistique-manuelle',
      category: 'Manutention manuelle',
      risk: 'Prelevements et ports repetitifs',
      damages: 'TMS, lombalgies',
      example_prevention: 'Aides a la manutention, rotation des postes, PRAP',
      source: 'INRS',
      sector: 'Logistique',
    },
  ],
  'medico-social': [
    {
      id: 'medico-transfert',
      category: 'Manutention manuelle',
      risk: 'Transferts de personnes dependantes',
      damages: 'TMS, chute patient',
      example_prevention: 'Leve-personnes, travail en binome, formation gestes',
      source: 'CARSAT',
      sector: 'Medico-social',
    },
    {
      id: 'medico-bio',
      category: 'Biologique',
      risk: 'Contact agents infectieux',
      damages: 'Infection, zoonose',
      example_prevention: 'Vaccination, hygiene, EPI, procedures de decontamination',
      source: 'ANSES',
      sector: 'Medico-social',
    },
  ],
};

// Placeholder for future NAF-specific hazards.
export const nafHazards = {};

export const normalizeSector = (value) => value.toLowerCase().replace(/\s+/g, '-');
