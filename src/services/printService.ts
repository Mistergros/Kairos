import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Assessment, ActionItem, WorkUnit, Establishment, Branding, VersionEntry } from "../types";

interface PrintData {
  establishment?: Establishment;
  workUnits: WorkUnit[];
  assessments: Assessment[];
  actions: ActionItem[];
  branding?: Branding;
  versions?: VersionEntry[];
  /** Réimpression d'une version : date affichée à la place de la date du jour. */
  asOf?: string;
}

interface MultiSiteData {
  establishments: Establishment[];
  workUnits: WorkUnit[];
  assessments: Assessment[];
  actions: ActionItem[];
  branding?: Branding;
}

type RGB = [number, number, number];
const KAIJOS_BLUE: RGB = [91, 97, 246];

// Marque du cabinet (offre Pro) : couleur des bandeaux, nom en pied de page et
// bloc « Réalisé par » avec logo. Sans marque, le document reste aux couleurs
// de Kaijos.
function brandTheme(branding?: Branding) {
  const hex = branding?.color && /^#[0-9a-f]{6}$/i.test(branding.color) ? branding.color : null;
  const color: RGB = hex ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] : KAIJOS_BLUE;
  // Texte foncé sur une couleur claire (jaune, vert pâle…), blanc sinon.
  const luminance = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255;
  const onColor: RGB = luminance > 0.65 ? [30, 30, 50] : [255, 255, 255];
  const name = branding?.name?.trim();
  const footerBrand = name ? (branding?.hideKaijos ? name : `${name} — réalisé avec Kaijos`) : "Kaijos";
  return { color, onColor, name, footerBrand };
}

function hasCabinetBlock(branding?: Branding) {
  return Boolean(branding?.name?.trim() || branding?.logo);
}

// Dessine logo + nom + coordonnées à partir de (x, y), dans une largeur
// maximale. Renvoie l'ordonnée sous le bloc.
function drawCabinetBlock(doc: jsPDF, branding: Branding, x: number, y: number, maxWidth: number, title = "Réalisé par"): number {
  const DARK: RGB = [30, 30, 50];
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 130);
  doc.text(title, x, y);
  const top = y + 3;
  let textX = x;
  let logoBottom = top;
  const logo = branding.logo;
  if (logo?.dataUrl) {
    const maxW = Math.min(45, maxWidth * 0.45);
    const maxH = 18;
    const ratio = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    try {
      doc.addImage(logo.dataUrl, logo.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", x, top, w, h);
      textX = x + w + 5;
      logoBottom = top + h;
    } catch {
      // image illisible : on garde le texte seul
    }
  }
  // Encadré étroit (couverture paysage) : téléphone et email sur deux lignes.
  const contact = maxWidth < 130 ? [branding.phone, branding.email] : [[branding.phone, branding.email].filter(Boolean).join("  •  ")];
  const lines = [branding.address, ...contact, branding.website].filter(
    (l): l is string => Boolean(l && l.trim())
  );
  const textWidth = Math.max(30, maxWidth - (textX - x));
  let ty = top + 4;
  if (branding.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    const nameLines = doc.splitTextToSize(branding.name, textWidth);
    doc.text(nameLines, textX, ty);
    ty += nameLines.length * 5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 95);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, textWidth);
    doc.text(wrapped, textX, ty);
    ty += wrapped.length * 3.8;
  }
  return Math.max(logoBottom, ty) + 2;
}

// Bandeau de titre des pages intérieures, avec le nom du cabinet à droite.
function drawPageBand(doc: jsPDF, theme: ReturnType<typeof brandTheme>, title: string, height = 14) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...theme.color);
  doc.rect(0, 0, pageW, height, "F");
  doc.setTextColor(...theme.onColor);
  doc.setFontSize(height > 14 ? 12 : 13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, height / 2 + 2);
  if (theme.name) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(theme.name, pageW - 14, height / 2 + 1.5, { align: "right" });
  }
}

const PRIORITY_COLORS: Record<number, [number, number, number]> = {
  1: [197, 48, 48],
  2: [192, 86, 33],
  3: [183, 121, 31],
  4: [39, 103, 73],
};

const STATUS_LABELS: Record<string, string> = {
  TO_DO: "À faire",
  IN_PROGRESS: "En cours",
  LATE: "En retard",
  DONE: "Terminé",
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  DONE: [39, 103, 73],
  LATE: [197, 48, 48],
  IN_PROGRESS: [43, 108, 176],
  TO_DO: [100, 100, 100],
};

function priorityLabel(p: number): string {
  return ["", "P1 Critique", "P2 Haute", "P3 Modérée", "P4 Surveiller"][p] || `P${p}`;
}

// ── DUERP COMPLET ───────────────────────────────────────────────────────────
// Document de livraison, A4 portrait : couverture (logos de l'entreprise et du
// cabinet), sommaire, synthèse, méthode d'évaluation, unités de travail,
// inventaire par unité, plan d'action, validation et historique des versions.
// Le contenu suit l'art. R.4121-1 du Code du travail ; la mise en page est libre.

type Theme = ReturnType<typeof brandTheme>;
type Logo = { dataUrl: string; width: number; height: number };

const INK: RGB = [30, 30, 50];
const MUTED: RGB = [110, 115, 130];
const LINE: RGB = [225, 228, 236];
const SOFT: RGB = [246, 247, 251];
const MARGIN = 18;
const PRIORITY_NAMES: Record<number, string> = { 1: "Critique", 2: "Haute", 3: "Modérée", 4: "À surveiller" };
const PRIORITY_DELAYS: Record<number, string> = {
  1: "Action immédiate",
  2: "Dans les 3 mois",
  3: "Dans l'année",
  4: "Suivi lors de la mise à jour",
};

