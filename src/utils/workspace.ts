// Espace actif, gardé dans le navigateur par utilisateur et envoyé au serveur
// à chaque requête (en-tête X-Workspace-Id, voir apiClient et api/server.ts).
// Le serveur vérifie les droits : cette valeur ne donne accès à rien seule.
const KEY = "kaijos_workspace";

let active: string | null = null;

export function getActiveWorkspaceId(userId?: string | null): string | null {
  if (active) return active;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { userId: string; workspaceId: string }) : null;
    if (saved && (!userId || saved.userId === userId)) return saved.workspaceId;
  } catch {
    // stockage indisponible
  }
  return null;
}

export function setActiveWorkspaceId(userId: string, workspaceId: string) {
  active = workspaceId;
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, workspaceId }));
  } catch {
    // stockage indisponible : l'espace reste actif jusqu'au rechargement
  }
}

export function clearActiveWorkspace() {
  active = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible
  }
}

// En-tête envoyé par apiClient : seulement une fois l'espace choisi pour
// l'utilisateur connecté (jamais la valeur d'un autre compte du navigateur).
export const workspaceHeader = (): Record<string, string> => (active ? { "X-Workspace-Id": active } : {});
