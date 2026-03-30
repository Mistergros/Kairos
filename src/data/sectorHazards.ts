import type { Hazard } from "../types";

// Sector presets (ASCII labels to avoid encoding issues)
const itHazards: Hazard[] = [
  { id: "it-ecran", category: "Travail sur ecran", risk: "Postes mal ajustes", damages: "TMS, fatigue visuelle", example_prevention: "Ergonomie poste, pauses, alternance taches", sector: "Informatique" },
  { id: "it-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale / pression client", damages: "Stress, epuisement", example_prevention: "Planification, priorisation, rituels equipe", sector: "Informatique" },
  { id: "it-posture", category: "Postures de travail", risk: "Station assise prolongee", damages: "Lombalgies, TMS", example_prevention: "Assis-debout, pauses actives, ergonomie", sector: "Informatique" },
  { id: "it-elec", category: "Risque electrique", risk: "Multiprises, baies serveurs", damages: "Incendie, electrocution", example_prevention: "Prises aux normes, parasurtenseurs, maintenance", sector: "Informatique" },
];

const consultingHazards: Hazard[] = [
  { id: "consult-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale, delais", damages: "Stress, epuisement", example_prevention: "Planification realiste, priorisation, soutien manager", sector: "Conseil" },
  { id: "consult-ecran", category: "Travail sur ecran", risk: "Postes fixes mal amenages", damages: "TMS, fatigue visuelle", example_prevention: "Ecran hauteur yeux, pauses, reglage siege", sector: "Conseil" },
  { id: "consult-deplacement", category: "Risque routier", risk: "Deplacements chez clients", damages: "Accident, fatigue", example_prevention: "Marge planning, politique trajets, entretien vehicule", sector: "Conseil" },
];

const btpHazards: Hazard[] = [
  { id: "btp-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travaux en hauteur / echafaudage", damages: "Chute de hauteur, fractures", example_prevention: "Garde-corps, harnais, controle echafaudage", sector: "BTP" },
  { id: "btp-engins", category: "Manutention mecanique / engins", risk: "Circulation engins", damages: "Collision, ecrasement", example_prevention: "Plan de circulation, balisage, VGP", sector: "BTP" },
  { id: "btp-poussiere", category: "Risque toxique / chimique", risk: "Poussieres (silice, ciment)", damages: "Irritation, pathologies respiratoires", example_prevention: "Aspiration a la source, arrosage, FFP2/3", sector: "BTP" },
];

const medicoHazards: Hazard[] = [
  { id: "medico-bio", category: "Biologique", risk: "Contact agents infectieux", damages: "Infection, zoonose", example_prevention: "Vaccination, hygiene, EPI", sector: "Medico-social" },
  { id: "medico-transfert", category: "Manutention manuelle", risk: "Transfert personnes dependantes", damages: "TMS, chute patient", example_prevention: "Leve-personnes, binome, formation gestes", sector: "Medico-social" },
  { id: "medico-rps", category: "Risques psychosociaux (RPS)", risk: "Charge emotionnelle", damages: "Stress, epuisement", example_prevention: "Supervision, regulation, effectifs adaptes", sector: "Medico-social" },
];

const logistiqueHazards: Hazard[] = [
  { id: "logi-chariot", category: "Manutention mecanique / engins", risk: "Chariots en allees etroites", damages: "Collision, chute de charge", example_prevention: "CACES, miroirs, limitation vitesse", sector: "Logistique" },
  { id: "logi-manuelle", category: "Manutention manuelle", risk: "Prelevements et port repetes", damages: "TMS, lombalgies", example_prevention: "Aides manutention, rotation postes", sector: "Logistique" },
  { id: "logi-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombres, quais", damages: "Entorse, fracture", example_prevention: "Rangement, eclairage, EPI", sector: "Logistique" },
];

const agriHazards: Hazard[] = [
  { id: "agri-manuelle", category: "Manutention manuelle", risk: "Port de charges, gestes repetitifs", damages: "TMS, lombalgies", example_prevention: "Aides mecanisees, pauses, formation gestes", sector: "Agriculture" },
  { id: "agri-bio", category: "Biologique", risk: "Contact animaux/agents biologiques", damages: "Infection, allergie", example_prevention: "Vaccination, hygiene, EPI", sector: "Agriculture" },
  { id: "agri-machines", category: "Risque mecanique (machines/outils)", risk: "Outils/machines agricoles", damages: "Coupures, ecrasement", example_prevention: "Protections, formation, maintenance", sector: "Agriculture" },
];

