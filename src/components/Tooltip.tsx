import { useId, useState, type ReactNode } from "react";

type Props = {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

/**
 * Petite bulle d'aide accessible (hover + focus clavier), sans dépendance externe.
 * Usage : <Tooltip text="Explication"><span>Élément à expliquer</span></Tooltip>
 */
export function Tooltip({ text, children, side = "top" }: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-[70] w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-xs font-normal leading-snug text-white shadow-lg ${
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {text}
          <span
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 ${
              side === "top" ? "top-full -mt-1" : "bottom-full -mb-1"
            }`}
          />
        </span>
      )}
    </span>
  );
}

/** Petit "i" cerclé qui déclenche une infobulle au survol/focus — pour accoler une aide à un libellé sans l'alourdir. */
export function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <span
        tabIndex={0}
        role="button"
        aria-label="Aide"
        className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate/30 text-[10px] font-bold text-slate/50 hover:border-kairos hover:text-kairos focus:outline-none focus:ring-2 focus:ring-kairos/40"
      >
        i
      </span>
    </Tooltip>
  );
}
