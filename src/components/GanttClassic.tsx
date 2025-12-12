import React, { useMemo, useRef } from 'react';
import {
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  format,
  min as dfMin,
  max as dfMax,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export type GanttAction = { id: string; label: string; start: Date | string; end: Date | string };
export type GanttRisk = {
  riskId: string;
  label: string;
  start: Date | string;
  end: Date | string;
  actions: GanttAction[];
};

type Props = {
  data: GanttRisk[];
  heightPerRisk?: number;
};

// Palette inspirée du modèle (orange, rouge, rose, bleu, cyan, violet)
const palette = ['#f59a2e', '#f44336', '#f06292', '#3f51b5', '#29b6f6', '#7c3aed'];

const parseDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));
const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
};

export const GanttClassic: React.FC<Props> = ({ data, heightPerRisk = 96 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const view = useMemo(() => {
    if (!data.length) return null;
    const parsed = data.map((r) => ({
      ...r,
      start: parseDate(r.start),
      end: parseDate(r.end),
      actions: r.actions.map((a) => ({ ...a, start: parseDate(a.start), end: parseDate(a.end) })),
    }));
    const minDate = startOfMonth(dfMin(parsed.map((r) => r.start)));
    const maxDate = endOfMonth(
      dfMax(parsed.flatMap((r) => [r.end, ...r.actions.map((a) => a.end)] as Date[]))
    );
    const totalDays = Math.max(1, differenceInDays(maxDate, minDate));
    const months = eachMonthOfInterval({ start: minDate, end: maxDate }).map((m, idx, arr) => {
      const startM = idx === 0 ? minDate : m;
      const endM = idx === arr.length - 1 ? maxDate : endOfMonth(m);
      return {
        label: format(m, 'MMMM', { locale: fr }),
        start: startM,
        end: endM,
      };
    });

    const leftPad = 240;
    const rightPad = 40;
    const widthPx = 1400;
    const timelineWidth = widthPx - leftPad - rightPad;

    const toX = (d: Date) => leftPad + (differenceInDays(d, minDate) / totalDays) * timelineWidth;

    const rows: Array<{
      y: number;
      height: number;
      risk: GanttRisk;
      color: string;
      riskStart: number;
      riskEnd: number;
      actions: Array<{
        x1: number;
        x2: number;
        label: string;
        start: Date;
        end: Date;
      }>;
    }> = [];

    let currentY = 80;
    parsed.forEach((risk) => {
      const color = colorFor(risk.riskId);
      const x1 = toX(risk.start as Date);
      const x2 = toX(risk.end as Date);
      const actions = risk.actions.map((a) => ({
        x1: toX(a.start as Date),
        x2: toX(a.end as Date),
        label: a.label,
        start: a.start as Date,
        end: a.end as Date,
      }));
      const actionsHeight = Math.max(actions.length, 1) * 16 + 8;
      const blockHeight = heightPerRisk + actionsHeight;
      rows.push({
        y: currentY,
        height: blockHeight,
        risk,
        color,
        riskStart: x1,
        riskEnd: x2,
        actions,
      });
      currentY += blockHeight + 20;
    });

    const heightPx = currentY + 40;

    return { months, minDate, maxDate, toX, rows, widthPx, heightPx, leftPad };
  }, [data, heightPerRisk]);

  const exportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gantt.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgRef.current!.viewBox.baseVal.width || svgRef.current!.clientWidth;
      canvas.height = svgRef.current!.viewBox.baseVal.height || svgRef.current!.clientHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'gantt.png';
        a.click();
      });
    };
    img.src = url;
  };

  if (!view) return <p className="text-sm text-slate-600">Aucune donnée pour le Gantt.</p>;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button className="btn" onClick={exportSvg}>
          Exporter SVG
        </button>
        <button className="btn-secondary" onClick={downloadPng}>
          Exporter PNG
        </button>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${view.widthPx} ${view.heightPx}`}
        role="img"
        aria-label="Diagramme de Gantt risques/actions"
      >
        <defs>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a22" />
          </filter>
        </defs>

        <rect x="0" y="0" width={view.widthPx} height={view.heightPx} fill="#ffffff" rx="12" />

        {/* Grille mensuelle */}
        <text x={view.widthPx - 120} y={28} textAnchor="end" fontSize="12" fontWeight="600" fill="#0f172a">
          {format(view.minDate, 'yyyy')}{view.minDate.getFullYear() === view.maxDate.getFullYear() ? '' : ` - ${format(view.maxDate, 'yyyy')}`}
        </text>
        {view.months.map((m, idx) => {
          const x1 = view.toX(m.start);
          const x2 = view.toX(m.end);
          return (
            <g key={`m-${idx}`}>
              <rect x={x1} y={64} width={x2 - x1} height={view.heightPx - 96} fill={idx % 2 === 0 ? '#f8f9fb' : '#e9ecef'} />
              <text x={(x1 + x2) / 2} y={50} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="700">
                {m.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Risques + actions */}
        {view.rows.map((row) => {
          const riskLabelY = row.y - 4;
          const barY = row.y + 10;
          const actionsStartY = barY + 28;
          const riskColor = row.color;
          const actionColor = `${riskColor}AA`;
          return (
            <g key={row.risk.riskId}>
              {/* label risque + actions (gauche) */}
              <g>
                <rect x={24} y={riskLabelY - 16} rx={6} height={20} width={140} fill={riskColor} />
                <text x={30} y={riskLabelY - 2} fontSize="12" fontWeight="700" fill="#ffffff">
                  {row.risk.label}
                </text>
                {row.actions.map((a, ia) => (
                  <text
                    key={`lbl-${row.risk.riskId}-${ia}`}
                    x={36}
                    y={riskLabelY + 14 + ia * 13}
                    fontSize="11"
                    fill="#0f172a"
                  >
                    • {a.label}
                  </text>
                ))}
              </g>

              {/* barre risque (épaisse) */}
              <g filter="url(#shadow)">
                <rect
                  x={row.riskStart}
                  y={barY}
                  width={row.riskEnd - row.riskStart}
                  height={18}
                  rx={9}
                  fill={riskColor}
                />
                <polygon
                  points={`${row.riskEnd - 10},${barY} ${row.riskEnd + 12},${barY + 9} ${row.riskEnd - 10},${barY + 18}`}
                  fill={riskColor}
                />
                {row.riskEnd - row.riskStart > 80 && (
                  <>
                    <rect
                      x={row.riskStart + 8}
                      y={barY - 14}
                      rx={6}
                      height={12}
                      width={Math.min(140, row.riskEnd - row.riskStart - 24)}
                      fill="#0f172a"
                      opacity={0.9}
                    />
                    <text
                      x={row.riskStart + 12}
                      y={barY - 4}
                      fontSize="9"
                      fontWeight="700"
                      fill="#ffffff"
                    >
                      {`${format(row.risk.start as Date, 'dd/MM', { locale: fr })} au ${format(row.risk.end as Date, 'dd/MM', {
                        locale: fr,
                      })}`}
                    </text>
                  </>
                )}
              </g>

              {/* actions (barre fine + pastilles) */}
              {row.actions.map((a, ia) => {
                const y = actionsStartY + ia * 14;
                return (
                  <g key={a.label}>
                    <line
                      x1={a.x1}
                      x2={a.x2}
                      y1={y + 5}
                      y2={y + 5}
                      stroke={actionColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle cx={a.x1} cy={y + 5} r={5} fill={riskColor} />
                    <circle cx={a.x2} cy={y + 5} r={5} fill={riskColor} />
                    {a.x2 - a.x1 > 70 && (
                      <>
                        <rect x={a.x1} y={y - 13} rx={6} height={14} width={Math.min(120, a.x2 - a.x1 - 14)} fill="#0f172a" opacity={0.9} />
                        <text x={a.x1 + 6} y={y - 2} fontSize="9" fontWeight="600" fill="#ffffff">
                          {`${format(a.start, 'dd/MM', { locale: fr })} au ${format(a.end, 'dd/MM', { locale: fr })}`}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default GanttClassic;
