import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaijos — DUERP assisté par IA",
  description: "Kaijos, la plateforme DUERP nouvelle génération, assistée par IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
