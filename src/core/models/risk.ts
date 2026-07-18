export interface Risk {
  id: string;
  name: string;
  category: string;
  description: string;
  naf_specific?: string[];
  units?: string[];
  // Traçabilité du contenu : document officiel précis (ex. "INRS ED 6490 — ...")
  // plutôt qu'un simple nom d'organisme, + date de dernière vérification
  // (AAAA-MM-JJ) pour la revue périodique. Voir REFERENTIELS.md.
  sources?: string[];
  sources_verified?: string;
}

export interface RiskContext {
  nafCode: string;
  unityId: string;
}
