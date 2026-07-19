import { LegalShell, Section } from "./Legal";

export default function PrivacyPage() {
  return (
    <LegalShell title="Politique de confidentialité">
      <Section title="Responsable de traitement">
        <p>
          Milante Consulting, éditeur de Kaijos (voir <a className="text-blue-600 hover:underline" href="/legal">mentions légales</a>), est responsable du traitement des données personnelles décrites ci-dessous, au sens du Règlement général sur la protection des données (RGPD).
          Contact : contact@kaijos.fr
        </p>
      </Section>

      <Section title="Quelles données sont collectées, et pourquoi">
        <p>
          <strong>Compte et connexion</strong> — nom, email, mot de passe (géré par notre prestataire d'authentification, jamais stocké par Kaijos directement). Finalité : vous permettre de créer un compte sécurisé et d'y accéder. Base légale : exécution du contrat.
        </p>
        <p>
          <strong>Données de votre DUERP</strong> — établissements, unités de travail, inventaire des risques, plan d'action, historique de versions que vous saisissez dans l'outil. Ces données sont enregistrées sur nos serveurs dès leur saisie, associées uniquement à votre compte. Finalité : fournir le service (générer et suivre votre document unique). Base légale : exécution du contrat.
        </p>
        <p>
          <strong>Facturation</strong> — email, informations de paiement (traitées directement par notre prestataire de paiement, jamais stockées par Kaijos). Finalité : gérer votre abonnement. Base légale : exécution du contrat et obligations comptables légales.
        </p>
        <p>
          <strong>Aucune donnée n'est utilisée à des fins publicitaires ni revendue à des tiers.</strong> Le Site n'utilise pas de cookies de suivi publicitaire ni d'outils d'analyse d'audience tiers ; seuls des cookies techniques nécessaires à l'authentification sont utilisés.
        </p>
      </Section>

      <Section title="Qui a accès à ces données (sous-traitants)">
        <p>Vos données peuvent être traitées par les prestataires suivants, dans le cadre strict de la fourniture du service :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Clerk</strong> — gestion des comptes et de l'authentification.</li>
          <li><strong>Neon</strong> — hébergement de la base de données (région Europe, Francfort).</li>
          <li><strong>Render</strong> — hébergement du serveur applicatif (région Europe, Francfort).</li>
          <li><strong>Vercel</strong> — hébergement de l'interface du Site.</li>
          <li><strong>Stripe</strong> — traitement des paiements et de la facturation.</li>
          <li><strong>Resend</strong> — envoi des emails transactionnels (invitations, rappels).</li>
        </ul>
        <p>Chacun de ces prestataires agit en tant que sous-traitant au sens du RGPD et n'utilise vos données que pour exécuter les services qui lui sont confiés.</p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Les données de votre DUERP sont conservées tant que votre compte est actif. Le Code du travail impose de conserver le document unique et ses versions successives pendant une durée d'au moins 40 ans (art. R.4121-4) — nous conservons donc votre historique de versions pour vous permettre de répondre à cette obligation, même après résiliation, sauf demande explicite de suppression de votre part.
        </p>
        <p>Les données de facturation sont conservées conformément aux obligations comptables légales (10 ans).</p>
      </Section>

      <Section title="Vos droits">
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données personnelles. Pour les exercer, contactez contact@kaijos.fr. Vous pouvez également introduire une réclamation auprès de la CNIL (<a className="text-blue-600 hover:underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Les échanges avec le Site sont chiffrés (HTTPS). L'accès à vos données est protégé par une authentification individuelle et n'est accessible qu'aux personnes de votre organisation que vous invitez explicitement.
        </p>
      </Section>
    </LegalShell>
  );
}
