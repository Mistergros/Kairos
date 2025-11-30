import { Hazard } from "../types";

export type NafPreset = { label: string; hazards: (Hazard & { gravity?: number; frequency?: number; control?: number })[] };

// Source: inspirations INRS/OPPBTP par grands secteurs, pondérations génériques par activité.
// ASCII uniquement pour éviter les soucis d'encodage.
export const nafPresets: Record<string, NafPreset> = {
  "01": {
    label: "Agriculture / Elevage",
    hazards: [
      { id: "naf01-machines", category: "Risque mecanique (machines/outils)", risk: "Outils et machines agricoles", damages: "Coupures, ecrasement", example_prevention: "Protections, maintenance, formation", gravity: 9, frequency: 7, control: 1 },
      { id: "naf01-phyto", category: "Risque toxique / chimique", risk: "Exposition produits phytosanitaires", damages: "Irritation, intoxication", example_prevention: "Substitution, EPI, ventilation", gravity: 8, frequency: 6, control: 0.9 },
      { id: "naf01-bio", category: "Biologique", risk: "Contact animaux/agents biologiques", damages: "Infection, allergie", example_prevention: "Vaccination, hygiene, EPI", gravity: 8, frequency: 5, control: 0.8 },
    ],
  },
  "62": {
    label: "Informatique / Services numeriques",
    hazards: [
      { id: "naf62-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale / pression client / delais courts", damages: "Stress, epuisement", example_prevention: "Planification sprints, priorisation, points d'equipe reguliers", gravity: 8, frequency: 6, control: 0.8 },
      { id: "naf62-ecran", category: "Travail sur ecran", risk: "Postes fixes mal amenages, usage prolonge", damages: "TMS, fatigue visuelle", example_prevention: "Ergonomie poste, alternance taches, pauses", gravity: 6, frequency: 7, control: 0.6 },
      { id: "naf62-routier", category: "Risque routier", risk: "Deplacements frequents (clients/projets)", damages: "Accident, fatigue", example_prevention: "Marge planning, politique trajets, entretien vehicule", gravity: 7, frequency: 5, control: 0.8 },
    ],
  },
  "70": {
    label: "Conseil / Management",
    hazards: [
      { id: "naf70-rps", category: "Risques psychosociaux (RPS)", risk: "Charge mentale, objectifs eleves", damages: "Stress, epuisement", example_prevention: "Priorisation, regulation charge, soutien manager", gravity: 9, frequency: 7, control: 0.8 },
      { id: "naf70-ecran", category: "Travail sur ecran", risk: "Postes fixes mal amenages", damages: "TMS, fatigue visuelle", example_prevention: "Ergonomie, pauses, reglage siege/ecran", gravity: 6, frequency: 7, control: 0.6 },
      { id: "naf70-routier", category: "Risque routier", risk: "Deplacements clientele", damages: "Accident, fatigue", example_prevention: "Politique trajets, marges, entretien vehicule", gravity: 8, frequency: 5, control: 0.8 },
    ],
  },
  "43": {
    label: "Construction / Chantier",
    hazards: [
      { id: "naf43-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travaux en hauteur / echafaudage", damages: "Chute de hauteur, fractures", example_prevention: "Garde-corps, harnais, controle echafaudage", gravity: 9, frequency: 8, control: 1 },
      { id: "naf43-engins", category: "Manutention mecanique / engins", risk: "Engins en zones partagees", damages: "Collision, ecrasement", example_prevention: "Plan de circulation, balisage, VGP", gravity: 9, frequency: 7, control: 1 },
      { id: "naf43-poussiere", category: "Risque toxique / chimique", risk: "Poussieres (silice, ciment)", damages: "Irritation, pathologies respiratoires", example_prevention: "Aspiration source, arrosage, FFP2/3", gravity: 8, frequency: 7, control: 0.9 },
    ],
  },
  "49": {
    label: "Transport",
    hazards: [
      { id: "naf49-routier", category: "Risque routier", risk: "Temps de conduite prolonges", damages: "Accident, fatigue", example_prevention: "Pauses, planning, entretien vehicule", gravity: 9, frequency: 8, control: 0.9 },
      { id: "naf49-chute", category: "Chutes (plain-pied / hauteur)", risk: "Montee/descente vehicules, quais", damages: "Entorse, fracture", example_prevention: "Marchepieds, proprete, eclairage", gravity: 7, frequency: 6, control: 0.8 },
      { id: "naf49-manuelle", category: "Manutention manuelle", risk: "Chargement/dechargement", damages: "TMS, chutes", example_prevention: "Aides mecaniques, posture, EPI", gravity: 8, frequency: 6, control: 0.8 },
    ],
  },
  "52": {
    label: "Logistique / Entrepots",
    hazards: [
      { id: "naf52-chariot", category: "Manutention mecanique / engins", risk: "Chariots, engins en allees", damages: "Collision, chute de charge", example_prevention: "CACES, balisage, controle engins", gravity: 8, frequency: 7, control: 0.9 },
      { id: "naf52-manuelle", category: "Manutention manuelle", risk: "Prelevements et port repetes", damages: "TMS, lombalgies", example_prevention: "Aides manutention, rotation postes", gravity: 7, frequency: 6, control: 0.8 },
      { id: "naf52-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombre ou quais", damages: "Entorse, fracture", example_prevention: "Rangement, eclairage, EPI", gravity: 7, frequency: 6, control: 0.8 },
    ],
  },
  "55": {
    label: "Hotellerie / Restauration",
    hazards: [
      { id: "naf55-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols glissants (cuisine, salle)", damages: "Entorse, fracture", example_prevention: "Chaussures antiderapantes, entretien", gravity: 7, frequency: 6, control: 0.8 },
      { id: "naf55-brulure", category: "Risque thermique / chimique", risk: "Brulures (fours, liquides chauds, produits)", damages: "Brulures", example_prevention: "EPI, procedures, rangement produits", gravity: 8, frequency: 6, control: 0.8 },
      { id: "naf55-rps", category: "Risques psychosociaux (RPS)", risk: "Horaires decales, relation clientele", damages: "Stress, fatigue", example_prevention: "Planification, pauses, soutien manager", gravity: 7, frequency: 6, control: 0.7 },
    ],
  },
  "45": {
    label: "Commerce / Vente",
    hazards: [
      { id: "naf45-chute", category: "Chutes (plain-pied / hauteur)", risk: "Sols encombres, rayonnages", damages: "Entorse, fracture", example_prevention: "Rangement, signalisation, EPI", gravity: 6, frequency: 5, control: 0.6 },
      { id: "naf45-manuelle", category: "Manutention manuelle", risk: "Colis/stock", damages: "TMS, lombalgies", example_prevention: "Aides manutention, formation gestes", gravity: 6, frequency: 5, control: 0.6 },
      { id: "naf45-rps", category: "Risques psychosociaux (RPS)", risk: "Relation clientele difficile", damages: "Stress, choc emotionnel", example_prevention: "Formation gestion conflit, procedures", gravity: 6, frequency: 4, control: 0.6 },
    ],
  },
  "80": {
    label: "Services aux entreprises / Nettoyage",
    hazards: [
      { id: "naf80-produit", category: "Risque toxique / chimique", risk: "Produits de nettoyage", damages: "Irritation, brulure", example_prevention: "Substitution, gants, ventilation", gravity: 7, frequency: 6, control: 0.8 },
      { id: "naf80-chute", category: "Chutes (plain-pied / hauteur)", risk: "Travail en hauteur/escabeau", damages: "Chute, entorse", example_prevention: "Escabeau securise, rangement, formation", gravity: 6, frequency: 6, control: 0.7 },
      { id: "naf80-rps", category: "Risques psychosociaux (RPS)", risk: "Pression client, rythme eleve", damages: "Stress, fatigue", example_prevention: "Organisation, pauses, soutien equipe", gravity: 6, frequency: 5, control: 0.6 },
    ],
  },
  "86": {
    label: "Sante / Medico-social",
    hazards: [
      { id: "naf86-bio", category: "Biologique", risk: "Contact agents infectieux", damages: "Infection, zoonose", example_prevention: "Hygiene, vaccination, EPI", gravity: 9, frequency: 7, control: 0.9 },
      { id: "naf86-transfert", category: "Manutention manuelle", risk: "Transfert patients/personnes dependantes", damages: "TMS, chute patient", example_prevention: "Leve-personnes, binome, formation gestes", gravity: 8, frequency: 6, control: 0.9 },
      { id: "naf86-rps", category: "Risques psychosociaux (RPS)", risk: "Charge emotionnelle et charge de travail", damages: "Stress, epuisement", example_prevention: "Supervision, regulation, effectifs adaptes", gravity: 8, frequency: 6, control: 0.8 },
    ],
  },
  "85": {
    label: "Education / Formation",
    hazards: [
      { id: "naf85-rps", category: "Risques psychosociaux (RPS)", risk: "Tensions avec public, charge emotionnelle", damages: "Stress, epuisement", example_prevention: "Mediation, soutien equipe, gestion classe", gravity: 7, frequency: 6, control: 0.7 },
      { id: "naf85-chute", category: "Chutes (plain-pied / hauteur)", risk: "Deplacements, escaliers", damages: "Entorse, fracture", example_prevention: "Entretien sols, eclairage", gravity: 6, frequency: 5, control: 0.6 },
      { id: "naf85-manuelle", category: "Manutention manuelle", risk: "Deplacement de mobilier/materiel", damages: "TMS, lombalgies", example_prevention: "Aides materiel, posture, binome", gravity: 6, frequency: 5, control: 0.6 },
    ],
  },
};
