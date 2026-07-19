import { useEffect, useState, useCallback } from "react";
import { TOUR_STEPS, TOUR_COMPLETED_KEY, WELCOME_DISMISSED_EVENT } from "../data/tourSteps";

const WELCOME_DISMISSED_KEY = "kaijos_welcome_dismissed";
const MIN_WIDTH = 768; // aligné sur le point de rupture md: du menu latéral

type Rect = { top: number; left: number; width: number; height: number };

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null; // élément caché (ex. menu mobile fermé)
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function useTourControls() {
  const [, force] = useState(0);
  const restart = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    window.dispatchEvent(new Event("kaijos:tour-restart"));
    force((n) => n + 1);
  }, []);
  return { restart };
}

export function ProductTour({ establishmentsCount }: { establishmentsCount: number }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const maybeAutoStart = useCallback(() => {
    if (window.innerWidth < MIN_WIDTH) return;
    if (localStorage.getItem(TOUR_COMPLETED_KEY)) return;
    const welcomeStillOpen = establishmentsCount === 0 && !localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (welcomeStillOpen) return;
    setStepIndex(0);
    setActive(true);
  }, [establishmentsCount]);

  useEffect(() => {
    maybeAutoStart();
    const onWelcomeDismissed = () => maybeAutoStart();
    const onRestart = () => {
      setStepIndex(0);
      setActive(true);
    };
    window.addEventListener(WELCOME_DISMISSED_EVENT, onWelcomeDismissed);
    window.addEventListener("kaijos:tour-restart", onRestart);
    return () => {
      window.removeEventListener(WELCOME_DISMISSED_EVENT, onWelcomeDismissed);
      window.removeEventListener("kaijos:tour-restart", onRestart);
    };
  }, [maybeAutoStart]);

  useEffect(() => {
    if (!active) return;
    const update = () => setRect(getTargetRect(TOUR_STEPS[stepIndex].target));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, stepIndex]);

  const finish = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, "1");
    setActive(false);
  };

  if (!active) return null;

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Position de la bulle : à droite de la cible si elle est sur la moitié gauche
  // de l'écran (menu latéral), sinon en dessous (sélecteur en haut de page).
  const bubbleStyle: React.CSSProperties = rect
    ? rect.left < window.innerWidth / 2
      ? { top: Math.min(rect.top, window.innerHeight - 220), left: Math.min(rect.left + rect.width + 16, window.innerWidth - 300) }
      : { top: Math.min(rect.top + rect.height + 12, window.innerHeight - 220), left: Math.max(rect.left - 260, 16) }
    : { top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 150 };

  return (
    <>
      {rect && (
        <div
          className="fixed z-[65] rounded-xl ring-4 ring-kairos ring-offset-2 transition-all duration-200 pointer-events-none"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}
      <div
        className="fixed z-[70] w-[280px] rounded-2xl bg-white p-5 shadow-2xl border border-slate/10 transition-all duration-200"
        style={bubbleStyle}
      >
        <p className="text-xs font-semibold text-kairos mb-1">
          Étape {stepIndex + 1} / {TOUR_STEPS.length}
        </p>
        <h3 className="text-sm font-bold text-ink mb-1.5">{step.title}</h3>
        <p className="text-xs leading-relaxed text-slate/70">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs font-medium text-slate/40 hover:text-slate/60">
            Passer
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((i) => i - 1)}
                className="rounded-lg border border-slate/20 px-3 py-1.5 text-xs font-semibold text-slate hover:bg-slate/5"
              >
                Précédent
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              className="rounded-lg bg-kairos px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {isLast ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