function lighten([r, g, b]: RGB, amount: number): RGB {
  return [r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount].map(Math.round) as RGB;
}

// Nombres à la française (0,5 et non 0.5).
const num = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

// Logo dans une boîte maximale, proportions conservées. Renvoie la largeur
// réellement utilisée (0 si l'image est illisible).
function drawLogo(doc: jsPDF, logo: Logo | null | undefined, x: number, y: number, maxW: number, maxH: number, align: "left" | "right" = "left") {
  if (!logo?.dataUrl) return 0;
  const ratio = Math.min(maxW / logo.width, maxH / logo.height);
  const w = logo.width * ratio;
  const h = logo.height * ratio;
  try {
    doc.addImage(logo.dataUrl, logo.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", align === "right" ? x - w : x, y, w, h);
    return w;
  } catch {
    return 0;
  }
}

function sectionTitle(doc: jsPDF, theme: Theme, number: number, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...theme.color);
  if (number > 0) doc.text(String(number).padStart(2, "0"), MARGIN, y);
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(title, number > 0 ? MARGIN + 9 : MARGIN, y);
  doc.setDrawColor(...theme.color);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 3, MARGIN + 18, y + 3);
  return y + 12;
}

function paragraph(doc: jsPDF, text: string, y: number, width: number, size = 9.5, color: RGB = INK) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, MARGIN, y);
  return y + lines.length * size * 0.42 + 2.5;
}

