export type ScoreField = 'gravity' | 'frequency' | 'control';

export type ScoringOption = {
  label: string;
  value: number;
  helper?: string;
};

export type ScoringQuestion = {
  id: string;
  label: string;
  field: ScoreField;
  helper?: string;
  options: ScoringOption[];
};

const generalQuestions: ScoringQuestion[] = [
  {
    id: 'exposition',
    label: 'Fréquence d’exposition',
    field: 'frequency',
    options: [
      { label: 'Occasionnelle', value: 3 },
      { label: 'Hebdomadaire', value: 5 },
      { label: 'Quotidienne / forte', value: 8 },
    ],
  },
  {
    id: 'maitrise',
    label: 'Maîtrise / protections collectives',
    field: 'control',
    options: [
      { label: 'Mesures robustes (ventilation, écrans, procédures)', value: 0.4 },
      { label: 'Mesures partielles', value: 0.7 },
      { label: 'Peu ou pas de maîtrise', value: 1 },
    ],
  },
  {
    id: 'gravite',
    label: 'Sévérité potentielle',
    field: 'gravity',
    options: [
      { label: 'Blessures légères', value: 5 },
      { label: 'Blessures sérieuses', value: 8 },
      { label: 'Accident grave ou décès', value: 10 },
    ],
  },
];

