import React, { useEffect, useMemo, useRef } from 'react';
import {
  differenceInDays,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  max as dfMax,
  min as dfMin,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';

/* ----------------- Types ----------------- */
export type GanttActionItem = {
  id: string;
  label: string;
  start: string | Date;
  end: string | Date;
  color?: string; // si vide, dérivée du risque
};

export type GanttRiskItem = {
  riskId: string;
  label: string;
  start: string | Date;   // sert à cadrer l’échelle
  end: string | Date;
  color?: string;         // si vide, palette automatique
  actions: GanttActionItem[];
};

export type GanttDUERPInput = {
  unitLabel: string;
  start: string | Date;
  end: string | Date;
  items: GanttRiskItem[];
};

type Props = {
  data: GanttDUERPInput;
  monthWidth?: number;   // largeur d’un mois (défaut 160 px)
  showHeader?: boolean;  // défaut false
};

/* ----------------- Thème & utils ----------------- */
const THEME = {
  ink: '#0F2233',
  gridA: '#F6F9FC',
  gridB: '#EEF3F7',
  muted: '#6B7683',

  // colonne gauche compacte
  leftCol: 240,
  rightPad: 64,
  monthBandTop: 96,
  rowHeight: 120,

  // lignes d’action
  baselineColor: 'rgba(0,0,0,0.18)',
  baselineW: 2,
  lineW: 4,
  dotR: 5,
  actionTopOffset: 48,
  actionVSpace: 30,
};

// palette variée
const PALETTE = [
  '#FF5A58', '#22A9F1', '#7C5CFF', '#46C37B',
  '#F6C146', '#E26BD2', '#00B3A4', '#FF8A00',
];

const parseDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

const lighten = (hex: string, ratio = 0.35) => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

const colorForRisk = (idx: number, explicit?: string) =>
  explicit ?? PALETTE[idx % PALETTE.length];

/* ----------------- Composant ----------------- */
const GanttDUERP: React.FC<Props> = ({
  data,
  monthWidth = 160,
  showHeader = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const view = useMemo(() => {
    if (!data.items?.length) return null;

    // normalisation + couleurs
    const items = data.items.map((r, i) => {
      const riskColor = colorForRisk(i, r.color);
      return {
        ...r,
        color: riskColor,
        start: parseDate(r.start),
        end: parseDate(r.end),
        actions: r.actions.map(a => ({
          ...a,
          start: parseDate(a.start),
          end: parseDate(a.end),
          color: a.color ?? lighten(riskColor, 0.25),
        })),
      };
    });

    // bornes réelles
    const realMin = dfMin([
      parseDate(data.start),
      ...items.map(r => r.start as Date),
      ...items.flatMap(r => r.actions.map(a => a.start as Date)),
    ]);
    const realMax = dfMax([
      parseDate(data.end),
      ...items.map(r => r.end as Date),
      ...items.flatMap(r => r.actions.map(a => a.end as Date)),
    ]);

    // timeline total = 1er janv (min) → 31 déc (max)
    const timelineStart = startOfYear(realMin);
    const timelineEnd   = endOfYear(realMax);

    // mois couvrant tout le timeline
    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd }).map((m, i, arr) => ({
      label: format(m, 'MMMM', { locale: fr }).toUpperCase(),
      start: i === 0 ? timelineStart : m,
      end: i === arr.length - 1 ? timelineEnd : endOfMonth(m),
      year: m.getFullYear(),
      monthIndex: m.getMonth(), // 0..11
    }));

    // géométrie horizontale
    const leftPad = THEME.leftCol;
    const rightPad = THEME.rightPad;
    const totalMonths = months.length;
    const timelinePixelWidth = totalMonths * monthWidth;
    const widthPx = leftPad + rightPad + timelinePixelWidth;

    // mapping date -> x
    const totalDays = Math.max(1, differenceInDays(timelineEnd, timelineStart));
    const toX = (d: Date) =>
      leftPad + (differenceInDays(d, timelineStart) / totalDays) * timelinePixelWidth;

    // lignes (par risque) avec hauteur adaptÇ¸e au nombre d'actions
    const rows: Array<{
      risk: typeof items[number];
      y: number;
      rowHeight: number;
      actions: Array<{
        id: string;
        x1: number;
        x2: number;
        yMid: number;
        label: string;
        shortLabel: string;
        color: string;
      }>;
    }> = [];

    let yCursor = THEME.monthBandTop + 10;
    items.forEach((risk) => {
      const actions = risk.actions.map((a, ia) => {
        const shortLabel =
          typeof a.label === 'string' && a.label.length > 34
            ? `${a.label.slice(0, 34).trim()}…`
            : a.label;
        return {
          id: a.id,
          x1: toX(a.start as Date),
          x2: toX(a.end as Date),
          yMid: yCursor + THEME.actionTopOffset + ia * THEME.actionVSpace,
          label: a.label,
          shortLabel,
          color: a.color!,
        };
      });
      const dynamicHeight = Math.max(
        THEME.rowHeight,
        THEME.actionTopOffset + (actions.length > 0 ? (actions.length - 1) * THEME.actionVSpace : 0) + 42
      );
      rows.push({ risk, y: yCursor, rowHeight: dynamicHeight, actions });
      yCursor += dynamicHeight;
    });

    // dimension verticale
    const lastRow = rows[rows.length - 1];
    const lastY = lastRow ? lastRow.y + lastRow.rowHeight : THEME.monthBandTop + 36;
    const heightPx = Math.max(lastY + 110, THEME.monthBandTop + 340);
    const gridHeight = heightPx - THEME.monthBandTop - 70;

    // index du mois courant dans la frise
    const today = new Date();
    let currentMonthIndex = Math.floor(differenceInDays(startOfMonth(today), timelineStart) / 30.4375);
    // borne dans [0, totalMonths-1]
    currentMonthIndex = Math.max(0, Math.min(totalMonths - 1, currentMonthIndex));

    return {
      months,
      widthPx,
      heightPx,
      gridHeight,
      toX,
      leftPad,
      rightPad,
      rows,
      monthWidth,
      currentMonthIndex,
    };
  }, [data, monthWidth]);

  // Auto-scroll pour démarrer sur le mois courant
  useEffect(() => {
    if (!view || !scrollRef.current) return;
    const target = view.currentMonthIndex * view.monthWidth;
    // petit offset pour coller le mois courant à gauche
    scrollRef.current.scrollLeft = target;
  }, [view]);

  const exportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gantt.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = svgRef.current?.viewBox.baseVal.width || svgRef.current?.clientWidth || view!.widthPx;
      const height = svgRef.current?.viewBox.baseVal.height || svgRef.current?.clientHeight || view!.heightPx;
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = 'gantt.png'; a.click();
        URL.revokeObjectURL(a.href);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  if (!view) {
    return <div style={{ color: THEME.ink, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <p style={{ color: THEME.muted }}>Aucune donnée pour le Gantt.</p>
    </div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${THEME.leftCol}px 1fr`,
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 8px 24px rgba(15,34,51,0.08)',
        border: '1px solid #E8EEF3',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        color: THEME.ink,
        width: '100%',            // <— ne déborde pas du layout
        maxWidth: '100%',
      }}
    >
      {/* Colonne gauche compacte */}
      <div style={{ padding: '12px 8px 8px 12px' }}>
        {showHeader ? (
          <div style={{ marginBottom: 8 }}>
            <strong style={{ fontSize: 16 }}>Roadmap (Gantt) par unité</strong>
            <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
              <button onClick={exportSVG} style={{ background: 'none', border: 'none', color: '#22A9F1', cursor: 'pointer', fontWeight: 600 }}>
                Exporter SVG
              </button>
              <button onClick={exportPNG} style={{ background: 'none', border: 'none', color: '#22A9F1', cursor: 'pointer', fontWeight: 600 }}>
                Exporter PNG
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ paddingTop: THEME.monthBandTop + 10 }}>
          {view.rows.map(row => (
            <div key={row.risk.riskId} style={{ height: row.rowHeight, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 2,
                  background: row.risk.color,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13.5,
                  padding: '8px 12px',
                  borderRadius: 16,
                  display: 'inline-block',
                  maxWidth: THEME.leftCol - 22,
                  lineHeight: 1.25,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {row.risk.label}
              </div>
              {row.actions.length > 0 ? (
                row.actions.map((a, idx) => (
                  <div
                    key={a.id}
                    style={{
                      position: 'absolute',
                      top: THEME.actionTopOffset - 4 + idx * THEME.actionVSpace,
                      left: 10,
                      color: THEME.muted,
                      fontSize: 12.5,
                      maxWidth: THEME.leftCol - 22,
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'grid',
                      gridTemplateColumns: '16px 1fr',
                      alignItems: 'start',
                      gap: 8,
                    }}
                    title={a.label}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: a.color,
                        display: 'inline-block',
                        marginTop: 4,
                      }}
                    />
                    <span>{a.shortLabel}</span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    top: THEME.actionTopOffset - 4,
                    left: 10,
                    color: THEME.muted,
                    fontSize: 12.5,
                    maxWidth: THEME.leftCol - 22,
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'grid',
                    gridTemplateColumns: '16px 1fr',
                    alignItems: 'start',
                    gap: 8,
                  }}
                  title={`Action prioritaire sur ${row.risk.label}`}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: row.risk.color,
                      display: 'inline-block',
                      marginTop: 4,
                    }}
                  />
                  <span>Action prioritaire sur {row.risk.label}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Colonne droite : responsive, 100% largeur, scroll si besoin */}
      <div
        ref={scrollRef}
        style={{
          padding: '12px 12px 8px 0',
          overflowX: 'auto',
          width: '100%',     // <— prend la largeur dispo de l’écran
          maxWidth: '100%',
        }}
      >
        <svg
          ref={svgRef}
          width={view.widthPx}      // contenu peut être plus large → scroll
          height={view.heightPx}
          viewBox={`0 0 ${view.widthPx} ${view.heightPx}`}
          role="img"
          aria-label="Diagramme de Gantt DUERP"
          shapeRendering="geometricPrecision"
        >
          {/* fond */}
          <rect x={0} y={0} width={view.widthPx} height={view.heightPx} rx={16} fill="#ffffff" />

          {/* Grille mensuelle sur toute la frise */}
          {view.months.map((m, idx) => {
            const x1 = THEME.leftCol + idx * view.monthWidth;
            const w = view.monthWidth;
            const isJanuary = m.monthIndex === 0;
            return (
              <g key={`${m.year}-${m.monthIndex}`}>
                <rect
                  x={x1}
                  y={THEME.monthBandTop}
                  width={w}
                  height={view.gridHeight}
                  fill={idx % 2 === 0 ? THEME.gridA : THEME.gridB}
                />
                <text
                  x={x1 + w / 2}
                  y={THEME.monthBandTop - 12}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={800}
                  fill={THEME.ink}
                >
                  {m.label}
                </text>
                {isJanuary && (
                  <text
                    x={x1 + 6}
                    y={THEME.monthBandTop - 30}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={800}
                    fill={THEME.muted}
                  >
                    {m.year}
                  </text>
                )}
              </g>
            );
          })}

          {/* Actions */}
          {view.rows.map(row => (
            <g key={row.risk.riskId}>
              {row.actions.map(a => {
                const y = Math.round(a.yMid) + 0.5;
                const xBaseline1 = THEME.leftCol;
                const xBaseline2 = view.widthPx - THEME.rightPad;

                return (
                  <g key={a.id}>
                    <line
                      x1={xBaseline1}
                      y1={y}
                      x2={xBaseline2}
                      y2={y}
                      stroke={THEME.baselineColor}
                      strokeWidth={THEME.baselineW}
                      strokeLinecap="round"
                    />
                    <line
                      x1={a.x1}
                      y1={y}
                      x2={a.x2}
                      y2={y}
                      stroke={a.color}
                      strokeWidth={THEME.lineW}
                      strokeLinecap="round"
                    />
                    <circle cx={a.x1} cy={y} r={THEME.dotR} fill={a.color} stroke="#fff" strokeWidth={2} />
                    <circle cx={a.x2} cy={y} r={THEME.dotR} fill={a.color} stroke="#fff" strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default GanttDUERP;
