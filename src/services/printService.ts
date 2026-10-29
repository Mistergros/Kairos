import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Assessment, ActionItem, WorkUnit, Establishment, Branding } from "../types";

interface PrintData {
  establishment?: Establishment;
  workUnits: WorkUnit[];
  assessments: Assessment[];
  actions: ActionItem[];
  branding?: Branding;
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

export function printDuerpDocument(data: PrintData): void {
  const { establishment, workUnits, assessments, actions, branding } = data;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const theme = brandTheme(branding);
  const BLUE = theme.color;
  const DARK: [number, number, number] = [30, 30, 50];

  // ── PAGE DE GARDE ──────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(...theme.onColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENT UNIQUE D'ÉVALUATION DES RISQUES PROFESSIONNELS", pageW / 2, 12, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Établi selon l'art. R.4121-1 du Code du travail", pageW / 2, 20, { align: "center" });

  doc.setTextColor(...DARK);
  let y = 38;

  // Info établissement
  const estabData = [
    ["Établissement", establishment?.name || "—"],
    ["SIRET", establishment?.siret || "—"],
    ["Code NAF", establishment?.codeNaf || "—"],
    ["Effectif", establishment?.headcount ? `${establishment.headcount} salariés` : "—"],
    ["Date d'édition", today],
  ];
  autoTable(doc, {
    startY: y,
    head: [["Informations", "Valeur"]],
    body: estabData,
    theme: "grid",
    headStyles: { fillColor: BLUE, textColor: theme.onColor, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { cellWidth: 100 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Bloc « Réalisé par » à droite du tableau d'identification.
  if (branding && hasCabinetBlock(branding)) {
    drawCabinetBlock(doc, branding, 185, 42, pageW - 185 - 14);
  }

  // KPIs
  const p1 = assessments.filter((a) => a.priority === 1).length;
  const p2 = assessments.filter((a) => a.priority === 2).length;
  const p3 = assessments.filter((a) => a.priority === 3).length;
  const p4 = assessments.filter((a) => a.priority === 4).length;
  const done = actions.filter((a) => a.status === "DONE").length;

  const kpiData = [
    [`P1 : ${p1}`, `P2 : ${p2}`, `P3 : ${p3}`, `P4 : ${p4}`, `Actions terminées : ${done} / ${actions.length}`],
  ];
  autoTable(doc, {
    startY: y,
    body: kpiData,
    theme: "plain",
    bodyStyles: { fontSize: 10, fontStyle: "bold", halign: "center" },
    margin: { left: 14, right: 14 },
  });

  // ── PAGE INVENTAIRE DES RISQUES ─────────────────────────────────────────────
  doc.addPage();
  drawPageBand(doc, theme, "INVENTAIRE DES RISQUES");
  doc.setTextColor(...DARK);

  const riskRows = assessments.map((a) => {
    const unit = workUnits.find((u) => u.id === a.workUnitId);
    const [r, g, b] = PRIORITY_COLORS[a.priority] || [100, 100, 100];
    return {
      row: [
        unit?.name || "—",
        a.hazardCategory || "—",
        a.riskLabel,
        String(a.gravity),
        String(a.frequency),
        String(a.control),
        String(Math.round(a.score)),
        priorityLabel(a.priority),
        a.existingMeasures || "—",
        a.proposedMeasures || "—",
      ],
      priority: a.priority,
      color: [r, g, b] as [number, number, number],
    };
  });

  autoTable(doc, {
    startY: 18,
    head: [["Unité", "Catégorie", "Risque", "G", "F", "M", "Score", "Priorité", "Mesures existantes", "Mesures proposées"]],
    body: riskRows.map((r) => r.row),
    theme: "striped",
    headStyles: { fillColor: BLUE, textColor: theme.onColor, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 28 },
      2: { cellWidth: 38 },
      3: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 22, halign: "center" },
      8: { cellWidth: 35 },
      9: { cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 7) {
        const rowIdx = hookData.row.index;
        const color = riskRows[rowIdx]?.color;
        if (color) {
          hookData.cell.styles.textColor = color;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ── PAGE PLAN D'ACTION ──────────────────────────────────────────────────────
  doc.addPage();
  drawPageBand(doc, theme, "PLAN D'ACTION");
  doc.setTextColor(...DARK);

  const actionRows = actions.map((a) => {
    const linked = a.assessmentId ? assessments.find((as) => as.id === a.assessmentId) : undefined;
    const [r, g, b] = STATUS_COLORS[a.status] || [100, 100, 100];
    return {
      row: [
        a.title,
        linked?.riskLabel || "—",
        a.owner || "—",
        a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "—",
        STATUS_LABELS[a.status] || a.status,
        priorityLabel(a.priority),
      ],
      color: [r, g, b] as [number, number, number],
    };
  });

  autoTable(doc, {
    startY: 18,
    head: [["Action", "Risque lié", "Responsable", "Échéance", "Statut", "Priorité"]],
    body: actionRows.map((r) => r.row),
    theme: "striped",
    headStyles: { fillColor: BLUE, textColor: theme.onColor, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 24, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 4) {
        const rowIdx = hookData.row.index;
        const color = actionRows[rowIdx]?.color;
        if (color) {
          hookData.cell.styles.textColor = color;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ── BLOC SIGNATURE ─────────────────────────────────────────────────────────
  const sigY = (doc as any).lastAutoTable.finalY + 14;
  const pageCount = (doc.internal as any).getNumberOfPages();
  const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;

  // Si pas assez de place pour les signatures, nouvelle page
  const needNewPage = sigY + 50 > pageH - 10;
  if (needNewPage) doc.addPage();

  const sigYFinal = needNewPage ? 20 : sigY;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);

  const sigBoxes = [
    { label: "Le Responsable HSE", x: 14 },
    { label: "Le Dirigeant", x: pageW / 2 - 45 },
    { label: "Représentant du personnel (CSE)", x: pageW - 100 },
  ];

  sigBoxes.forEach(({ label, x }) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, sigYFinal);
    doc.setFont("helvetica", "normal");
    doc.text("Nom, prénom :", x, sigYFinal + 7);
    doc.line(x + 30, sigYFinal + 7, x + 80, sigYFinal + 7);
    doc.text("Date :", x, sigYFinal + 15);
    doc.line(x + 14, sigYFinal + 15, x + 80, sigYFinal + 15);
    doc.text("Signature :", x, sigYFinal + 23);
    doc.rect(x, sigYFinal + 26, 80, 18);
  });

  // Pied de page sur toutes les pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${theme.footerBrand} — ${establishment?.name || ""} — Édité le ${today} — Page ${i} / ${totalPages}`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  doc.save(`DUERP_${(establishment?.name || "export").replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`);
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
  if (branding && hasCabinetBlock(branding)) {
    y = drawCabinetBlock(doc, branding, 14, 30, pageW - 28) + 4;
  }

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
export function printDuerpMultiSites(data: MultiSiteData): void {
  const { establishments, workUnits, assessments, actions, branding } = data;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const theme = brandTheme(branding);
  const BLUE = theme.color;

  // Page de garde
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(...theme.onColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RAPPORT DUERP MULTI-SITES", pageW / 2, 12, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${establishments.length} établissements  •  Édité le ${today}`, pageW / 2, 21, { align: "center" });

  // Synthèse par établissement
  const synthRows = establishments.map((e) => {
    const units = workUnits.filter((u) => u.establishmentId === e.id);
    const estabAssessments = assessments.filter((a) => units.some((u) => u.id === a.workUnitId));
    const estabActions = actions.filter((a) => a.establishmentId === e.id);
    const p1 = estabAssessments.filter((a) => a.priority === 1).length;
    const late = estabActions.filter((a) => a.status === "LATE").length;
    const done = estabActions.filter((a) => a.status === "DONE").length;
    const progress = estabActions.length ? `${Math.round((done / estabActions.length) * 100)}%` : "—";
    return [e.name, e.codeNaf || "—", String(units.length), String(estabAssessments.length), String(p1), String(late), progress];
  });

  const synthStart = branding && hasCabinetBlock(branding) ? drawCabinetBlock(doc, branding, 14, 36, pageW - 28) + 4 : 34;
  autoTable(doc, {
    startY: synthStart,
    head: [["Établissement", "NAF", "Unités", "Risques", "P1", "Actions retard", "Avancement"]],
    body: synthRows,
    theme: "striped",
    headStyles: { fillColor: BLUE, textColor: theme.onColor, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Une section par établissement
  establishments.forEach((e) => {
    doc.addPage();
    drawPageBand(doc, theme, `${e.name}  —  NAF ${e.codeNaf || "—"}  —  Effectif : ${e.headcount ?? "—"}`, 16);

    const units = workUnits.filter((u) => u.establishmentId === e.id);
    const estabAssessments = assessments.filter((a) => units.some((u) => u.id === a.workUnitId));
    const estabActions = actions.filter((a) => a.establishmentId === e.id);

    autoTable(doc, {
      startY: 20,
      head: [["Unité", "Risque", "G", "F", "M", "Score", "Prio", "Mesure proposée"]],
      body: estabAssessments.map((a) => [
        units.find((u) => u.id === a.workUnitId)?.name || "—",
        a.riskLabel,
        String(a.gravity), String(a.frequency), String(a.control),
        Math.round(a.score).toString(),
        `P${a.priority}`,
        a.proposedMeasures || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BLUE, textColor: theme.onColor, fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
  });

  // Pied de page
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${theme.footerBrand} — Rapport multi-sites — ${today} — Page ${i}/${totalPages}`, pageW / 2, (doc.internal.pageSize.getHeight()) - 5, { align: "center" });
  }

  doc.save(`DUERP_multi_sites_${new Date().getFullYear()}.pdf`);
}