export function printDuerpDocument(data: PrintData): void {
  const { establishment, workUnits, assessments, actions, branding } = data;
  const versions = (data.versions || [])
    .filter((v) => !establishment || v.establishmentId === establishment.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const today = new Date(data.asOf || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const theme = brandTheme(branding);
  const cabinet = branding && hasCabinetBlock(branding) ? branding : null;
  const estName = establishment?.name || "Établissement";
  const unitName = (id: string) => workUnits.find((u) => u.id === id)?.name || "—";
  const sorted = [...assessments].sort((a, b) => a.priority - b.priority || b.score - a.score);
  const count = (p: number) => assessments.filter((a) => a.priority === p).length;
  const done = actions.filter((a) => a.status === "DONE").length;
  const late = actions.filter((a) => a.status !== "DONE" && (a.dueDate || a.endDate) && new Date(a.dueDate || a.endDate!) < new Date()).length;
  const toc: { title: string; page: number }[] = [];
  const lastTableY = () => (doc as any).lastAutoTable.finalY as number;
  const tableBase = {
    theme: "plain" as const,
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: 18 },
    styles: { font: "helvetica", fontSize: 8, textColor: INK, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: lighten(theme.color, 0.88), textColor: INK, fontStyle: "bold" as const, fontSize: 7.5, lineWidth: 0 },
  };

  // ── 1. Couverture ──
  doc.setFillColor(...theme.color);
  doc.rect(0, 0, pageW, 8, "F");
  drawLogo(doc, establishment?.logo, MARGIN, 22, 55, 28);
  if (cabinet?.logo) drawLogo(doc, cabinet.logo, pageW - MARGIN, 22, 50, 22, "right");

  let y = 92;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...theme.color);
  doc.text("DOCUMENT UNIQUE D'ÉVALUATION DES RISQUES PROFESSIONNELS", MARGIN, y);
  y += 12;
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(estName, contentW);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 11 + 2;
  if (establishment?.clientName && establishment.clientName !== estName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...MUTED);
    doc.text(establishment.clientName, MARGIN, y);
    y += 8;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`Édition du ${today}`, MARGIN, y + 2);

  const info: [string, string][] = [
    ["SIRET", establishment?.siret || "—"],
    ["Code NAF", establishment?.codeNaf || "—"],
    ["Adresse", establishment?.address || "—"],
    ["Effectif", establishment?.headcount ? `${establishment.headcount} salariés` : "—"],
    ["Unités de travail", String(workUnits.length)],
    ["Version", versions[0] ? `${versions[0].label} (${formatDate(versions[0].createdAt)})` : "Version de travail"],
  ];
  autoTable(doc, {
    ...tableBase,
    startY: y + 14,
    body: info,
    styles: { ...tableBase.styles, fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45, textColor: MUTED }, 1: { cellWidth: contentW - 45 } },
    alternateRowStyles: { fillColor: SOFT },
  });

  // Bas de couverture : base légale et auteur.
  let by = pageH - 58;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, by - 6, pageW - MARGIN, by - 6);
  if (cabinet) {
    drawCabinetBlock(doc, cabinet, MARGIN, by, contentW * 0.62);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Réalisé avec Kaijos", MARGIN, by);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    doc.splitTextToSize("Établi selon les articles R.4121-1 à R.4121-4 du Code du travail. À conserver 40 ans (art. L.4121-3-1).", contentW * 0.34),
    pageW - MARGIN,
    by,
    { align: "right" }
  );
  doc.setFillColor(...theme.color);
  doc.rect(0, pageH - 8, pageW, 8, "F");

  // ── 2. Sommaire (rempli à la fin, quand les numéros de page sont connus) ──
  doc.addPage();
  const tocPage = doc.getNumberOfPages();

  // Nouvelle partie : sur une nouvelle page, ou à la suite de la précédente
  // si `after` (ordonnée de fin de la partie précédente) laisse assez de place.
  const newSection = (title: string, after?: number, needed = 90) => {
    const inline = after !== undefined && after + needed < pageH - 20;
    if (!inline) doc.addPage();
    toc.push({ title, page: doc.getNumberOfPages() });
    return sectionTitle(doc, theme, toc.length, title, inline ? after! + 14 : 34);
  };

  // ── 3. Synthèse ──
  y = newSection("Synthèse");
  const cards: [string, string, RGB][] = [
    [String(assessments.length), "risques évalués", INK],
    [String(count(1)), "priorité 1 (critique)", PRIORITY_COLORS[1]],
    [String(count(2)), "priorité 2 (haute)", PRIORITY_COLORS[2]],
    [`${done}/${actions.length}`, "actions terminées", PRIORITY_COLORS[4]],
  ];
  const cardW = (contentW - 9) / 4;
  cards.forEach(([value, label, color], i) => {
    const x = MARGIN + i * (cardW + 3);
    doc.setFillColor(...SOFT);
    doc.roundedRect(x, y, cardW, 24, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...color);
    doc.text(value, x + 5, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 5, y + 19);
  });
  y += 34;

  // Répartition des priorités : barre empilée + légende.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Répartition des risques par priorité", MARGIN, y);
  y += 5;
  let bx = MARGIN;
  [1, 2, 3, 4].forEach((p) => {
    const w = assessments.length ? (count(p) / assessments.length) * contentW : 0;
    if (w > 0) {
      doc.setFillColor(...PRIORITY_COLORS[p]);
      doc.rect(bx, y, w, 6, "F");
      bx += w;
    }
  });
  if (!assessments.length) {
    doc.setFillColor(...LINE);
    doc.rect(MARGIN, y, contentW, 6, "F");
  }
  y += 11;
  [1, 2, 3, 4].forEach((p, i) => {
    const x = MARGIN + i * (contentW / 4);
    doc.setFillColor(...PRIORITY_COLORS[p]);
    doc.circle(x + 1.5, y - 1.2, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(`P${p} ${PRIORITY_NAMES[p]} : ${count(p)}`, x + 5, y);
  });
  y += 10;
  if (late) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PRIORITY_COLORS[1]);
    doc.text(`${late} action${late > 1 ? "s" : ""} en retard sur l'échéance prévue.`, MARGIN, y);
    y += 8;
  }

  const top = sorted.filter((a) => a.priority <= 2).slice(0, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Risques prioritaires", MARGIN, y);
  if (top.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y + 3,
      head: [["Priorité", "Unité", "Risque", "Mesure proposée"]],
      body: top.map((a) => [`P${a.priority}`, unitName(a.workUnitId), a.riskLabel, a.proposedMeasures || "—"]),
      columnStyles: { 0: { cellWidth: 18, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 32 }, 2: { cellWidth: 55, fontStyle: "bold" }, 3: { cellWidth: contentW - 105 } },
      didParseCell: (h) => {
        if (h.section === "body" && h.column.index === 0) {
          const p = top[h.row.index]?.priority || 4;
          h.cell.styles.fillColor = PRIORITY_COLORS[p];
          h.cell.styles.textColor = [255, 255, 255];
        }
      },
    });
  } else {
    paragraph(doc, "Aucun risque de priorité 1 ou 2 n'a été identifié à ce jour.", y + 6, contentW, 9, MUTED);
  }

  // ── 4. Méthode d'évaluation ──
  y = newSection("Méthode d'évaluation");
  y = paragraph(
    doc,
    "L'évaluation est réalisée par unité de travail : un poste, un métier ou un lieu regroupant des salariés exposés aux mêmes dangers. Pour chaque risque identifié, trois critères sont cotés, puis combinés en un score qui détermine la priorité d'action.",
    y,
    contentW
  );
  y += 2;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Critère", "Ce qu'il mesure", "Échelle"]],
    body: [
      ["Gravité (G)", "Les conséquences possibles d'un accident ou d'une exposition", "3 gêne · 5 arrêt court · 8 arrêt long · 10 invalidité ou décès"],
      ["Fréquence (F)", "La fréquence d'exposition au danger", "2 rare · 4 mensuelle · 6 hebdomadaire · 9 quotidienne"],
      ["Maîtrise (M)", "Le niveau des mesures de prévention en place et leur application", "0,5 aucune mesure · jusqu'à 5 mesures vérifiées et appliquées"],
    ],
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 1: { cellWidth: 72 }, 2: { cellWidth: contentW - 102 } },
  });
  y = lastTableY() + 8;
  doc.setFillColor(...lighten(theme.color, 0.9));
  doc.roundedRect(MARGIN, y, contentW, 13, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Score = Gravité × Fréquence ÷ Maîtrise", pageW / 2, y + 8.3, { align: "center" });
  y += 21;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Priorité", "Score", "Signification", "Délai indicatif"]],
    body: [
      ["P1", "80 et plus", PRIORITY_NAMES[1], PRIORITY_DELAYS[1]],
      ["P2", "50 à 79", PRIORITY_NAMES[2], PRIORITY_DELAYS[2]],
      ["P3", "25 à 49", PRIORITY_NAMES[3], PRIORITY_DELAYS[3]],
      ["P4", "moins de 25", PRIORITY_NAMES[4], PRIORITY_DELAYS[4]],
    ],
    columnStyles: { 0: { cellWidth: 20, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 32 }, 2: { cellWidth: 45 }, 3: { cellWidth: contentW - 97 } },
    didParseCell: (h) => {
      if (h.section === "body" && h.column.index === 0) {
        h.cell.styles.fillColor = PRIORITY_COLORS[h.row.index + 1];
        h.cell.styles.textColor = [255, 255, 255];
      }
    },
  });
  y = lastTableY() + 8;
  y = paragraph(
    doc,
    "Les risques proposés s'appuient sur des sources officielles (publications de l'INRS, Code du travail, organismes de prévention) indiquées pour chaque risque lorsqu'elles sont connues. Les cotations et les mesures ont été relues et validées par l'employeur, qui reste responsable de l'évaluation des risques de son entreprise.",
    y,
    contentW,
    9,
    MUTED
  );
  y = paragraph(
    doc,
    "Ce document est mis à jour au moins chaque année dans les entreprises d'au moins 11 salariés, ainsi qu'à chaque décision d'aménagement important modifiant les conditions de travail et lorsqu'une information nouvelle sur un risque est recueillie (art. R.4121-2). Il est tenu à la disposition des travailleurs, des membres du CSE, du médecin du travail et de l'inspection du travail (art. R.4121-4).",
    y + 1,
    contentW,
    9,
    MUTED
  );

  // ── 5. Unités de travail ──
  y = newSection("Unités de travail", y, 30 + workUnits.length * 9);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["Unité de travail", "Activité", "Effectif", "Risques", "Priorité la plus haute"]],
    body: workUnits.map((u) => {
      const own = assessments.filter((a) => a.workUnitId === u.id);
      const worst = own.length ? Math.min(...own.map((a) => a.priority)) : 0;
      return [u.name, u.activity || u.description || "—", u.headcount ? String(u.headcount) : "—", String(own.length), worst ? `P${worst} ${PRIORITY_NAMES[worst]}` : "—"];
    }),
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" }, 1: { cellWidth: 55 }, 2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: contentW - 136 } },
  });

  // ── 6. Inventaire des risques, une partie par unité ──
  y = newSection("Inventaire des risques");
  y = paragraph(doc, "Pour chaque unité de travail : les risques identifiés, leur cotation, les mesures déjà en place et celles à mettre en œuvre.", y, contentW, 9, MUTED);
  const units = workUnits.length ? workUnits : [{ id: "", name: "Établissement" } as WorkUnit];
  units.forEach((u) => {
    const rows = sorted.filter((a) => !u.id || a.workUnitId === u.id);
    if (!rows.length) return;
    if (y > pageH - 50) {
      doc.addPage();
      y = 30;
    }
    doc.setFillColor(...theme.color);
    doc.rect(MARGIN, y, 1.6, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(u.name, MARGIN + 5, y + 5.2);
    const nameW = doc.getTextWidth(u.name);
    if (u.activity) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(u.activity, MARGIN + 8 + nameW, y + 5.2);
    }
    // Sous-ligne grise (catégorie, source) dessinée sous le nom du risque.
    const subs = rows.map((a) => [a.hazardCategory, a.source ? `Source : ${a.source}` : ""].filter(Boolean).join(" · "));
    const labelLines = new Map<number, number>();
    autoTable(doc, {
      ...tableBase,
      startY: y + 10,
      head: [["Risque", "G", "F", "M", "Score", "Priorité", "Mesures en place", "Mesures à mettre en œuvre"]],
      body: rows.map((a, i) => [
        subs[i] ? `${a.riskLabel}\n${subs[i]}` : a.riskLabel,
        num(a.gravity),
        num(a.frequency),
        num(a.control),
        String(Math.round(a.score)),
        `P${a.priority}`,
        a.existingMeasures || "—",
        a.proposedMeasures || "—",
      ]),
      styles: { ...tableBase.styles, fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 44, fontStyle: "bold" },
        1: { cellWidth: 8, halign: "center" },
        2: { cellWidth: 8, halign: "center" },
        3: { cellWidth: 8, halign: "center" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        6: { cellWidth: (contentW - 95) / 2 },
        7: { cellWidth: (contentW - 95) / 2 },
      },
      didParseCell: (h) => {
        if (h.section === "body" && h.column.index === 5) {
          h.cell.styles.fillColor = PRIORITY_COLORS[rows[h.row.index]?.priority || 4];
          h.cell.styles.textColor = [255, 255, 255];
        }
      },
      willDrawCell: (h) => {
        if (h.section !== "body" || h.column.index !== 0 || !subs[h.row.index]) return;
        const width = h.cell.width - h.cell.padding("horizontal");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        const n = doc.splitTextToSize(rows[h.row.index].riskLabel, width).length;
        labelLines.set(h.row.index, n);
        h.cell.text = h.cell.text.slice(0, n);
      },
      didDrawCell: (h) => {
        if (h.section !== "body" || h.column.index !== 0 || !subs[h.row.index]) return;
        const n = labelLines.get(h.row.index) || 1;
        const width = h.cell.width - h.cell.padding("horizontal");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        const lineH = (7.5 * 1.15) / doc.internal.scaleFactor;
        doc.text(doc.splitTextToSize(subs[h.row.index], width), h.cell.x + h.cell.padding("left"), h.cell.y + h.cell.padding("top") + n * lineH + 2.4);
      },
    });
    y = lastTableY() + 10;
  });
  if (!assessments.length) paragraph(doc, "Aucun risque n'a encore été évalué.", y, contentW, 9, MUTED);

  // ── 7. Plan d'action ──
  y = newSection("Plan d'action");
  y = paragraph(doc, "Actions de prévention retenues, classées par priorité, avec leur responsable et leur échéance.", y, contentW, 9, MUTED);
  const plan = [...actions].sort((a, b) => a.priority - b.priority || (a.dueDate || "9").localeCompare(b.dueDate || "9"));
  if (plan.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y + 1,
      head: [["Priorité", "Action", "Risque concerné", "Responsable", "Échéance", "Statut"]],
      body: plan.map((a) => {
        const linked = a.assessmentId ? assessments.find((x) => x.id === a.assessmentId) : undefined;
        const steps = a.steps?.length ? ` (${a.steps.filter((s) => s.done).length}/${a.steps.length})` : "";
        return [`P${a.priority}`, a.title, linked ? `${linked.riskLabel}\n${unitName(linked.workUnitId)}` : "—", a.owner || "À désigner", formatDate(a.dueDate || a.endDate), `${STATUS_LABELS[a.status] || a.status}${steps}`];
      }),
      columnStyles: { 0: { cellWidth: 15, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 48, fontStyle: "bold" }, 2: { cellWidth: 38 }, 3: { cellWidth: 25 }, 4: { cellWidth: 19, halign: "center" }, 5: { cellWidth: contentW - 145 } },
      didParseCell: (h) => {
        if (h.section !== "body") return;
        const a = plan[h.row.index];
        if (h.column.index === 0) {
          h.cell.styles.fillColor = PRIORITY_COLORS[a.priority];
          h.cell.styles.textColor = [255, 255, 255];
        }
        if (h.column.index === 4 && a.status !== "DONE" && (a.dueDate || a.endDate) && new Date(a.dueDate || a.endDate!) < new Date()) {
          h.cell.styles.textColor = PRIORITY_COLORS[1];
          h.cell.styles.fontStyle = "bold";
        }
        if (h.column.index === 5) {
          h.cell.styles.textColor = STATUS_COLORS[a.status] || MUTED;
          h.cell.styles.fontStyle = "bold";
        }
      },
    });
  } else {
    paragraph(doc, "Aucune action n'est encore planifiée.", y + 2, contentW, 9, MUTED);
  }
  let sectionEnd = plan.length ? lastTableY() : y + 10;

  // ── 7 bis. Programme annuel de prévention (50 salariés et plus) ──
  // Art. L.4121-3-1 : pour chaque mesure, conditions d'exécution, indicateur de
  // résultat et coût estimé ; ressources mobilisables ; calendrier.
  const programmeRequired = (establishment?.headcount ?? 0) >= 50;
  if (programmeRequired) {
    y = newSection("Programme annuel de prévention");
    y = paragraph(
      doc,
      "Établissement d'au moins 50 salariés : programme annuel de prévention des risques professionnels et d'amélioration des conditions de travail (art. L.4121-3-1 du Code du travail), présenté au CSE.",
      y,
      contentW,
      9,
      MUTED
    );
    const programme = plan.filter((a) => a.status !== "DONE");
    const incomplete = programme.filter((a) => !a.how || !a.indicator || a.cost === undefined || a.cost === null || !a.resources).length;
    const total = programme.reduce((sum, a) => sum + (Number.isFinite(Number(a.cost)) ? Number(a.cost) : 0), 0);
    const euros = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ")} €`;
    if (programme.length) {
      autoTable(doc, {
        ...tableBase,
        startY: y + 1,
        head: [["Prio.", "Mesure", "Conditions d'exécution", "Indicateur de résultat", "Coût estimé", "Ressources", "Calendrier"]],
        body: programme.map((a) => [
          `P${a.priority}`,
          a.title,
          a.how || "À préciser",
          a.indicator || "À préciser",
          a.cost === undefined || a.cost === null ? "À chiffrer" : euros(Number(a.cost)),
          a.resources || "À préciser",
          [a.startDate ? `du ${formatDate(a.startDate)}` : "", `au ${formatDate(a.dueDate || a.endDate)}`, a.owner ? `Resp. : ${a.owner}` : ""].filter(Boolean).join("\n"),
        ]),
        styles: { ...tableBase.styles, fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 36, fontStyle: "bold" },
          2: { cellWidth: 32 },
          3: { cellWidth: 28 },
          4: { cellWidth: 17, halign: "right" },
          5: { cellWidth: 25 },
          6: { cellWidth: contentW - 150 },
        },
        didParseCell: (h) => {
          if (h.section !== "body") return;
          const a = programme[h.row.index];
          if (h.column.index === 0) {
            h.cell.styles.fillColor = PRIORITY_COLORS[a.priority];
            h.cell.styles.textColor = [255, 255, 255];
          }
          if (typeof h.cell.raw === "string" && /^À (préciser|chiffrer)$/.test(h.cell.raw)) {
            h.cell.styles.textColor = PRIORITY_COLORS[2];
            h.cell.styles.fontStyle = "italic";
          }
        },
      });
      y = lastTableY() + 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(`Coût total estimé du programme : ${euros(total)} HT`, MARGIN, y);
      y += 6;
      if (incomplete) {
        y = paragraph(doc, `${incomplete} mesure${incomplete > 1 ? "s" : ""} à compléter (conditions d'exécution, indicateur, coût ou ressources).`, y, contentW, 8.5, PRIORITY_COLORS[2]);
      }
      sectionEnd = y;
    } else {
      sectionEnd = paragraph(doc, "Toutes les actions du plan sont terminées : aucune mesure n'est planifiée pour l'année à venir.", y + 2, contentW, 9, MUTED);
    }
  }

  // ── 8. Validation et suivi ──
  y = newSection("Validation et suivi", sectionEnd, 100);
  y = paragraph(doc, "Le présent document a été établi et validé par l'employeur. Le cas échéant, il a été présenté au comité social et économique.", y, contentW, 9, MUTED);
  const boxes = ["L'employeur", "Représentant du CSE", cabinet?.name ? `Pour ${cabinet.name}` : "Personne ayant réalisé l'évaluation"];
  const boxW = (contentW - 8) / 3;
  boxes.forEach((label, i) => {
    const x = MARGIN + i * (boxW + 4);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y + 2, boxW, 44, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(label, boxW - 8), x + 4, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Nom :", x + 4, y + 20);
    doc.text("Date :", x + 4, y + 27);
    doc.text("Signature :", x + 4, y + 34);
  });
  y += 58;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Historique des versions", MARGIN, y);
  if (versions.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y + 3,
      head: [["Date", "Version", "Motif de la mise à jour"]],
      body: versions.slice(0, 20).map((v) => [formatDate(v.createdAt), v.label, v.reason || "—"]),
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 55, fontStyle: "bold" }, 2: { cellWidth: contentW - 80 } },
    });
  } else {
    paragraph(doc, "Aucune version enregistrée : enregistrez une version dans Kaijos pour dater officiellement cette évaluation.", y + 6, contentW, 9, MUTED);
  }

  // ── Sommaire ──
  doc.setPage(tocPage);
  let ty = sectionTitle(doc, theme, 0, "Sommaire", 34) + 4;
  toc.forEach((entry, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...theme.color);
    doc.text(String(i + 1).padStart(2, "0"), MARGIN, ty);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(entry.title, MARGIN + 10, ty);
    doc.text(String(entry.page), pageW - MARGIN, ty, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([0.6, 1.2], 0);
    doc.line(MARGIN + 12 + doc.getTextWidth(entry.title), ty - 0.8, pageW - MARGIN - 8, ty - 0.8);
    doc.setLineDashPattern([], 0);
    ty += 11;
  });

  // ── En-têtes et pieds de page (sauf couverture) ──
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`DUERP — ${estName}`, MARGIN, 13);
    if (theme.name) doc.text(theme.name, pageW - MARGIN, 13, { align: "right" });
    doc.setDrawColor(...theme.color);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, 15.5, pageW - MARGIN, 15.5);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
    doc.text(`${theme.footerBrand} — Édité le ${today}`, MARGIN, pageH - 7);
    doc.text(`Page ${i} / ${total}`, pageW - MARGIN, pageH - 7, { align: "right" });
  }

  doc.save(`DUERP_${estName.replace(/[^\p{L}\p{N}]+/gu, "_")}_${new Date().getFullYear()}.pdf`);
}

