// Genere le 2026-07-19 depuis kairos_duerp_naf_mapping.json (voir REFERENTIELS.md).
// Associe chaque item de la taxonomie NAF (mapping detaille, priorite haute
// dans le pipeline de preremplissage) a un document officiel verifie. Utilise
// par src/data/nafMappingLoader.ts. Les items sans entree ici n'ont pas de
// source specifique et fiable trouvee (volontairement laisses sans lien
// plutot que d'inventer une citation).
export const nafMappingSourceByItem: Record<string, { source: string; sourceUrl: string }> = {
  "Chute de plain-pied": {
    "source": "INRS ED 6433 — Les chutes de plain-pied",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6433"
  },
  "Chute de hauteur": {
    "source": "INRS ED 6110 — Prévention des risques de chutes de hauteur",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6110"
  },
  "Manutention manuelle": {
    "source": "INRS ED 6518 — Démarche de prévention des TMS",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6518"
  },
  "Outils/Machines": {
    "source": "INRS ED 6122 — Sécurité des équipements de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6122"
  },
  "Circulation interne/engins": {
    "source": "INRS ED 6002 — Concevoir l'organisation des flux et des circulations",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6002"
  },
  "Électricité": {
    "source": "INRS ED 6187 — La prévention du risque électrique",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6187"
  },
  "Incendie/Explosion": {
    "source": "INRS ED 4702 — Incendie et explosion sur le lieu de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+4702"
  },
  "Effondrement/Chute d’objets": {
    "source": "INRS ED 6468 — Risques de choc ou d'écrasement, solutions de prévention",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6468"
  },
  "Risque routier": {
    "source": "INRS ED 6545 — Le risque routier, les déplacements pour le travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6545"
  },
  "Bruit": {
    "source": "INRS ED 6035 — Évaluer et mesurer l'exposition professionnelle au bruit",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6035"
  },
  "Vibrations": {
    "source": "INRS ED 6342 — Vibrations mains-bras",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6342"
  },
  "Chaleur": {
    "source": "INRS ED 6371 — Travail par forte chaleur. Comment agir ?",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6371"
  },
  "Froid": {
    "source": "INRS ED 6532 — Guide d'évaluation des risques liés aux ambiances thermiques",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6532"
  },
  "Éclairage insuffisant/Éblouissement": {
    "source": "INRS ED 85 — Éclairage artificiel au poste de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+85"
  },
  "Qualité de l’air/Ventilation": {
    "source": "INRS ED 6497 — Améliorer la qualité de l'air dans les locaux de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6497"
  },
  "Produits dangereux": {
    "source": "INRS ED 6150 — Travailler avec des produits chimiques. Pensez prévention des risques !",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6150"
  },
  "Émissions": {
    "source": "INRS ED 6150 — Travailler avec des produits chimiques. Pensez prévention des risques !",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6150"
  },
  "Stockage/Manipulation": {
    "source": "INRS ED 6150 — Travailler avec des produits chimiques. Pensez prévention des risques !",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6150"
  },
  "Exposition cutanée/respiratoire": {
    "source": "INRS ED 6150 — Travailler avec des produits chimiques. Pensez prévention des risques !",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6150"
  },
  "Agents infectieux": {
    "source": "INRS ED 6034 — Les risques biologiques en milieu professionnel",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6034"
  },
  "Contact public fragile": {
    "source": "INRS ED 6034 — Les risques biologiques en milieu professionnel",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6034"
  },
  "Déchets/objets piquants": {
    "source": "INRS ED 6535 — Déchets infectieux : élimination des Dasri",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6535"
  },
  "Animaux/Insectes": {
    "source": "INRS — Zoonoses, prévention",
    "sourceUrl": "https://www.inrs.fr/risques/zoonoses/prevention.html"
  },
  "Répétitivité": {
    "source": "INRS ED 6518 — Démarche de prévention des TMS",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6518"
  },
  "Postures forcées": {
    "source": "INRS ED 6518 — Démarche de prévention des TMS",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6518"
  },
  "Effort prolongé": {
    "source": "INRS ED 6518 — Démarche de prévention des TMS",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6518"
  },
  "Aménagement poste": {
    "source": "INRS ED 79 — Conception et aménagement des postes de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+79"
  },
  "Travail sur écran": {
    "source": "INRS ED 6538 — Le travail sur écran, guide pratique pour la prévention des risques",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6538"
  },
  "Charge mentale": {
    "source": "INRS ED 6349 — Risques psychosociaux, comment agir en prévention ?",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6349"
  },
  "Conflits/tensions": {
    "source": "INRS ED 6349 — Risques psychosociaux, comment agir en prévention ?",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6349"
  },
  "Organisation du travail": {
    "source": "INRS ED 6349 — Risques psychosociaux, comment agir en prévention ?",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6349"
  },
  "Équilibre vie pro/perso": {
    "source": "INRS ED 6349 — Risques psychosociaux, comment agir en prévention ?",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6349"
  },
  "Violence externe": {
    "source": "INRS — Agressions et violences externes, démarche de prévention",
    "sourceUrl": "https://www.inrs.fr/risques/agressions-violences-externes/prevention.html"
  },
  "Travail isolé": {
    "source": "INRS ED 6288 — Travail isolé, pour une démarche globale de prévention",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6288"
  },
  "Absence de formation": {
    "source": "INRS — Réussir l'accueil des nouveaux embauchés et prévenir les risques",
    "sourceUrl": "https://www.inrs.fr/demarche/nouveaux-embauches/ce-qu-il-faut-retenir.html"
  },
  "Coordination/plan de prévention": {
    "source": "Code du travail, art. R.4512-6 à R.4512-12 — Plan de prévention",
    "sourceUrl": "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491568/"
  },
  "Intérimaires/nouveaux": {
    "source": "INRS — Réussir l'accueil des nouveaux embauchés et prévenir les risques",
    "sourceUrl": "https://www.inrs.fr/demarche/nouveaux-embauches/ce-qu-il-faut-retenir.html"
  },
  "Hygiène": {
    "source": "Code du travail, art. R.4228-1 — Vestiaires et installations sanitaires",
    "sourceUrl": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532006"
  },
  "Déplacements internes": {
    "source": "INRS ED 6002 — Concevoir l'organisation des flux et des circulations",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6002"
  },
  "Espaces confinés/Travaux particuliers": {
    "source": "INRS ED 6184 — Les espaces confinés",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6184"
  },
  "Pollutions/Déchets": {
    "source": "INRS ED 824 — Déchets dangereux dans l'entreprise",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+824"
  },
  "Énergie/Gaz/Électricité": {
    "source": "INRS ED 6187 — La prévention du risque électrique",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6187"
  },
  "Contact usagers/patients": {
    "source": "INRS — Agressions et violences externes, démarche de prévention",
    "sourceUrl": "https://www.inrs.fr/risques/agressions-violences-externes/prevention.html"
  },
  "Agression du public": {
    "source": "INRS — Agressions et violences externes, démarche de prévention",
    "sourceUrl": "https://www.inrs.fr/risques/agressions-violences-externes/prevention.html"
  },
  "Auto": {
    "source": "INRS ED 6545 — Le risque routier, les déplacements pour le travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6545"
  },
  "Deux-roues": {
    "source": "INRS ED 6545 — Le risque routier, les déplacements pour le travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6545"
  },
  "Vélo/EDPM": {
    "source": "INRS ED 6545 — Le risque routier, les déplacements pour le travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6545"
  },
  "Longs trajets/fatigue": {
    "source": "INRS ED 6545 — Le risque routier, les déplacements pour le travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6545"
  },
  "ATEX": {
    "source": "INRS ED 945 — Mise en oeuvre de la réglementation relative aux atmosphères explosives (Atex)",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+945"
  },
  "Robots/automates": {
    "source": "INRS ED 6540 — Les nouvelles technologies : le cas des robots collaboratifs",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+6540"
  },
  "Silice/poussières": {
    "source": "INRS — Silice cristalline, ce qu'il faut retenir",
    "sourceUrl": "https://www.inrs.fr/risques/silice-cristalline/ce-qu-il-faut-retenir.html"
  },
  "Travaux sur corde": {
    "source": "INRS — Travail encordé ou accès et positionnement au moyen de cordes",
    "sourceUrl": "https://www.inrs.fr/risques/chutes-hauteur/travail-encorde-acces-positionnement-cordes.html"
  },

  // Ajoutés le 25/07/2026, recherche + vérification directe des URLs.
  "Procédures insuffisantes": {
    "source": "Code du travail, art. L.4121-2 — 9 principes généraux de prévention (dont « donner des instructions appropriées aux travailleurs »)",
    "sourceUrl": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033019913"
  },
  // Confiance partielle : le sujet (conception/aménagement des locaux) correspond,
  // mais je n'ai pas pu vérifier que l'exiguïté y est traitée précisément (page
  // technique illisible par mes outils) — à confirmer si besoin.
  "Espaces exigus": {
    "source": "INRS ED 950 — Conception des lieux et des situations de travail",
    "sourceUrl": "https://www.inrs.fr/media.html?refINRS=ED+950"
  }
  // Sous-effectif, Sécurité visiteurs, Noyade/Enfouissement : recherchés le
  // 25/07/2026, toujours sans source fiable trouvée (voir REFERENTIELS.md /
  // mémoire duerp-referentiels-sourcing pour le détail des pistes écartées).
};
