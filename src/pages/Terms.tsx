import { LegalShell, Section } from "./Legal";

export default function TermsPage() {
  return (
    <LegalShell
      title="Conditions générales de vente"
      description="Conditions générales de vente de Kaijos : abonnements, tarifs, résiliation et facturation."
    >
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-8">
        ⚠️ Ce document est un point de départ structurel, pas un avis juridique — une relecture par un professionnel du droit est recommandée avant la mise en production de paiements réels.
      </p>

      <Section title="1. Objet et champ d'application">
        <p>
          Les présentes conditions générales de vente (CGV) régissent la souscription et l'utilisation des abonnements Kaijos, service édité par Milante Consulting (voir <a className="text-blue-600 hover:underline" href="/legal">mentions légales</a>), destiné à des professionnels (entreprises, cabinets, indépendants) pour la réalisation et le suivi de leur Document Unique d'Évaluation des Risques Professionnels (DUERP). Toute souscription implique l'acceptation pleine et entière des présentes CGV.
        </p>
      </Section>

      <Section title="2. Description des offres">
        <p>
          La création d'un compte est gratuite (formule <strong>Découverte</strong>) : elle permet de construire le document unique d'un
          établissement dans l'outil, sans pouvoir le télécharger. Trois formules d'abonnement donnent accès au téléchargement :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essentiel</strong> — 149 € HT/an, abonnement annuel : 1 établissement, 5 unités de travail, inventaire des risques illimité, plan d'action, export PDF, rappel automatique de révision annuelle.</li>
          <li><strong>PME</strong> — 490 € HT/an, abonnement annuel : jusqu'à 5 établissements, 20 unités de travail, export XLSX, rapport PDF multi-sites, rappels automatiques, historique des versions.</li>
          <li><strong>Pro</strong> — 1 990 € HT/an, abonnement annuel : portefeuille de 25 clients maximum, établissements et unités illimités, suivi des révisions par client, export XLSX et PDF par client, documents PDF à la marque du cabinet (logo, couleur, coordonnées), support prioritaire.</li>
        </ul>
        <p>
          Les nombres d'établissements et de clients s'apprécient sur une période glissante de 12 mois : un établissement ou un client
          supprimé, ou un client renommé, continue d'être décompté pendant 12 mois à compter de sa dernière modification. Une marge
          de 10 % (au moins une unité) permet de corriger une erreur de saisie.
        </p>
        <p>Le détail à jour des offres et de leurs tarifs est disponible sur la page <a className="text-blue-600 hover:underline" href="/pricing">Tarifs</a>.</p>
      </Section>

      <Section title="3. Prix et paiement">
        <p>
          Les prix sont exprimés hors taxes. Milante Consulting bénéficie de la franchise en base de TVA (art. 293 B du Code général des impôts) : la TVA n'est donc pas applicable à ce jour. Le paiement est prélevé automatiquement, par carte bancaire, via notre prestataire de paiement Stripe, une fois par an, à la date anniversaire de la souscription.
        </p>
      </Section>

      <Section title="4. Durée et résiliation">
        <p>
          L'abonnement est conclu pour une durée d'un an et se renouvelle tacitement pour une durée identique, sauf résiliation. La résiliation s'effectue à tout moment depuis l'espace « Mon compte » du Site, via le portail de gestion d'abonnement. Elle prend effet à la fin de la période en cours déjà payée ; aucun remboursement au prorata n'est effectué pour la période en cours, sauf disposition légale contraire.
        </p>
        <p>
          À la fin de l'abonnement, le compte repasse en formule Découverte : les données restent consultables et exportables
          au format JSON, mais le téléchargement des documents n'est plus disponible.
        </p>
      </Section>

      <Section title="5. Obligations du client">
        <p>
          Le client est seul responsable de l'exactitude des informations saisies dans l'outil (établissements, unités de travail, risques, mesures). Kaijos fournit une aide au pré-remplissage à partir du code NAF et de bases documentaires publiques (INRS, Code du travail, etc.), mais le document unique produit doit être relu, complété et validé par le client avant toute utilisation officielle ou présentation à l'inspection du travail : Kaijos est un outil d'assistance, pas un service de conseil juridique ou de substitution à l'appréciation de l'employeur.
        </p>
      </Section>

      <Section title="6. Responsabilité">
        <p>
          Milante Consulting s'engage à fournir le service avec diligence, sans garantie de disponibilité ininterrompue. La responsabilité de Milante Consulting ne saurait être engagée en cas de non-conformité du document unique résultant d'une saisie incomplète ou inexacte par le client, ni en cas d'interruption de service imputable à un prestataire tiers (hébergement, paiement, etc.).
        </p>
      </Section>

      <Section title="7. Données personnelles">
        <p>Le traitement des données personnelles dans le cadre du service est détaillé dans notre <a className="text-blue-600 hover:underline" href="/privacy">politique de confidentialité</a>.</p>
        <p>
          Pour les données que le client saisit dans l'outil, Milante Consulting agit en qualité de sous-traitant au sens de l'article 28
          du RGPD, dans les conditions de l'<a className="text-blue-600 hover:underline" href="/dpa">accord de traitement des données</a>,
          qui fait partie intégrante des présentes CGV.
        </p>
      </Section>

      <Section title="8. Droit applicable et litiges">
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité avant toute action judiciaire. À défaut d'accord, les tribunaux compétents seront ceux du ressort du siège social de Milante Consulting.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Pour toute question relative aux présentes CGV : contact@kaijos.com</p>
      </Section>
    </LegalShell>
  );
}
