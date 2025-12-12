import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kaijos — DUERP assisté par IA",
  description: "Landing Kaijos : DUERP nouvelle génération, assisté par IA.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-white text-slate-900">{children}</div>;
}
