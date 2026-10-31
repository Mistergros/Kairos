import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useDuerpStore } from "../state/store";
import { PLAN_CONFIG, type PlanId } from "../hooks/usePlan";
import { apiPost } from "../utils/apiClient";
import { TeamCard } from "../components/TeamCard";
import { useWorkspaceStore } from "../state/workspace";

export default function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { resetLocalData } = useDuerpStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspacesLoaded = useWorkspaceStore((s) => s.loaded);
  const loadWorkspaces = useWorkspaceStore((s) => s.load);

  // Page hors du tableau de bord : l'espace actif (équipe affichée) doit être
  // choisi ici aussi si l'utilisateur arrive directement sur /mon-compte.
  useEffect(() => {
    if (user?.id && !workspacesLoaded) loadWorkspaces(user.id);
  }, [user?.id, workspacesLoaded, loadWorkspaces]);

  // Rafraîchit la session au premier affichage : si l'utilisateur revient du
  // portail Stripe (changement de plan, résiliation), la session Clerk locale
  // peut encore refléter l'ancien statut le temps que ça se synchronise.
  useEffect(() => {
    user?.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page ouverte à tous les comptes : sans abonnement actif, l'utilisateur est
  // en offre Découverte (il doit pouvoir voir son offre et se déconnecter).
  const status = String((user?.publicMetadata as any)?.subscriptionStatus || "inactive");
  const rawPlanId = (user?.publicMetadata as any)?.planId as string | undefined;
  const planLabel =
    status === "active" && rawPlanId && rawPlanId in PLAN_CONFIG ? PLAN_CONFIG[rawPlanId as PlanId].label : null;
  const customerId = String((user?.publicMetadata as any)?.stripeCustomerId || "");
  const portalAvailable = Boolean(customerId);

  const openPortal = async () => {
    if (!user || loading) return;
    setLoading(true);
    setError(null);
    try {
      // clerkUserId n'est plus envoyé : le serveur dérive l'utilisateur du
      // jeton de session vérifié (apiPost l'attache automatiquement) plutôt
      // que de faire confiance à un champ du corps de la requête.
      const data = await apiPost<{ url?: string }>("/api/customer-portal", {});
      if (!data?.url) throw new Error("Portal url missing");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError("Impossible d'ouvrir le portail client. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Mon compte</h1>
            <p className="mt-2 text-slate-600">Gérez votre abonnement et vos informations de facturation.</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">
              Retour à l'application
            </a>
            <button
              type="button"
              onClick={() => { resetLocalData(); signOut(() => navigate("/landing")); }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 hover:underline"
            >
              Se déconnecter
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Abonnement</p>
            <div className="mt-4 text-lg font-semibold">{planLabel ? `Offre ${planLabel}` : "Offre Découverte (gratuite)"}</div>
            {planLabel ? (
              <div className="mt-2 text-sm text-slate-600">Statut : actif</div>
            ) : (
              <>
                <div className="mt-2 text-sm text-slate-600">
                  {status === "canceled" ? "Votre abonnement est terminé. " : status === "past_due" ? "Le dernier paiement a échoué. " : ""}
                  Vous construisez votre DUERP gratuitement ; le téléchargement demande un abonnement.
                </div>
                <a href="/pricing" className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Voir les offres
                </a>
              </>
            )}
            {customerId && <div className="mt-2 text-xs text-slate-400">Client Stripe: {customerId}</div>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Facturation</p>
            <p className="mt-3 text-sm text-slate-600">
              Mettez à jour votre moyen de paiement, vos factures et votre abonnement.
            </p>
            <button
              type="button"
              onClick={openPortal}
              disabled={loading || !portalAvailable}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Redirection..." : portalAvailable ? "Ouvrir le portail client" : "Aucun abonnement actif"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <TeamCard />
      </div>
    </main>
  );
}
