"use client";

import { useMemo, useState } from "react";
import data from "@/data/pricing.json";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  tagline: string;
  bullets: string[];
  cta: string;
  mostPopular?: boolean;
};

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const discount = data.yearly_discount ?? 0;

  const format = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: data.currency || "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const computedPlans = useMemo(() => {
    return data.plans.map((p: Plan) => {
      const yearlyAmount =
        p.priceYearly ?? Math.round(p.priceMonthly * 12 * (1 - discount));
      const amount = yearly ? yearlyAmount : p.priceMonthly;
      const suffix = yearly ? "/an" : "/mois";
      return { ...p, amount, suffix };
    });
  }, [discount, yearly]);

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-12 text-gray-900"
      aria-label="Grille tarifaire DUERP"
    >
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold leading-tight">
          Plans &amp; Tarifs — IA incluse dès le plan Pro
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Des prix clairs, résiliables chaque mois. Sécurisez votre DUERP avec
          l’IA et le suivi des actions.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2">
          <span className={!yearly ? "font-semibold" : ""}>Mensuel</span>
          <button
            type="button"
            aria-label="Basculer entre mensuel et annuel"
            onClick={() => setYearly((v) => !v)}
            className="relative h-8 w-14 rounded-full bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <span
              aria-hidden
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                yearly ? "right-1" : "left-1"
              }`}
            />
          </button>
          <span className={yearly ? "font-semibold text-green-700" : ""}>
            Annuel <span className="text-sm text-green-700">-15%</span>
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {computedPlans.map((p) => (
          <article
            key={p.id}
            className={`flex h-full flex-col justify-between rounded-2xl border p-6 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
              p.mostPopular ? "ring-2 ring-blue-500" : ""
            }`}
            aria-label={`Offre ${p.name}`}
          >
            <div>
              {p.mostPopular && (
                <div className="mb-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Recommandé
                </div>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{p.tagline}</p>
              <div className="mt-4 text-3xl font-extrabold">
                {format(p.amount)}{" "}
                <span className="text-base font-medium text-gray-600">
                  {p.suffix}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-gray-800">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              aria-label={p.cta}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {p.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
