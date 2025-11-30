const tiers = [
  {
    name: 'Essentiel',
    price: '19–29 € / mois',
    badge: 'TPE',
    description: 'DUERP simple mais conforme',
    features: [
      '1 établissement, 2 unités',
      '50 risques max',
      'Exports PDF',
      'Mise à jour annuelle',
      'Reconduction automatique',
    ],
    cta: 'Choisir Essentiel',
  },
  {
    name: 'Pro',
    price: '59–89 € / mois',
    badge: 'Recommandé',
    description: 'Le plan principal pour PME / ETI',
    features: [
      'Établissements et unités illimités',
      'Plan d’action complet + rappels',
      'Collaboration (3-5 utilisateurs)',
      'Bibliothèques sectorielles (NAF)',
      'Analytics risques',
    ],
    highlight: true,
    cta: 'Choisir Pro',
  },
  {
    name: 'Expert / IA',
    price: '129–149 € / mois',
    badge: 'IA',
    description: 'Avantage compétitif Kairos',
    features: [
      'Génération auto des risques (IA)',
      'Détection d’incohérences',
      'Suggestions d’actions',
      'Préremplissage sectoriel intelligent',
      'Connecteurs API (PowerBI, Notion, Jira...)',
    ],
    cta: 'Choisir Expert / IA',
  },
  {
    name: 'Licence Consultants',
    price: '199–249 € / mois',
    badge: 'Cabinet',
    description: 'Pour cabinets RH / HSE multi-clients',
    features: [
      '20 DUERP actifs',
      'Exports brandés cabinet',
      'Portail clients',
      'Support prioritaire',
    ],
    cta: 'Choisir Licence',
  },
];

export const Pricing = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate/60">Kairos · by Milante Consulting</p>
        <h1 className="text-2xl font-display font-semibold text-ink">Plans & Tarifs</h1>
        <p className="text-sm text-slate/70">
          Abonnement SaaS (reconduction auto) ou licence consultants. Prix mensuels, résiliables chaque mois.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl border ${tier.highlight ? 'border-kairos shadow-xl' : 'border-slate/10 shadow-sm'} bg-white p-5 flex flex-col gap-3`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-ink">{tier.name}</p>
                <p className="text-sm text-slate/60">{tier.description}</p>
              </div>
              <span
                className={`pill ${tier.highlight ? 'bg-kairos text-white' : 'bg-slate/10 text-slate-700'}`}
              >
                {tier.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink">{tier.price}</p>
            <ul className="space-y-1 text-sm text-slate/80">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-mint" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={`mt-auto rounded-xl px-4 py-2 text-sm font-semibold shadow-md ${
                tier.highlight
                  ? 'bg-gradient-to-r from-kairos to-azure text-white'
                  : 'bg-white border border-slate/20 text-ink'
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
