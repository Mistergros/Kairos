import type { Branding } from "../types";
import { apiGet, apiPost } from "../utils/apiClient";

// La marque est enregistrée sur le serveur (table org_branding) et gardée en
// copie locale : les PDF restent à la marque hors connexion, et la démo locale
// sans API fonctionne aussi.
const CACHE_KEY = "kaijos_branding";

const readCache = (): Branding => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Branding;
  } catch {
    return {};
  }
};
const writeCache = (branding: Branding) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(branding));
  } catch {
    // stockage plein ou bloqué : le serveur reste la référence
  }
};

export const loadBranding = async (): Promise<Branding> => {
  try {
    const branding = await apiGet<Branding>("/api/branding");
    writeCache(branding || {});
    return branding || {};
  } catch {
    return readCache();
  }
};

export const cachedBranding = readCache;

// Renvoie la version enregistrée. Sans API joignable en démo locale
// (VITE_BYPASS_AUTH), on garde seulement la copie locale.
export const saveBranding = async (branding: Branding): Promise<Branding> => {
  if (import.meta.env.VITE_BYPASS_AUTH === "true") {
    writeCache(branding);
    return branding;
  }
  const saved = await apiPost<Branding>("/api/branding", branding);
  writeCache(saved);
  return saved;
};

// Limites alignées sur le serveur : marque cabinet 600 px / 400 000 caractères,
// logo d’établissement 400 px / 200 000 (api/branding.ts, api/server.ts).
export const CABINET_LOGO = { maxSide: 600, maxLength: 400_000 };
export const ESTABLISHMENT_LOGO = { maxSide: 400, maxLength: 200_000 };

// Redimensionne le logo (600 px max) et le convertit en PNG, ou en JPEG s'il
// reste trop lourd : jsPDF n'intègre que PNG/JPEG, et SVG/WebP passent ainsi.
export const prepareLogo = (file: File, limits = CABINET_LOGO): Promise<NonNullable<Branding["logo"]>> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, limits.maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || limits.maxSide) * ratio));
      const height = Math.max(1, Math.round((img.naturalHeight || limits.maxSide) * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Impossible de lire l'image."));
      ctx.drawImage(img, 0, 0, width, height);
      let dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > limits.maxLength) {
        // JPEG n'a pas de transparence : fond blanc, comme la page du PDF.
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      }
      if (dataUrl.length > limits.maxLength) return reject(new Error("Le logo est trop lourd, essayez une image plus simple."));
      resolve({ dataUrl, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ce fichier n'est pas une image lisible (PNG, JPEG, SVG ou WebP)."));
    };
    img.src = url;
  });
