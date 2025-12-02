import { create } from "zustand";

interface SettingsState {
  language: "fr" | "en";
  showWizardHints: boolean;
  setLanguage: (lang: "fr" | "en") => void;
  toggleHints: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: "fr",
  showWizardHints: true,
  setLanguage: (language) => set({ language }),
  toggleHints: () => set((state) => ({ showWizardHints: !state.showWizardHints })),
}));
