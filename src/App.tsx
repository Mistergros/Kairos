import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { Menu, X, HelpCircle } from "lucide-react";
import { LayoutDashboard, Building2, ShieldCheck, ListChecks, Download, Clock3, CreditCard, UserCircle, Database } from "lucide-react";
import { Dashboard } from "./pages/Dashboard";
import { Units } from "./pages/Units";
import { Inventory } from "./pages/Inventory";
import { ActionPlan } from "./pages/ActionPlan";
import { Exports } from "./pages/Exports";
import { Versions } from "./pages/Versions";
import { Pricing } from "./pages/Pricing";
import LandingPage from "./pages/Landing";
import AccountPage from "./pages/Account";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import LegalPage from "./pages/Legal";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";
import SupportPage from "./pages/Support";
import { ContextSelectors } from "./components/Selectors";
import { Onboarding } from "./components/Onboarding";
import { ProductTour, useTourControls } from "./components/ProductTour";
import { useDuerpStore } from "./state/store";
import { DuerpResults } from "./pages/DuerpResults";
import { BackOffice } from "./pages/BackOffice";

const navItems: { path: string; label: string; icon: typeof LayoutDashboard; end?: boolean; tourId?: string }[] = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { path: "/units", label: "Unités de travail", icon: Building2, tourId: "nav-units" },
  { path: "/inventory", label: "Inventaire", icon: ShieldCheck, tourId: "nav-inventory" },
  { path: "/action-plan", label: "Plan d'action", icon: ListChecks, tourId: "nav-action-plan" },
  { path: "/exports", label: "Exports", icon: Download, tourId: "nav-exports" },
  { path: "/versions", label: "Versions", icon: Clock3 },
  { path: "/pricing", label: "Plans & Tarifs", icon: CreditCard },
  { path: "/mon-compte", label: "Mon compte", icon: UserCircle },
];

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

function useIsAdmin() {
  const { user } = useUser();
  if (bypassAuth) return true; // même bascule que le reste du dashboard en dev/preview
  if (!ADMIN_EMAIL) return false;
  return user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;
}

function FullPageLoader({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-white text-slate-500 flex items-center justify-center">
      {label}
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (bypassAuth) return <>{children}</>;
  if (!isLoaded) return <FullPageLoader />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function RequireSubscription({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (bypassAuth) return <>{children}</>;
  if (!isLoaded) return <FullPageLoader />;
  if (!isSignedIn) return <Navigate to="/landing" replace />;
  const status = (user?.publicMetadata as any)?.subscriptionStatus;
  if (status !== "active") return <Navigate to="/landing" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DashboardRoutes() {
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
    setOrgId,
    loadFromSupabase,
    syncStatus,
  } = useDuerpStore();

  const { user } = useUser();

  // Déclenche le sync Supabase dès que l'identité Clerk est disponible
  useEffect(() => {
    if (!user?.id) return;
    setOrgId(user.id);
    loadFromSupabase(user.id);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { restart: restartTour } = useTourControls();
  const isAdmin = useIsAdmin();
  const visibleNavItems = isAdmin
    ? [...navItems, { path: "/back-office", label: "Back-office", icon: Database }]
    : navItems;

  const SidebarContent = () => (
    <div className="px-5 py-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <img data-tour="sidebar-logo" src="/Kaijos_logo.png" alt="Kaijos" className="h-[160px] w-auto object-contain drop-shadow-lg" />
        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="mt-6 space-y-2 text-sm">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-tour={item.tourId}
              onClick={() => setSidebarOpen(false)}
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
      <button
        data-tour="tour-relaunch"
        onClick={restartTour}
        title="Revoir la visite guidée"
        className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white/90 transition"
      >
        <HelpCircle size={16} /> Revoir la visite guidée
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(91,97,246,0.08),transparent_35%),linear-gradient(135deg,rgba(91,97,246,0.08),rgba(0,179,255,0.12))] text-ink flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-kairos to-azure text-white shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile : drawer + backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex-col bg-gradient-to-b from-kairos to-azure text-white shadow-2xl flex z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="flex items-center gap-3 border-b border-slate/10 bg-white/70 px-4 py-3 backdrop-blur-sm md:px-6 md:py-4">
          <button
            className="md:hidden rounded-lg border border-slate/20 p-2 text-slate-700 hover:bg-slate/5"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-slate/60">
              Dernière MAJ : {lastUpdateLabel}
              {syncStatus === "syncing" && <span className="ml-2 text-ocean animate-pulse">● Sync…</span>}
              {syncStatus === "error" && <span className="ml-2 text-amber-500" title="Données locales — reconnexion en attente">● Hors ligne</span>}
            </p>
          </div>
          <div data-tour="context-selector">
            <ContextSelectors
              establishments={establishments}
              workUnits={workUnits}
              selectedEstablishmentId={selectedEstablishmentId}
              selectedWorkUnitId={selectedWorkUnitId}
              onSelectEstablishment={setSelectedEstablishment}
              onSelectWorkUnit={setSelectedWorkUnit}
            />
          </div>
          </div>
        </header>

        <Onboarding />
        <ProductTour establishmentsCount={establishments.length} />
        <div className="px-4 py-6 md:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/units" element={<Units />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/action-plan" element={<ActionPlan />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/duerp-results" element={<DuerpResults />} />
            <Route
              path="/back-office"
              element={
                <RequireAdmin>
                  <BackOffice />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cgv" element={<TermsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route
          path="/mon-compte"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pricing"
          element={
            <RequireAuth>
              <Pricing />
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireSubscription>
              <DashboardRoutes />
            </RequireSubscription>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
