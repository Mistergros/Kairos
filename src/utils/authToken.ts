// Récupère le jeton de session Clerk courant en dehors d'un composant React
// (les repos sont de simples fonctions async, pas des hooks). `window.Clerk`
// est le point d'accès standard exposé par @clerk/clerk-react une fois chargé.
export async function getAuthToken(): Promise<string | null> {
  const clerk = (window as any).Clerk;
  if (!clerk?.session) return null;
  try {
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}
