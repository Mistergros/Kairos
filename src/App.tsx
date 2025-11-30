import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useMemo } from "react";
import { LayoutDashboard, Building2, ShieldCheck, ListChecks, Download, Clock3, CreditCard } from "lucide-react";
import { Dashboard } from "./pages/Dashboard";
import { Units } from "./pages/Units";
import { Inventory } from "./pages/Inventory";
import { ActionPlan } from "./pages/ActionPlan";
import { Exports } from "./pages/Exports";
import { Versions } from "./pages/Versions";
import { Pricing } from "./pages/Pricing";
import { ContextSelectors } from "./components/Selectors";
import { useDuerpStore } from "./state/store";

const navItems = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { path: "/units", label: "Unités de travail", icon: Building2 },
  { path: "/inventory", label: "Inventaire", icon: ShieldCheck },
  { path: "/action-plan", label: "Plan d'action", icon: ListChecks },
  { path: "/exports", label: "Exports", icon: Download },
  { path: "/versions", label: "Versions", icon: Clock3 },
  { path: "/pricing", label: "Plans & Tarifs", icon: CreditCard },
];

export default function App() {
  const {
    establishments,
    workUnits,
    selectedEstablishmentId,
    selectedWorkUnitId,
    setSelectedEstablishment,
    setSelectedWorkUnit,
    assessments,
    actions,
    versions,
  } = useDuerpStore();

  const lastUpdate = useMemo(() => {
    const timestamps: number[] = [];
    assessments.forEach((a) => timestamps.push(new Date(a.updatedAt || a.createdAt).getTime()));
    actions.forEach((a) => timestamps.push(new Date(a.createdAt).getTime()));
    versions.forEach((v) => timestamps.push(new Date(v.createdAt).getTime()));
    const valid = timestamps.filter((t) => Number.isFinite(t));
    if (!valid.length) return null;
    return new Date(Math.max(...valid));
  }, [assessments, actions, versions]);

  const lastUpdateLabel = lastUpdate
    ? lastUpdate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "Aucune mise à jour";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(91,97,246,0.08),transparent_35%),linear-gradient(135deg,rgba(91,97,246,0.08),rgba(0,179,255,0.12))] text-ink flex">
        <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-kairos to-azure text-white shadow-2xl">
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <img src="/Kairos_logo.png" alt="Kairos" className="h-48 w-auto object-contain drop-shadow-lg" />
            </div>
            <div className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/10 ${
                        isActive ? "bg-white/15 font-semibold" : "text-white/80"
                      }`
                    }
                  >
                    <Icon size={18} /> {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="flex flex-col gap-2 border-b border-slate/10 bg-white/70 px-6 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate/60">Kairos · by Milante Consulting</p>
              <p className="text-xs text-slate/60">Dernière MAJ : {lastUpdateLabel}</p>
            </div>
            <ContextSelectors
              establishments={establishments}
              workUnits={workUnits}
              selectedEstablishmentId={selectedEstablishmentId}
              selectedWorkUnitId={selectedWorkUnitId}
              onSelectEstablishment={setSelectedEstablishment}
              onSelectWorkUnit={setSelectedWorkUnit}
            />
          </header>

          <div className="px-4 py-6 md:px-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/units" element={<Units />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/action-plan" element={<ActionPlan />} />
              <Route path="/exports" element={<Exports />} />
              <Route path="/versions" element={<Versions />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
