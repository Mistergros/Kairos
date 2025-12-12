import Pricing from "@/components/pricing/Pricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans & Tarifs — IA incluse dès le plan Pro",
  description:
    "Choisissez le plan Essentiel, Pro (IA incluse) ou Consultants. Tarifs mensuels ou annuels (-15%).",
};

export default function PricingPage() {
  return (
    <main className="bg-white text-gray-900">
      <Pricing />
    </main>
  );
}
