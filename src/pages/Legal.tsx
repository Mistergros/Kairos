export default function LegalPage() {
  return (
    <LegalShell title="Mentions légales">
      <Section title="Éditeur du site">
        <p>
          Le site Kaijos (ci-après « le Site ») est édité par :<br />
          <strong>Milante Consulting</strong> — EURL<br />
          Siège social : 8 allée d'Andrézieux, 75018 Paris<br />
          SIRET : 915 336 564 00017<br />
          RCS Paris — Capital social de 1 000 €<br />
          Numéro de TVA intracommunautaire : Non applicable — franchise en base de TVA (art. 293 B du Code général des impôts)<br />
          Directeur de la publication : Pierre Marey-Semper<br />
          Contact : contact@kaijos.com
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site (interface utilisateur) est hébergé par :<br />
          <strong>Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — <a className="text-blue-600 hover:underline" href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>
        </p>
        <p>
          Le serveur applicatif (API) est hébergé par :<br />
          <strong>Render Services, Inc.</strong> — 525 Brannan St Suite 300, San Francisco, CA 94107, États-Unis — <a className="text-blue-600 hover:underline" href="https://render.com" target="_blank" rel="noreferrer">render.com</a>
        </p>
        <p>
          La base de données est hébergée par :<br />
          <strong>Neon, Inc.</strong> (région Europe — Francfort, Allemagne) — <a className="text-blue-600 hover:underline" href="https://neon.tech" target="_blank" rel="noreferrer">neon.tech</a>
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble des éléments du Site (textes, structure, base de données de risques et de mesures de prévention, logiciel, mise en forme) est la propriété de Milante Consulting ou de ses partenaires, et est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation non autorisée, totale ou partielle, est interdite.
        </p>
        <p>
          Les contenus réglementaires cités (Code du travail, publications INRS, CARSAT, etc.) demeurent la propriété de leurs auteurs respectifs ; Kaijos n'en revendique aucune exclusivité et cite ses sources conformément au droit de citation.
        </p>
      </Section>

      <Section title="Contact">
        <p>Pour toute question relative au Site ou à son contenu : contact@kaijos.com</p>
      </Section>
    </LegalShell>
  );
}

export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <a href="/landing" className="text-sm font-medium text-slate-500 hover:text-ink transition">← Retour à l'accueil</a>
        <h1 className="mt-4 text-3xl font-extrabold text-ink">{title}</h1>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-ink mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