// ── FORMAT SIMPLIFIÉ TPE ────────────────────────────────────────────────────
export function printDuerpSimplified(data: PrintData): void {
  const { establishment, workUnits, assessments, actions, branding } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const theme = brandTheme(branding);
  const BLUE = theme.color;

  // En-tête
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(...theme.onColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENT UNIQUE — RÉSUMÉ EXÉCUTIF", pageW / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${establishment?.name || ""}  •  NAF : ${establishment?.codeNaf || "—"}  •  Effectif : ${establishment?.headcount ?? "—"}  •  ${today}`, pageW / 2, 18, { align: "center" });

  let y = 28;
  // Logo de l’entreprise évaluée à gauche, bloc du cabinet à droite (offre Pro).
  const logoW = drawLogo(doc, establishment?.logo, 14, 27, 40, 16);
  let blockEnd = logoW ? 27 + 16 + 4 : 28;
  if (branding && hasCabinetBlock(branding)) {
    const x = logoW ? 14 + logoW + 10 : 14;
    blockEnd = Math.max(blockEnd, drawCabinetBlock(doc, branding, x, 30, pageW - x - 14) + 4);
  }
  y = blockEnd;

  // Risques prioritaires P1 + P2 uniquement
  const criticalRisks = assessments
    .filter((a) => a.priority <= 2)
    .sort((a, b) => a.priority - b.priority || b.score - a.score);

  autoTable(doc, {
    startY: y,
    head: [["Unité", "Risque", "Score", "Prio", "Mesure proposée"]],
    body: criticalRisks.map((a) => [
      workUnits.find((u) => u.id === a.workUnitId)?.name || "—",
      a.riskLabel,
      Math.round(a.score).toString(),
      `P${a.priority}`,
      a.proposedMeasures || "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: BLUE, textColor: theme.onColor, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 50 }, 2: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 14, halign: "center" }, 4: { cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Actions urgentes (LATE ou P1)
  const urgentActions = actions
    .filter((a) => a.status === "LATE" || (a.priority === 1 && a.status !== "DONE"))
    .slice(0, 10);

  if (urgentActions.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 50);
    doc.text("Actions urgentes", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Action", "Responsable", "Échéance", "Statut"]],
      body: urgentActions.map((a) => [
        a.title,
        a.owner || "—",
        a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "—",
        STATUS_LABELS[a.status] || a.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [197, 48, 48] as [number, number, number], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Bloc signature simplifié
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 50);
  doc.text("Signature du dirigeant", 14, y);
  doc.text("Date :", 14, y + 8);
  doc.line(28, y + 8, 80, y + 8);
  doc.rect(14, y + 12, 80, 18);

  // Pied
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(`${theme.footerBrand} — ${today} — Page ${i}/${totalPages}`, pageW / 2, 290, { align: "center" });
  }

  doc.save(`DUERP_simplifie_${(establishment?.name || "tpe").replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`);
}

// ── RAPPORT MULTI-SITES ─────────────────────────────────────────────────────
// Même présentation que le DUERP complet : couverture, sommaire, synthèse
// comparée des sites, puis une partie par site (inventaire et actions en retard).
export function printDuerpMultiSites(data: MultiSiteData): void {
  const { establishments, workUnits, assessments, actions, branding } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const theme = brandTheme(branding);
  const cabinet = branding && hasCabinetBlock(branding) ? branding : null;
  const toc: { title: string; page: number }[] = [];
  const lastTableY = () => (doc as any).lastAutoTable.finalY as number;
  const isLate = (a: ActionItem) => a.status !== "DONE" && Boolean(a.dueDate || a.endDate) && new Date(a.dueDate || a.endDate!) < new Date();
  const tableBase = {
    theme: "plain" as const,
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: 18 },
    styles: { font: "helvetica", fontSize: 8, textColor: INK, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: lighten(theme.color, 0.88), textColor: INK, fontStyle: "bold" as const, fontSize: 7.5, lineWidth: 0 },
  };
  const priorityCell = (p: number) => ({ fillColor: PRIORITY_COLORS[p], textColor: [255, 255, 255] as RGB });

  const sites = establishments.map((e) => {
    const units = workUnits.filter((u) => u.establishmentId === e.id);
    const risks = assessments
      .filter((a) => units.some((u) => u.id === a.workUnitId))
      .sort((a, b) => a.priority - b.priority || b.score - a.score);
    const acts = actions.filter((a) => a.establishmentId === e.id);
    const done = acts.filter((a) => a.status === "DONE").length;
    return {
      e,
      units,
      risks,
      acts,
      p1: risks.filter((a) => a.priority === 1).length,
      p2: risks.filter((a) => a.priority === 2).length,
      late: acts.filter(isLate).length,
      progress: acts.length ? Math.round((done / acts.length) * 100) : null,
      unitName: (id: string) => units.find((u) => u.id === id)?.name || "—",
    };
  });
  const allRisks = sites.flatMap((s) => s.risks.map((r) => ({ r, s })));
  const clients = Array.from(new Set(establishments.map((e) => e.clientName).filter(Boolean)));

  // ── Couverture ──
  doc.setFillColor(...theme.color);
  doc.rect(0, 0, pageW, 8, "F");
  if (cabinet?.logo) drawLogo(doc, cabinet.logo, pageW - MARGIN, 22, 50, 22, "right");
  let y = 92;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...theme.color);
  doc.text("DOCUMENT UNIQUE D'ÉVALUATION DES RISQUES PROFESSIONNELS", MARGIN, y);
  y += 12;
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text("Rapport multi-sites", MARGIN, y);
  y += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...MUTED);
  if (clients.length === 1) {
    doc.text(clients[0]!, MARGIN, y);
    y += 8;
  }
  doc.setFontSize(11);
  doc.text(`${establishments.length} établissements · Édition du ${today}`, MARGIN, y + 2);
  autoTable(doc, {
    ...tableBase,
    startY: y + 14,
    head: [["Établissement", "NAF", "Risques", "P1"]],
    body: sites.map((s) => [s.e.name, s.e.codeNaf || "—", String(s.risks.length), String(s.p1)]),
    styles: { ...tableBase.styles, fontSize: 9 },
    columnStyles: { 0: { cellWidth: contentW - 75, fontStyle: "bold" }, 1: { cellWidth: 30 }, 2: { cellWidth: 25, halign: "center" }, 3: { cellWidth: 20, halign: "center" } },
    alternateRowStyles: { fillColor: SOFT },
  });
  const by = pageH - 58;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, by - 6, pageW - MARGIN, by - 6);
  if (cabinet) {
    drawCabinetBlock(doc, cabinet, MARGIN, by, contentW * 0.62);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Réalisé avec Kaijos", MARGIN, by);
  }
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize("Synthèse des documents uniques des établissements (art. R.4121-1 du Code du travail). Chaque établissement conserve son propre DUERP.", contentW * 0.34), pageW - MARGIN, by, { align: "right" });
  doc.setFillColor(...theme.color);
  doc.rect(0, pageH - 8, pageW, 8, "F");

  // ── Sommaire (rempli à la fin) ──
  doc.addPage();
  const tocPage = doc.getNumberOfPages();
  const newSection = (title: string) => {
    doc.addPage();
    toc.push({ title, page: doc.getNumberOfPages() });
    return sectionTitle(doc, theme, toc.length, title, 34);
  };

  // ── Synthèse tous sites ──
  y = newSection("Synthèse des sites");
  const count = (p: number) => allRisks.filter(({ r }) => r.priority === p).length;
  const cards: [string, string, RGB][] = [
    [String(establishments.length), "établissements", INK],
    [String(allRisks.length), "risques évalués", INK],
    [String(count(1)), "priorité 1 (critique)", PRIORITY_COLORS[1]],
    [String(sites.reduce((n, s) => n + s.late, 0)), "actions en retard", PRIORITY_COLORS[2]],
  ];
  const cardW = (contentW - 9) / 4;
  cards.forEach(([value, label, color], i) => {
    const x = MARGIN + i * (cardW + 3);
    doc.setFillColor(...SOFT);
    doc.roundedRect(x, y, cardW, 24, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...color);
    doc.text(value, x + 5, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 5, y + 19);
  });
  y += 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Comparaison des établissements", MARGIN, y);
  autoTable(doc, {
    ...tableBase,
    startY: y + 3,
    head: [["Établissement", "Unités", "Risques", "P1", "P2", "Actions en retard", "Avancement"]],
    body: sites.map((s) => [s.e.name, String(s.units.length), String(s.risks.length), String(s.p1), String(s.p2), String(s.late), s.progress === null ? "—" : `${s.progress} %`]),
    columnStyles: {
      0: { cellWidth: contentW - 112, fontStyle: "bold" },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 17, halign: "center" },
      3: { cellWidth: 13, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 13, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 27, halign: "center" },
      6: { cellWidth: 27, halign: "center" },
    },
    didParseCell: (h) => {
      if (h.section !== "body") return;
      const s = sites[h.row.index];
      if (h.column.index === 3 && s.p1) h.cell.styles.textColor = PRIORITY_COLORS[1];
      if (h.column.index === 4 && s.p2) h.cell.styles.textColor = PRIORITY_COLORS[2];
      if (h.column.index === 5 && s.late) {
        h.cell.styles.textColor = PRIORITY_COLORS[1];
        h.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = lastTableY() + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Répartition des risques par priorité, tous sites", MARGIN, y);
  y += 5;
  let bx = MARGIN;
  [1, 2, 3, 4].forEach((p) => {
    const w = allRisks.length ? (count(p) / allRisks.length) * contentW : 0;
    if (w > 0) {
      doc.setFillColor(...PRIORITY_COLORS[p]);
      doc.rect(bx, y, w, 6, "F");
      bx += w;
    }
  });
  if (!allRisks.length) {
    doc.setFillColor(...LINE);
    doc.rect(MARGIN, y, contentW, 6, "F");
  }
  y += 11;
  [1, 2, 3, 4].forEach((p, i) => {
    const x = MARGIN + i * (contentW / 4);
    doc.setFillColor(...PRIORITY_COLORS[p]);
    doc.circle(x + 1.5, y - 1.2, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(`P${p} ${PRIORITY_NAMES[p]} : ${count(p)}`, x + 5, y);
  });
  y += 10;
  const top = allRisks.filter(({ r }) => r.priority <= 2).sort((a, b) => a.r.priority - b.r.priority || b.r.score - a.r.score).slice(0, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Risques prioritaires, tous sites", MARGIN, y);
  if (top.length) {
    autoTable(doc, {
      ...tableBase,
      startY: y + 3,
      head: [["Priorité", "Établissement", "Unité", "Risque"]],
      body: top.map(({ r, s }) => [`P${r.priority}`, s.e.name, s.unitName(r.workUnitId), r.riskLabel]),
      columnStyles: { 0: { cellWidth: 16, halign: "center", fontStyle: "bold" }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: contentW - 96, fontStyle: "bold" } },
      didParseCell: (h) => {
        if (h.section === "body" && h.column.index === 0) Object.assign(h.cell.styles, priorityCell(top[h.row.index].r.priority));
      },
    });
  } else {
    paragraph(doc, "Aucun risque de priorité 1 ou 2 n'a été identifié.", y + 6, contentW, 9, MUTED);
  }

  // ── Une partie par établissement ──
  sites.forEach((s) => {
    y = newSection(s.e.name);
    const logoW = drawLogo(doc, s.e.logo, pageW - MARGIN, 24, 36, 14, "right");
    const facts = [
      s.e.clientName && s.e.clientName !== s.e.name ? `Client : ${s.e.clientName}` : "",
      s.e.codeNaf ? `NAF ${s.e.codeNaf}` : "",
      s.e.headcount ? `${s.e.headcount} salariés` : "",
      s.e.address || "",
    ].filter(Boolean).join("  ·  ");
    if (facts) y = paragraph(doc, facts, y - 2, contentW - (logoW ? logoW + 6 : 0), 8.5, MUTED) + 2;
    [
      [String(s.risks.length), "risques"],
      [String(s.p1), "P1"],
      [String(s.p2), "P2"],
      [String(s.late), "actions en retard"],
      [s.progress === null ? "—" : `${s.progress} %`, "avancement"],
    ].forEach(([value, label], i) => {
      const x = MARGIN + i * (contentW / 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...(i === 1 && s.p1 ? PRIORITY_COLORS[1] : i === 3 && s.late ? PRIORITY_COLORS[1] : INK));
      doc.text(value, x, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(label, x, y + 9);
    });
    y += 17;
    if (s.risks.length) {
      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["Unité", "Risque", "Score", "Priorité", "Mesures à mettre en œuvre"]],
        body: s.risks.map((r) => [s.unitName(r.workUnitId), r.riskLabel, String(Math.round(r.score)), `P${r.priority}`, r.proposedMeasures || "—"]),
        styles: { ...tableBase.styles, fontSize: 7.5 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 50, fontStyle: "bold" }, 2: { cellWidth: 13, halign: "center" }, 3: { cellWidth: 15, halign: "center", fontStyle: "bold" }, 4: { cellWidth: contentW - 106 } },
        didParseCell: (h) => {
          if (h.section === "body" && h.column.index === 3) Object.assign(h.cell.styles, priorityCell(s.risks[h.row.index].priority));
        },
      });
      y = lastTableY() + 8;
    } else {
      y = paragraph(doc, "Aucun risque évalué pour cet établissement.", y, contentW, 9, MUTED) + 4;
    }
    const lateActs = s.acts.filter(isLate);
    if (lateActs.length) {
      if (y > pageH - 45) {
        doc.addPage();
        y = 30;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...PRIORITY_COLORS[1]);
      doc.text("Actions en retard", MARGIN, y);
      autoTable(doc, {
        ...tableBase,
        startY: y + 3,
        head: [["Action", "Responsable", "Échéance", "Statut"]],
        body: lateActs.map((a) => [a.title, a.owner || "À désigner", formatDate(a.dueDate || a.endDate), STATUS_LABELS[a.status] || a.status]),
        columnStyles: { 0: { cellWidth: contentW - 85, fontStyle: "bold" }, 1: { cellWidth: 35 }, 2: { cellWidth: 22, halign: "center", textColor: PRIORITY_COLORS[1] }, 3: { cellWidth: 28 } },
      });
    }
  });

  // ── Sommaire ──
  doc.setPage(tocPage);
  let ty = sectionTitle(doc, theme, 0, "Sommaire", 34) + 4;
  toc.forEach((entry, i) => {
    if (ty > pageH - 25) return; // très nombreux sites : le sommaire s'arrête en bas de page
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...theme.color);
    doc.text(String(i + 1).padStart(2, "0"), MARGIN, ty);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const title = doc.splitTextToSize(entry.title, contentW - 30)[0];
    doc.text(title, MARGIN + 10, ty);
    doc.text(String(entry.page), pageW - MARGIN, ty, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([0.6, 1.2], 0);
    doc.line(MARGIN + 12 + doc.getTextWidth(title), ty - 0.8, pageW - MARGIN - 8, ty - 0.8);
    doc.setLineDashPattern([], 0);
    ty += 10;
  });

  // ── En-têtes et pieds de page ──
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("DUERP — Rapport multi-sites", MARGIN, 13);
    if (theme.name) doc.text(theme.name, pageW - MARGIN, 13, { align: "right" });
    doc.setDrawColor(...theme.color);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, 15.5, pageW - MARGIN, 15.5);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
    doc.text(`${theme.footerBrand} — Édité le ${today}`, MARGIN, pageH - 7);
    doc.text(`Page ${i} / ${total}`, pageW - MARGIN, pageH - 7, { align: "right" });
  }

  doc.save(`DUERP_multi_sites_${new Date().getFullYear()}.pdf`);
}
