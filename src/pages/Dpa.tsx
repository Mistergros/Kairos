import { LegalShell, Section } from "./Legal";

// Accord de traitement des données (art. 28 RGPD). Les sous-traitants listés
// ici doivent rester alignés sur ceux de la politique de confidentialité
// (src/pages/Privacy.tsx).
const SUBPROCESSORS = [
  { name: "Neon", role: "Hébergement de la base de données", location: "Union européenne (Francfort, Allemagne)" },
  { name: "Render", role: "Hébergement du serveur applicatif", location: "Union européenne (Francfort, Allemagne)" },
  { name: "Vercel", role: "Hébergement et diffusion de l'interface du Site", location: "Réseau mondial, société établie aux États-Unis" },
  { name: "Clerk", role: "Gestion des comptes et de l'authentification", location: "États-Unis" },
  { name: "Resend", role: "Envoi des emails transactionnels (invitations, rappels)", location: "États-Unis" },
  { name: "Stripe", role: "Paiement et facturation de l'abonnement", location: "Irlande et États-Unis" },
];

export default function DpaPage() {
  return (
    <LegalShell
      title="Accord de traitement des données"
      description="Accord de traitement des données personnelles (article 28 du RGPD) entre Kaijos et ses clients."
    >
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 print:hidden">
        ⚠️ Ce document est un point de départ structurel, pas un avis juridique : une relecture par un professionnel du droit est recommandée.
      </p>

      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
        >
          Imprimer / enregistrer en PDF
        </button>
      </div>

      <Section title="1. Objet">
        <p>
          Le présent accord fixe les conditions dans lesquelles Milante Consulting, éditeur de Kaijos™ (le « Sous-traitant »), traite des
          données à caractère personnel pour le compte de ses clients (le « Client »), conformément à l'article 28 du Règlement (UE)
          2016/679 (RGPD). Il fait partie intégrante des <a className="text-blue-600 hover:underline" href="/cgv">conditions générales de vente</a> :
          l'acceptation des CGV vaut acceptation du présent accord, qui s'applique aussi à la formule gratuite Découverte.
        </p>
        <p>
          Il complète la <a className="text-blue-600 hover:underline" href="/privacy">politique de confidentialité</a>, qui décrit les traitements
          dont Milante Consulting est lui-même responsable (gestion des comptes, facturation).
        </p>
      </Section>

      <Section title="2. Rôle des parties">
        <p>
          Pour les données que le Client saisit dans l'outil afin de réaliser son document unique, le Client est responsable de traitement
          et Milante Consulting est sous-traitant.
        </p>
        <p>
          Lorsque le Client est un cabinet, un consultant ou un expert-comptable qui réalise le document unique de ses propres clients
          (formule Pro), il agit lui-même en qualité de sous-traitant de ces entreprises, ou de responsable de traitement selon son
          contrat avec elles. Milante Consulting intervient alors comme sous-traitant ultérieur. Le Client peut remettre le présent accord à
          ses propres clients pour les informer des conditions de traitement.
        </p>
      </Section>

      <Section title="3. Description du traitement">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nature et finalité :</strong> hébergement, structuration et mise en forme des données nécessaires à l'évaluation des risques professionnels, à la rédaction du document unique (DUERP), au suivi du plan d'action et aux rappels de révision.</li>
          <li><strong>Personnes concernées :</strong> salariés et intervenants des établissements évalués, et utilisateurs invités par le Client.</li>
          <li><strong>Données traitées :</strong> nom, fonction et coordonnées professionnelles (par exemple les responsables d'actions de prévention), affectation à une unité de travail, description des expositions aux risques.</li>
          <li><strong>Durée :</strong> la durée du contrat, puis les durées prévues à l'article 9.</li>
        </ul>
        <p>
          Le document unique n'a pas vocation à contenir de données de santé ni de données nominatives inutiles. Le Client s'engage à ne
          saisir que les données nécessaires à l'évaluation des risques et à ne pas y faire figurer de données sensibles au sens de
          l'article 9 du RGPD.
        </p>
      </Section>

      <Section title="4. Engagements du Sous-traitant">
        <p>Milante Consulting s'engage à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ne traiter les données que pour fournir le service et sur instruction documentée du Client, ces instructions étant constituées par les CGV, le présent accord et l'utilisation que le Client fait de l'outil. Si une instruction lui paraît contraire au RGPD, il en informe le Client sans délai ;</li>
          <li>ne pas utiliser les données à d'autres fins, notamment publicitaires ou commerciales, et ne pas les revendre ;</li>
          <li>garantir la confidentialité des données et veiller à ce que les personnes autorisées à y accéder soient soumises à une obligation de confidentialité ;</li>
          <li>mettre en œuvre les mesures de sécurité décrites à l'article 7 ;</li>
          <li>aider le Client, dans la mesure du possible, à répondre aux demandes d'exercice des droits des personnes concernées (accès, rectification, effacement, limitation, opposition, portabilité) ; le Client dispose en outre dans l'outil des moyens de modifier, supprimer et exporter ses données ;</li>
          <li>aider le Client, sur demande, à réaliser une analyse d'impact ou à consulter l'autorité de contrôle, en lui fournissant les informations dont il dispose ;</li>
          <li>tenir un registre des traitements effectués pour le compte de ses clients.</li>
        </ul>
      </Section>

      <Section title="5. Sous-traitants ultérieurs">
        <p>
          Le Client autorise Milante Consulting à faire appel aux sous-traitants ultérieurs listés en annexe. Milante Consulting impose à
          chacun des obligations de protection des données équivalentes à celles du présent accord et reste responsable de leur respect
          envers le Client.
        </p>
        <p>
          Tout ajout ou remplacement d'un sous-traitant ultérieur est annoncé au Client par email au moins 30 jours à l'avance. Le Client
          peut s'y opposer pour un motif légitime lié à la protection des données ; à défaut d'accord, il peut résilier son abonnement
          avant la prise d'effet du changement et obtenir le remboursement de la période payée non utilisée.
        </p>
      </Section>

      <Section title="6. Transferts hors de l'Union européenne">
        <p>
          La base de données et le serveur applicatif sont hébergés dans l'Union européenne. Certains sous-traitants ultérieurs sont
          établis aux États-Unis (voir annexe). Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis (Data
          Privacy Framework) lorsque le prestataire y adhère, et à défaut par les clauses contractuelles types de la Commission européenne.
        </p>
      </Section>

      <Section title="7. Sécurité">
        <ul className="list-disc pl-5 space-y-1">
          <li>chiffrement de tous les échanges (HTTPS / TLS) ;</li>
          <li>chiffrement des données au repos par l'hébergeur de la base de données ;</li>
          <li>authentification individuelle de chaque utilisateur, gérée par un prestataire spécialisé, sans stockage des mots de passe par Kaijos ;</li>
          <li>cloisonnement des données par organisation : chaque requête au serveur est vérifiée et limitée aux données de l'organisation de l'utilisateur ;</li>
          <li>accès aux données de production réservé aux seules personnes qui en ont besoin pour assurer le service et le support ;</li>
          <li>sauvegardes de la base de données assurées par l'hébergeur.</li>
        </ul>
      </Section>

      <Section title="8. Violation de données">
        <p>
          Milante Consulting notifie au Client toute violation de données personnelles le concernant dans les meilleurs délais et au plus
          tard 48 heures après en avoir pris connaissance. La notification décrit, dans la mesure du possible, la nature de la violation,
          les catégories et le nombre approximatif de personnes et de données concernées, ses conséquences probables et les mesures prises
          ou envisagées. Il appartient au Client, responsable de traitement, de notifier la CNIL et, le cas échéant, les personnes
          concernées.
        </p>
      </Section>

      <Section title="9. Sort des données en fin de contrat">
        <p>
          Le Client peut à tout moment exporter ses données depuis l'outil, y compris après la fin de son abonnement (export au format
          JSON). Le Code du travail impose de conserver le document unique et ses versions successives pendant au moins 40 ans
          (art. R.4121-4) : sauf instruction contraire, Milante Consulting conserve donc l'historique du Client pour lui permettre de
          satisfaire à cette obligation.
        </p>
        <p>
          Sur demande écrite du Client à contact@kaijos.com, Milante Consulting supprime ses données dans un délai de 30 jours, et des
          sauvegardes au terme de leur cycle de rotation, sauf obligation légale de conservation.
        </p>
      </Section>

      <Section title="10. Documentation et audit">
        <p>
          Milante Consulting met à la disposition du Client les informations nécessaires pour démontrer le respect du présent accord. Le
          Client peut faire réaliser un audit, à ses frais, une fois par an, avec un préavis de 30 jours, par un auditeur indépendant tenu au
          secret et dans des conditions qui ne compromettent ni la sécurité du service ni les données des autres clients.
        </p>
      </Section>

      <Section title="11. Obligations du Client">
        <p>
          Le Client garantit la licéité des données qu'il saisit, informe les personnes concernées du traitement conformément aux
          articles 13 et 14 du RGPD, et gère les accès des utilisateurs qu'il invite dans son organisation.
        </p>
      </Section>

      <Section title="Annexe : sous-traitants ultérieurs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-ink">
                <th className="py-2 pr-4 font-semibold">Prestataire</th>
                <th className="py-2 pr-4 font-semibold">Rôle</th>
                <th className="py-2 font-semibold">Localisation</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 font-medium text-ink">{s.name}</td>
                  <td className="py-2 pr-4">{s.role}</td>
                  <td className="py-2">{s.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">Dernière mise à jour : octobre 2026. Contact : contact@kaijos.com</p>
      </Section>
    </LegalShell>
  );
}
