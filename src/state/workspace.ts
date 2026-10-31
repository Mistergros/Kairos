import { create } from "zustand";
import { apiGet } from "../utils/apiClient";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "../utils/workspace";
import type { PlanId } from "../hooks/usePlan";

// Espaces auxquels l'utilisateur a accès : le sien, et ceux où il a été invité
// comme membre (tous les dossiers) ou comme client (un dossier). Voir
// api/workspaces.ts pour les règles.
export type WorkspaceRole = "owner" | "editor" | "guest";
export type Workspace = {
  id: string;
  name: string;
  role: WorkspaceRole;
  planId: PlanId;
  active: boolean;
  establishments: { id: string; name: string; role: "contrib" | "viewer" }[];
};

interface WorkspaceState {
  userId: string | null;
  workspaces: Workspace[];
  current: Workspace | null;
  loaded: boolean;
  /** Charge la liste et choisit l'espace actif (le dernier utilisé s'il est encore accessible). */
  load: (userId: string) => Promise<Workspace>;
}

const ownWorkspace = (userId: string): Workspace => ({
  id: userId, name: "Mon espace", role: "owner", planId: "free", active: false, establishments: [],
});

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  userId: null,
  workspaces: [],
  current: null,
  loaded: false,
  load: async (userId) => {
    let list: Workspace[] = [ownWorkspace(userId)];
    try {
      const data = await apiGet<{ workspaces: Workspace[] }>("/api/workspaces");
      if (data?.workspaces?.length) list = data.workspaces;
    } catch {
      // Hors ligne ou serveur indisponible : on reste sur son propre espace.
    }
    const wanted = getActiveWorkspaceId(userId);
    const current = list.find((w) => w.id === wanted) || list[0];
    setActiveWorkspaceId(userId, current.id);
    set({ userId, workspaces: list, current, loaded: true });
    return current;
  },
}));

// Un invité en lecture seule ne modifie rien ; un client contributeur modifie
// son dossier ; les membres modifient tout.
export const canEditCurrentWorkspace = (w: Workspace | null) =>
  !w || w.role !== "guest" || w.establishments.some((e) => e.role === "contrib");

// Change d'espace : les données locales de l'espace précédent sont effacées et
// la page rechargée, pour qu'aucune écriture en cours ne parte vers le mauvais espace.
export const switchWorkspace = (userId: string, workspaceId: string) => {
  setActiveWorkspaceId(userId, workspaceId);
  window.location.assign("/");
};