const hospitalityHazards: Hazard[] = [
  { id: "host-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols glissants (cuisine, nettoyage)", damages: "Entorse, fracture", example_prevention: "Chaussures antiderapantes, signalisation", sector: "Hotellerie-Restauration" },
  { id: "host-brulure", category: "Risque thermique / chimique", risk: "Brulures (fours, produits)", damages: "Brulures, irritations", example_prevention: "EPI, procedures, rangement produits", sector: "Hotellerie-Restauration" },
  { id: "host-rps", category: "Risques psychosociaux (RPS)", risk: "Horaires decales, relation clientele", damages: "Stress, fatigue", example_prevention: "Planification, pauses, soutien managerial", sector: "Hotellerie-Restauration" },
];

const retailHazards: Hazard[] = [
  { id: "retail-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombres, rayonnages", damages: "Entorse, fracture", example_prevention: "Rangement, signalisation, EPI", sector: "Commerce" },
  { id: "retail-manuelle", category: "Manutention manuelle", risk: "Manutention colis/stock", damages: "TMS, lombalgies", example_prevention: "Aides manutention, formation gestes", sector: "Commerce" },
  { id: "retail-rps", category: "Risques psychosociaux (RPS)", risk: "Relation clientele difficile", damages: "Stress, choc emotionnel", example_prevention: "Formation gestion conflit, procedures", sector: "Commerce" },
];

const servicesProHazards: Hazard[] = [
  { id: "service-produit", category: "Risque toxique / chimique", risk: "Produits de nettoyage", damages: "Irritation, brulure", example_prevention: "Substitution, gants, ventilation", sector: "Services" },
  { id: "service-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travail en hauteur/escabeau", damages: "Chute, entorse", example_prevention: "Escabeaux securises, formation, rangement", sector: "Services" },
  { id: "service-rps", category: "Risques psychosociaux (RPS)", risk: "Pression client, rythme eleve", damages: "Stress, fatigue", example_prevention: "Organisation, pauses, soutien equipe", sector: "Services" },
];

const transportHazards: Hazard[] = [
  { id: "transport-routier", category: "Risque routier", risk: "Temps de conduite prolonges", damages: "Accident, fatigue", example_prevention: "Planning, pauses, entretien vehicule", sector: "Transport" },
  { id: "transport-manuelle", category: "Manutention manuelle", risk: "Chargement/dechargement", damages: "TMS, chutes", example_prevention: "Aides mecanique, posture, EPI", sector: "Transport" },
  { id: "transport-chute", category: "Chutes (plain-pied / hauteur)", risk: "Montee/descente vehicules", damages: "Entorse, fracture", example_prevention: "Marchepieds, nettoyage, vigilance", sector: "Transport" },
];

const educationHazards: Hazard[] = [
  { id: "edu-rps", category: "Risques psychosociaux (RPS)", risk: "Tensions avec public", damages: "Stress, epuisement", example_prevention: "Mediation, soutien equipe, gestion classe", sector: "Education" },
  { id: "edu-chute", category: "Chutes (plain-pied / hauteur)", risk: "Deplacements, escaliers", damages: "Entorse, fracture", example_prevention: "Entretien sols, eclairage", sector: "Education" },
  { id: "edu-manuelle", category: "Manutention manuelle", risk: "Deplacement de mobilier/materiel", damages: "TMS, lombalgies", example_prevention: "Aides materiel, posture, binome", sector: "Education" },
];

export const hazardByNafPrefix: Record<string, Hazard[]> = {
  "62": itHazards,
  "63": itHazards,
  "70": consultingHazards,
  "41": btpHazards,
  "42": btpHazards,
  "43": btpHazards,
  "49": transportHazards,
  "50": transportHazards,
  "51": transportHazards,
  "52": logistiqueHazards,
  "86": medicoHazards,
  "87": medicoHazards,
  "01": agriHazards,
  "02": agriHazards,
  "03": agriHazards,
  "55": hospitalityHazards,
  "56": hospitalityHazards,
  "45": retailHazards,
  "46": retailHazards,
  "47": retailHazards,
  "80": servicesProHazards,
  "81": servicesProHazards,
  "85": educationHazards,
};