const scoringByCategory: Record<string, ScoringQuestion[]> = {
  'Risque toxique / chimique': [
    {
      id: 'volumes',
      label: 'Volumes / fréquence d’utilisation des produits',
      field: 'frequency',
      options: [
        { label: 'Petits volumes, tâches ponctuelles', value: 3 },
        { label: 'Volumes modérés / réguliers', value: 5 },
        { label: 'Gros volumes ou quotidien', value: 8 },
      ],
    },
    {
      id: 'captage',
      label: 'Ventilation / captage à la source',
      field: 'control',
      options: [
        { label: 'Captage efficace / local', value: 0.4 },
        { label: 'Ventilation générale seulement', value: 0.7 },
        { label: 'Pas de captage ni ventilation', value: 1 },
      ],
    },
    {
      id: 'epi-formation',
      label: 'EPI adaptés et formation produits chimiques',
      field: 'gravity',
      options: [
        { label: 'EPI adaptés + formation récente', value: 6 },
        { label: 'EPI partiels ou formation partielle', value: 8 },
        { label: 'EPI absents / formation inexistante', value: 10 },
      ],
    },
  ],
  'Risque mécanique (machines/outils)': [
    {
      id: 'protections',
      label: 'Protections machines (carters, arrêts d’urgence)',
      field: 'control',
      options: [
        { label: 'Protections en place et testées', value: 0.3 },
        { label: 'Protections partielles', value: 0.6 },
        { label: 'Protections absentes ou shuntées', value: 1 },
      ],
    },
    {
      id: 'formation',
      label: 'Formation / habilitation aux machines',
      field: 'frequency',
      options: [
        { label: 'Opérateurs formés et autorisés', value: 3 },
        { label: 'Formation informelle', value: 5 },
        { label: 'Pas de formation / intérim non formé', value: 8 },
      ],
    },
    {
      id: 'maintenance',
      label: 'Maintenance préventive',
      field: 'control',
      options: [
        { label: 'Plan préventif suivi', value: 0.4 },
        { label: 'Maintenance ponctuelle', value: 0.7 },
        { label: 'Pas de maintenance organisée', value: 1 },
      ],
    },
  ],
  'Risque électrique': [
    {
      id: 'habilitation',
      label: 'Habilitation électrique des intervenants',
      field: 'frequency',
      options: [
        { label: 'Tous habilités selon tâche', value: 3 },
        { label: 'Habilitation partielle', value: 5 },
        { label: 'Aucune habilitation', value: 8 },
      ],
    },
    {
      id: 'consignation',
      label: 'Consignation / mise hors tension',
      field: 'control',
      options: [
        { label: 'Procédure appliquée + vérifiée', value: 0.4 },
        { label: 'Procédure partielle', value: 0.7 },
        { label: 'Pas de consignation', value: 1 },
      ],
    },
    {
      id: 'environnement',
      label: 'Environnement (humide, exigu, extérieur)',
      field: 'gravity',
      options: [
        { label: 'Sec et maîtrisé', value: 6 },
        { label: 'Occasionnellement défavorable', value: 8 },
        { label: 'Humide/exigu régulièrement', value: 10 },
      ],
    },
  ],
  'Incendie / Explosion': [
    {
      id: 'combustibles',
      label: 'Présence de combustibles/inflammables',
      field: 'gravity',
      options: [
        { label: 'Faible charge combustible', value: 7 },
        { label: 'Charge moyenne', value: 9 },
        { label: 'Charge élevée / ATEX', value: 10 },
      ],
    },
    {
      id: 'stockage',
      label: 'Stockage, ventilation, séparation',
      field: 'control',
      options: [
        { label: 'Zone ventilée + séparée', value: 0.5 },
        { label: 'Ventilation simple', value: 0.8 },
        { label: 'Sans ventilation ni séparation', value: 1 },
      ],
    },
    {
      id: 'extinction',
      label: 'Moyens d’extinction / détection',
      field: 'control',
      options: [
        { label: 'Détection + extincteurs adaptés', value: 0.4 },
        { label: 'Extincteurs génériques', value: 0.7 },
        { label: 'Peu ou pas de moyens', value: 1 },
      ],
    },
  ],
  'Manutention manuelle': [
    {
      id: 'poids',
      label: 'Poids et fréquence de port de charges',
      field: 'gravity',
      options: [
        { label: '< 10 kg ou rare', value: 5 },
        { label: '10–20 kg régulier', value: 8 },
        { label: '> 20 kg ou très fréquent', value: 10 },
      ],
    },
    {
      id: 'aides',
      label: 'Aides mécaniques disponibles',
      field: 'control',
      options: [
        { label: 'Aides systématiques (rolls, transpalettes…) ', value: 0.5 },
        { label: 'Aides ponctuelles', value: 0.8 },
        { label: 'Aucune aide', value: 1 },
      ],
    },
    {
      id: 'formation-gestes',
      label: 'Formation gestes et postures / PRAP',
      field: 'frequency',
      options: [
        { label: 'Formation récente + rappels', value: 3 },
        { label: 'Formation ancienne', value: 5 },
        { label: 'Pas de formation', value: 8 },
      ],
    },
  ],
  'Manutention mécanique / engins': [
    {
      id: 'caces',
      label: 'CACES / autorisation de conduite',
      field: 'frequency',
      options: [
        { label: 'Tous titulaires et autorisés', value: 3 },
        { label: 'Autorisations partielles', value: 5 },
        { label: 'Pas d’autorisation formelle', value: 8 },
      ],
    },
    {
      id: 'circulation',
      label: 'Plan de circulation / balisage',
      field: 'control',
      options: [
        { label: 'Plan formalisé + balisage', value: 0.4 },
        { label: 'Règles orales', value: 0.7 },
        { label: 'Pas de règles', value: 1 },
      ],
    },
    {
      id: 'maintenance-engin',
      label: 'Maintenance et contrôles VGP',
      field: 'control',
      options: [
        { label: 'VGP et maintenance à jour', value: 0.4 },
        { label: 'Contrôles irréguliers', value: 0.7 },
        { label: 'Pas de contrôles planifiés', value: 1 },
      ],
    },
  ],
  'Chutes (plain-pied / hauteur)': [
    {
      id: 'hauteur',
      label: 'Travaux en hauteur / protections',
      field: 'gravity',
      options: [
        { label: 'Hauteur < 1 m ou protections complètes', value: 6 },
        { label: 'Hauteur 1–3 m protections partielles', value: 8 },
        { label: '> 3 m ou protections absentes', value: 10 },
      ],
    },
    {
      id: 'proprete',
      label: 'État des sols / rangement',
      field: 'frequency',
      options: [
        { label: 'Sols secs et dégagés', value: 3 },
        { label: 'Encombrement ponctuel', value: 5 },
        { label: 'Glissant / encombré souvent', value: 8 },
      ],
    },
    {
      id: 'equipement',
      label: 'Équipements (garde-corps, harnais, échelles sécurisées)',
      field: 'control',
      options: [
        { label: 'Équipements adaptés et contrôlés', value: 0.4 },
        { label: 'Équipements partiels', value: 0.7 },
        { label: 'Équipements absents ou dégradés', value: 1 },
      ],
    },
  ],
  'Risques psychosociaux (RPS)': [
    {
      id: 'charge',
      label: 'Charge de travail / délais',
      field: 'frequency',
      options: [
        { label: 'Charge régulée', value: 3 },
        { label: 'Pics fréquents', value: 5 },
        { label: 'Surcharge chronique', value: 8 },
      ],
    },
    {
      id: 'support',
      label: 'Soutien managérial / espaces de discussion',
      field: 'control',
      options: [
        { label: 'Instances régulières / prévention RPS', value: 0.5 },
        { label: 'Soutien informel', value: 0.8 },
        { label: 'Peu ou pas de soutien', value: 1 },
      ],
    },
    {
      id: 'public',
      label: 'Relation avec public/usagers difficile',
      field: 'gravity',
      options: [
        { label: 'Faible exposition', value: 6 },
        { label: 'Exposition régulière', value: 8 },
        { label: 'Exposition forte (conflits, violence)', value: 10 },
      ],
    },
  ],
  'Travail sur écran': [
    {
      id: 'duree-ecran',
      label: 'Temps quotidien sur écran',
      field: 'frequency',
      options: [
        { label: '< 4 h/jour', value: 3 },
        { label: '4–6 h/jour', value: 5 },
        { label: '> 6 h/jour', value: 8 },
      ],
    },
    {
      id: 'ergonomie',
      label: 'Ergonomie du poste (siège, hauteur écran)',
      field: 'control',
      options: [
        { label: 'Poste ergonomique réglable', value: 0.4 },
        { label: 'Réglages partiels', value: 0.7 },
        { label: 'Poste fixe non réglable', value: 1 },
      ],
    },
    {
      id: 'pauses',
      label: 'Micro-pauses / alternance des tâches',
      field: 'control',
      options: [
        { label: 'Micro-pauses et alternance', value: 0.5 },
        { label: 'Pauses ponctuelles', value: 0.8 },
        { label: 'Pas de pauses', value: 1 },
      ],
    },
  ],
  Bruit: [
    {
      id: 'niveau-bruit',
      label: 'Niveau sonore et durée',
      field: 'gravity',
      options: [
        { label: '< 80 dB(A) ou court', value: 6 },
        { label: '80–85 dB(A) régulier', value: 8 },
        { label: '> 85 dB(A) ou longue durée', value: 10 },
      ],
    },
    {
      id: 'mesures-bruit',
      label: 'Traitement acoustique / EPI anti-bruit',
      field: 'control',
      options: [
        { label: 'Traitement + EPI adaptés', value: 0.4 },
        { label: 'EPI seuls', value: 0.7 },
        { label: 'Peu ou pas de mesures', value: 1 },
      ],
    },
    {
      id: 'signalisation',
      label: 'Signalisation zones bruyantes',
      field: 'control',
      options: [
        { label: 'Zones balisées', value: 0.6 },
        { label: 'Signalisation ponctuelle', value: 0.8 },
        { label: 'Non balisé', value: 1 },
      ],
    },
  ],
  Biologique: [
    {
      id: 'contact',
      label: 'Fréquence de contact avec agents biologiques',
      field: 'frequency',
      options: [
        { label: 'Rare / indirect', value: 3 },
        { label: 'Régulier', value: 5 },
        { label: 'Fréquent / contact direct', value: 8 },
      ],
    },
    {
      id: 'hygiene',
      label: 'Mesures d’hygiène (lavage, EPI, procédures)',
      field: 'control',
      options: [
        { label: 'Procédures strictes + EPI', value: 0.4 },
        { label: 'Procédures partielles', value: 0.7 },
        { label: 'Peu ou pas de mesures', value: 1 },
      ],
    },
    {
      id: 'vaccination',
      label: 'Vaccination / surveillance médicale',
      field: 'control',
      options: [
        { label: 'Couverture adaptée', value: 0.5 },
        { label: 'Partielle', value: 0.8 },
        { label: 'Aucune', value: 1 },
      ],
    },
  ],
  'Risque routier': [
    {
      id: 'temps-route',
      label: 'Temps de conduite',
      field: 'frequency',
      options: [
        { label: '< 1 h/jour', value: 3 },
        { label: '1–3 h/jour', value: 5 },
        { label: '> 3 h/jour', value: 8 },
      ],
    },
    {
      id: 'organisation',
      label: 'Organisation trajets (planning, marges)',
      field: 'control',
      options: [
        { label: 'Trajets planifiés + marges', value: 0.5 },
        { label: 'Marge limitée', value: 0.8 },
        { label: 'Aucune marge / urgences fréquentes', value: 1 },
      ],
    },
    {
      id: 'etat-vehicule',
      label: 'État des véhicules',
      field: 'control',
      options: [
        { label: 'Entretien régulier', value: 0.5 },
        { label: 'Entretien partiel', value: 0.8 },
        { label: 'Entretien incertain', value: 1 },
      ],
    },
  ],
};

export const getQuestionsForCategory = (category: string): ScoringQuestion[] =>
  scoringByCategory[category] ?? generalQuestions;
