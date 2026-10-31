import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { apiErrorMessage, apiPost } from "../utils/apiClient";
import { switchWorkspace } from "../state/workspace";

// Lien reçu par email (voir /api/team/invite). Sans compte, le jeton est gardé
// le temps de l'inscription ou de la connexion, puis RequireSignedIn (App.tsx)
// ramène ici pour l'accepter. L'invitation ne vaut que pour l'adresse invitée.
const PENDING_KEY = "kaijos_pending_invite";

const forget = () => {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
};

export default function InvitationPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [state, setState] = useState<{ status: "idle" | "working" | "done" | "error"; text?: string }>({ status: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (!token) return;
    try { localStorage.setItem(PENDING_KEY, token); } catch {}
  }, [token]);

  useEffect(() => {
    if (!token || !isLoaded || !isSignedIn || !user || started.current) return;
    started.current = true;
    setState({ status: "working" });
    apiPost<{ workspaceId: string; name: string }>("/api/invitations/accept", { token })
      .then((data) => {
        forget();
        setState({ status: "done", text: `Vous avez rejoint « ${data.name} ».` });
        setTimeout(() => switchWorkspace(user.id, data.workspaceId), 1200);
      })
      .catch((err) => {
        forget();
        setState({ status: "error", text: apiErrorMessage(err, "L'invitation n'a pas pu être acceptée.") });
      });
  }, [token, isLoaded, isSignedIn, user]);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-slate-50 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invitation Kaijos</p>
        {!token ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold">Lien incomplet</h1>
            <p className="mt-3 text-sm text-slate-600">Ouvrez le lien directement depuis l'email d'invitation, sans le modifier.</p>
          </>
        ) : !isLoaded ? (
          <p className="mt-4 text-sm text-slate-600">Chargement…</p>
        ) : !isSignedIn ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold">Vous êtes invité à rejoindre un espace Kaijos</h1>
            <p className="mt-3 text-sm text-slate-600">
              Créez votre compte, ou connectez-vous, avec l'adresse email à laquelle vous avez reçu l'invitation.
              L'accès est gratuit pour vous.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/sign-up" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Créer mon compte
              </a>
              <a href="/sign-in" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-white">
                J'ai déjà un compte
              </a>
            </div>
          </>
        ) : state.status === "error" ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold">Invitation non acceptée</h1>
            <p className="mt-3 text-sm text-rose-700">{state.text}</p>
            <a href="/" className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline">Aller à mon espace</a>
          </>
        ) : state.status === "done" ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold">C'est fait</h1>
            <p className="mt-3 text-sm text-slate-600">{state.text} Ouverture de l'espace…</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Acceptation de l'invitation…</p>
        )}
      </div>
    </main>
  );
}
