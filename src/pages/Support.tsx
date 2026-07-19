import { LegalShell, Section } from "./Legal";

export default function SupportPage() {
  return (
    <LegalShell title="Support">
      <Section title="Une question, un problème ?">
        <p>
          Écrivez-nous à <a className="text-blue-600 hover:underline" href="mailto:contact@kaijos.fr">contact@kaijos.fr</a> — nous répondons sous 48h ouvrées (support prioritaire pour les offres PME et Consultants).
        </p>
      </Section>
      <Section title="Documents utiles">
        <p>
          <a className="text-blue-600 hover:underline" href="/legal">Mentions légales</a> ·{" "}
          <a className="text-blue-600 hover:underline" href="/cgv">Conditions générales de vente</a> ·{" "}
          <a className="text-blue-600 hover:underline" href="/privacy">Politique de confidentialité</a>
        </p>
      </Section>
    </LegalShell>
  );
}
