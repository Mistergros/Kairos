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
  color?: string;
  done?: boolean;
};

export type GanttRiskItem = {
  riskId: string;
  label: string;
  start: string | Date;
  end: string | Date;
  color?: string;
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
  monthWidth?: number;
  showHeader?: boolean;
};

/* ----------------- Thème & utils ----------------- */
const THEME = {
  ink: '#0F2233',
  gridA: '#F6F9FC',
  gridB: '#EEF3F7',
  muted: '#6B7683',
  border: '#E8EEF3',

  leftCol: 256,
  rightPad: 32,
  monthBandH: 88,  // hauteur de la bande mois en haut du SVG

  riskHeaderH: 40, // hauteur de l'en-tête risque (label pill)
  actionRowH: 34,  // hauteur par ligne d'action
  rowPad: 8,       // padding bas de chaque groupe risque

  barH: 18,        // hauteur des barres d'action dans le SVG
  barR: 9,         // border-radius des barres
};

const PALETTE = [
  '#5B61F6', '#22A9F1', '#46C37B', '#F6C146',
  '#FF5A58', '#E26BD2', '#00B3A4', '#FF8A00',
];

const parseDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

const lighten = (hex: string, ratio = 0.9) => {
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

  const finalView = useMemo(() => {
    if (!data.items?.length) return null;

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
          color: a.color ?? riskColor,
          done: a.done ?? false,
        })),
      };
    });

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

    const timelineStart = startOfYear(realMin);
    const timelineEnd   = endOfYear(realMax);

    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd }).map((m, i, arr) => ({
      label: format(m, 'MMM', { locale: fr }).toUpperCase(),
      start: i === 0 ? timelineStart : m,
      end: i === arr.length - 1 ? timelineEnd : endOfMonth(m),
      year: m.getFullYear(),
      monthIndex: m.getMonth(),
    }));

    const leftPad = THEME.leftCol;
    const totalMonths = months.length;
    const timelinePixelWidth = totalMonths * monthWidth;
    const widthPx = leftPad + THEME.rightPad + timelinePixelWidth;

    const totalDays = Math.max(1, differenceInDays(timelineEnd, timelineStart));
    const toX = (d: Date) =>
      leftPad + (differenceInDays(d, timelineStart) / totalDays) * timelinePixelWidth;

    // Chaque risque = 1 en-tête (riskHeaderH) + N lignes d'action (actionRowH) + rowPad
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
        done: boolean;
      }>;
    }> = [];

    let yCursor = THEME.monthBandH;
    items.forEach((risk) => {
      const numActions = Math.max(1, risk.actions.length);
      const rowHeight = THEME.riskHeaderH + numActions * THEME.actionRowH + THEME.rowPad;

      const actions = risk.actions.map((a, ia) => {
        const shortLabel =
          typeof a.label === 'string' && a.label.length > 32
            ? `${a.label.slice(0, 32).trim()}…`
            : a.label;
        const yMid = yCursor + THEME.riskHeaderH + ia * THEME.actionRowH + THEME.actionRowH / 2;
        return {
          id: a.id,
          x1: toX(a.start as Date),
          x2: toX(a.end as Date),
          yMid,
          label: a.label,
          shortLabel,
          color: a.color!,
          done: a.done ?? false,
        };
      });

      rows.push({ risk, y: yCursor, rowHeight, actions });
      yCursor += rowHeight;
    });

    const heightPx = Math.max(yCursor + 40, THEME.monthBandH + 200);

    const today = new Date();
    const todayX = toX(today);
    let currentMonthIndex = Math.floor(differenceInDays(startOfMonth(today), timelineStart) / 30.4375);
    currentMonthIndex = Math.max(0, Math.min(totalMonths - 1, currentMonthIndex));

    return {
      months,
      widthPx,
      heightPx,
      toX,
      leftPad,
      rows,
      monthWidth,
      currentMonthIndex,
      todayX,
      timelinePixelWidth,
    };
  }, [data, monthWidth]);

  useEffect(() => {
    if (!finalView || !scrollRef.current) return;
    const target = Math.max(0, finalView.currentMonthIndex * finalView.monthWidth - 20);
    scrollRef.current.scrollLeft = target;
  }, [finalView]);

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
    if (!svgRef.current || !finalView) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = finalView.widthPx;
      canvas.height = finalView.heightPx;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

  if (!finalView) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', color: THEME.muted, padding: 16 }}>
        Aucune donnée pour le Gantt.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${THEME.leftCol}px 1fr`,
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 4px 20px rgba(15,34,51,0.07)',
        border: `1px solid ${THEME.border}`,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        color: THEME.ink,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Colonne gauche : labels fixes ── */}
      <div style={{ borderRight: `1px solid ${THEME.border}`, background: '#FAFBFD' }}>
        {showHeader && (
          <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${THEME.border}` }}>
            <strong style={{ fontSize: 15, color: THEME.ink }}>Roadmap DUERP</strong>
            <div style={{ marginTop: 6, display: 'flex', gap: 12 }}>
              <button onClick={exportSVG} style={{ background: 'none', border: 'none', color: '#5B61F6', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ↓ SVG
              </button>
              <button onClick={exportPNG} style={{ background: 'none', border: 'none', color: '#5B61F6', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ↓ PNG
              </button>
            </div>
          </div>
        )}

        {/* En-tête vide aligné avec la bande mois du SVG */}
        <div style={{ height: THEME.monthBandH, display: 'flex', alignItems: 'flex-end', padding: '0 14px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Risques
          </span>
        </div>

        {/* Lignes risque */}
        {finalView.rows.map((row) => (
          <div
            key={row.risk.riskId}
            style={{
              height: row.rowHeight,
              borderTop: `1px solid ${THEME.border}`,
              padding: '6px 10px 0',
            }}
          >
            {/* Pill risque */}
            <div
              style={{
                height: THEME.riskHeaderH - 8,
                display: 'flex',
                alignItems: 'center',
                background: row.risk.color,
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                padding: '0 10px',
                borderRadius: 20,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
              title={row.risk.label}
            >
              {row.risk.label}
            </div>

            {/* Labels actions */}
            {row.actions.length === 0 ? (
              <div style={{ height: THEME.actionRowH, display: 'flex', alignItems: 'center', paddingLeft: 4, gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.risk.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 11.5, color: THEME.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Action prioritaire
                </span>
              </div>
            ) : (
              row.actions.map((a) => (
                <div
                  key={a.id}
                  style={{ height: THEME.actionRowH, display: 'flex', alignItems: 'center', paddingLeft: 4, gap: 6 }}
                  title={a.label}
                >
                  {a.done ? (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#46C37B', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
                  ) : (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, flexShrink: 0, display: 'inline-block' }} />
                  )}
                  <span
                    style={{
                      fontSize: 11.5,
                      color: a.done ? '#9AA6B0' : THEME.muted,
                      textDecoration: a.done ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.shortLabel}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* ── Colonne droite : SVG scrollable ── */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', maxWidth: '100%' }}
      >
        <svg
          ref={svgRef}
          width={finalView.widthPx}
          height={finalView.heightPx}
          viewBox={`0 0 ${finalView.widthPx} ${finalView.heightPx}`}
          role="img"
          aria-label="Diagramme de Gantt DUERP"
          shapeRendering="geometricPrecision"
          style={{ display: 'block' }}
        >
          <rect x={0} y={0} width={finalView.widthPx} height={finalView.heightPx} fill="#ffffff" />

          {/* Grille alternée + labels mois */}
          {finalView.months.map((m, idx) => {
            const x1 = idx * finalView.monthWidth;
            const w = finalView.monthWidth;
            return (
              <g key={`${m.year}-${m.monthIndex}`}>
                <rect
                  x={x1}
                  y={THEME.monthBandH}
                  width={w}
                  height={finalView.heightPx - THEME.monthBandH}
                  fill={idx % 2 === 0 ? THEME.gridA : THEME.gridB}
                />
                <line x1={x1} y1={0} x2={x1} y2={finalView.heightPx} stroke={THEME.border} strokeWidth={1} />
                <text
                  x={x1 + w / 2}
                  y={THEME.monthBandH - 18}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={THEME.muted}
                  letterSpacing="0.04em"
                >
                  {m.label}
                </text>
                {m.monthIndex === 0 && (
                  <text
                    x={x1 + 6}
                    y={THEME.monthBandH - 36}
                    textAnchor="start"
                    fontSize={12}
                    fontWeight={800}
                    fill={THEME.ink}
                  >
                    {m.year}
                  </text>
                )}
              </g>
            );
          })}

          {/* Fond coloré des en-têtes risque + séparateurs */}
          {finalView.rows.map((row) => (
            <g key={`bg-${row.risk.riskId}`}>
              <rect
                x={0}
                y={row.y}
                width={finalView.widthPx}
                height={THEME.riskHeaderH}
                fill={lighten(row.risk.color, 0.9)}
              />
              <line
                x1={0} y1={row.y + row.rowHeight}
                x2={finalView.widthPx} y2={row.y + row.rowHeight}
                stroke={THEME.border} strokeWidth={1}
              />
            </g>
          ))}

          {/* Barres d'action */}
          {finalView.rows.map(row => (
            <g key={`actions-${row.risk.riskId}`}>
              {row.actions.map(a => {
                const y = a.yMid;
                const x1 = Math.min(a.x1, a.x2);
                const rawW = Math.abs(a.x2 - a.x1);
                const barW = Math.max(rawW, THEME.barH * 2);
                const barY = y - THEME.barH / 2;

                const barFill = a.done ? '#B7BEC6' : a.color;
                return (
                  <g key={a.id}>
                    <line
                      x1={0} y1={y} x2={finalView.widthPx} y2={y}
                      stroke={THEME.border} strokeWidth={1}
                    />
                    <rect
                      x={x1}
                      y={barY}
                      width={barW}
                      height={THEME.barH}
                      rx={THEME.barR}
                      fill={barFill}
                      opacity={a.done ? 0.6 : 0.88}
                    />
                    <circle cx={x1} cy={y} r={4} fill="#fff" stroke={barFill} strokeWidth={2} />
                    <circle cx={x1 + barW} cy={y} r={4} fill={barFill} stroke="#fff" strokeWidth={1.5} />
                    {barW > 56 && (
                      <text
                        x={x1 + barW / 2}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="#fff"
                        textDecoration={a.done ? 'line-through' : undefined}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {a.done ? '✓ ' : ''}{a.shortLabel.length > 22 ? `${a.shortLabel.slice(0, 22)}…` : a.shortLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* Ligne "aujourd'hui" */}
          {finalView.todayX >= 0 && finalView.todayX <= finalView.widthPx && (
            <g>
              <line
                x1={finalView.todayX} y1={THEME.monthBandH - 8}
                x2={finalView.todayX} y2={finalView.heightPx}
                stroke="#FF5A58"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <text
                x={finalView.todayX + 5}
                y={THEME.monthBandH - 14}
                fontSize={10}
                fill="#FF5A58"
                fontWeight={700}
              >
                Aujourd'hui
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default GanttDUERP;
