import {
  SheetConfig,
  StickerSlotDesign,
  UploadedImage,
  computeSlotPositions,
} from "./templates";

export interface RenderStickerOptions {
  /** Show the 2.0" die-cut line */
  showCutLine?: boolean;
  /** Show the outer bleed ring and 1.85" safe-zone dashed ring (for editor view) */
  showEditorGuides?: boolean;
  /** Show slot number badge when empty */
  showEmptyPlaceholder?: boolean;
  /** Whether this slot is currently selected in the sheet preview */
  isSelected?: boolean;
  /** DPI scale factor for computing point sizes in pixels */
  dpi: number;
}

function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  isTop: boolean,
  fontSizePx: number,
  color: string
) {
  if (!text.trim()) return;
  ctx.save();
  ctx.font = `600 ${fontSizePx}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = Array.from(text);
  // Estimate angular span per character
  const charWidths = chars.map((ch) => ctx.measureText(ch).width);
  const trackingPx = fontSizePx * 0.08;
  const totalArcLength =
    charWidths.reduce((acc, w) => acc + w, 0) +
    Math.max(0, chars.length - 1) * trackingPx;
  const totalAngle = totalArcLength / radius;

  if (isTop) {
    let currentAngle = -Math.PI / 2 - totalAngle / 2;
    for (let i = 0; i < chars.length; i++) {
      const halfCharAngle = charWidths[i] / 2 / radius;
      currentAngle += halfCharAngle;
      ctx.save();
      ctx.translate(
        cx + Math.cos(currentAngle) * radius,
        cy + Math.sin(currentAngle) * radius
      );
      ctx.rotate(currentAngle + Math.PI / 2);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      currentAngle += halfCharAngle + trackingPx / radius;
    }
  } else {
    let currentAngle = Math.PI / 2 + totalAngle / 2;
    for (let i = 0; i < chars.length; i++) {
      const halfCharAngle = charWidths[i] / 2 / radius;
      currentAngle -= halfCharAngle;
      ctx.save();
      ctx.translate(
        cx + Math.cos(currentAngle) * radius,
        cy + Math.sin(currentAngle) * radius
      );
      ctx.rotate(currentAngle - Math.PI / 2);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      currentAngle -= halfCharAngle + trackingPx / radius;
    }
  }

  ctx.restore();
}

export function renderSingleSticker(
  ctx: CanvasRenderingContext2D,
  cxPx: number,
  cyPx: number,
  radiusPx: number,
  bleedRadiusPx: number,
  safeRadiusPx: number,
  slot: StickerSlotDesign,
  imagesMap: Map<string, UploadedImage>,
  options: RenderStickerOptions
) {
  const { dpi } = options;
  const diameterPx = radiusPx * 2;

  if (!slot.enabled) {
    if (options.showEmptyPlaceholder) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cxPx, cyPx, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(241, 245, 249, 0.55)";
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(1, dpi / 96);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = `600 ${Math.round(radiusPx * 0.24)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${slot.slotNumber} Skipped`, cxPx, cyPx);
      ctx.restore();
    }
    return;
  }

  const uploadedImg = slot.imageId ? imagesMap.get(slot.imageId) : undefined;
  const hasContent =
    Boolean(uploadedImg?.element) ||
    Boolean(slot.topCurvedText.trim()) ||
    Boolean(slot.bottomCurvedText.trim()) ||
    Boolean(slot.centerText.trim()) ||
    slot.innerRingEnabled;

  // Clip to bleed circle so background & image bleed slightly past the 2" die-cut line
  ctx.save();
  ctx.beginPath();
  ctx.arc(cxPx, cyPx, bleedRadiusPx, 0, Math.PI * 2);
  ctx.clip();

  // Fill background color if content exists or if not showing empty placeholder
  if (hasContent || !options.showEmptyPlaceholder) {
    ctx.fillStyle = slot.backgroundColor || "#ffffff";
    ctx.fillRect(
      cxPx - bleedRadiusPx - 2,
      cyPx - bleedRadiusPx - 2,
      bleedRadiusPx * 2 + 4,
      bleedRadiusPx * 2 + 4
    );
  } else {
    // Subtle pearlescent gradient for empty active slot in preview
    const grad = ctx.createRadialGradient(
      cxPx - radiusPx * 0.3,
      cyPx - radiusPx * 0.3,
      radiusPx * 0.1,
      cxPx,
      cyPx,
      radiusPx
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.65, "#f8fafc");
    grad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = grad;
    ctx.fillRect(
      cxPx - bleedRadiusPx,
      cyPx - bleedRadiusPx,
      bleedRadiusPx * 2,
      bleedRadiusPx * 2
    );
  }

  // Draw uploaded image if present
  if (uploadedImg && uploadedImg.element) {
    const imgEl = uploadedImg.element;
    const imgAspect = uploadedImg.width / uploadedImg.height;

    // At scale = 1.0, cover the 2.0" circle diameter
    let baseW = diameterPx;
    let baseH = diameterPx;
    if (imgAspect >= 1) {
      baseH = diameterPx;
      baseW = diameterPx * imgAspect;
    } else {
      baseW = diameterPx;
      baseH = diameterPx / imgAspect;
    }

    const drawW = baseW * slot.scale;
    const drawH = baseH * slot.scale;
    const panX = slot.offsetX * diameterPx;
    const panY = slot.offsetY * diameterPx;

    ctx.save();
    ctx.translate(cxPx + panX, cyPx + panY);
    if (slot.rotation !== 0) {
      ctx.rotate((slot.rotation * Math.PI) / 180);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else if (options.showEmptyPlaceholder && !hasContent) {
    // Draw slot number watermark (1..12) like the physical sheet guide
    ctx.fillStyle = "rgba(148, 163, 184, 0.38)";
    ctx.font = `italic 700 ${Math.round(radiusPx * 0.85)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(slot.slotNumber), cxPx, cyPx);
  }

  // Optional decorative inner ring
  if (slot.innerRingEnabled) {
    const insetPx = (slot.innerRingInsetIn || 0.1) * dpi;
    const ringRadiusPx = Math.max(4, radiusPx - insetPx);
    const ringWidthPx = ((slot.innerRingWidthPt || 1.5) / 72) * dpi;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cxPx, cyPx, ringRadiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = slot.innerRingColor || "#d4af37";
    ctx.lineWidth = ringWidthPx;
    ctx.stroke();
    ctx.restore();
  }

  // Optional text overlays
  const fontSizePx = ((slot.textSizePt || 11) / 72) * dpi;
  const textRadiusPx = safeRadiusPx - fontSizePx * 0.65;
  if (slot.topCurvedText.trim() && textRadiusPx > 10) {
    drawCurvedText(
      ctx,
      slot.topCurvedText,
      cxPx,
      cyPx,
      textRadiusPx,
      true,
      fontSizePx,
      slot.textColor || "#1e293b"
    );
  }
  if (slot.bottomCurvedText.trim() && textRadiusPx > 10) {
    drawCurvedText(
      ctx,
      slot.bottomCurvedText,
      cxPx,
      cyPx,
      textRadiusPx,
      false,
      fontSizePx,
      slot.textColor || "#1e293b"
    );
  }
  if (slot.centerText.trim()) {
    ctx.save();
    ctx.font = `700 ${fontSizePx * 1.15}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = slot.textColor || "#1e293b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = slot.centerText.split("\n");
    const lineHeight = fontSizePx * 1.35;
    const startY = cyPx - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, cxPx, startY + idx * lineHeight);
    });
    ctx.restore();
  }

  ctx.restore(); // End bleed clip

  // Optional 2.0" die-cut circle line
  if (options.showCutLine) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cxPx, cyPx, radiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = options.showEmptyPlaceholder
      ? "rgba(71, 85, 105, 0.55)"
      : "rgba(100, 116, 139, 0.35)";
    ctx.lineWidth = Math.max(1, (0.5 / 72) * dpi);
    ctx.stroke();
    ctx.restore();
  }

  // Editor-only visual guides (Bleed ring, 2.0" Cut ring, 1.85" Safe zone ring)
  if (options.showEditorGuides) {
    // 1. Bleed boundary (outer dashed rose line)
    if (bleedRadiusPx > radiusPx + 0.5) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cxPx, cyPx, bleedRadiusPx, 0, Math.PI * 2);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Exact 2.0" die-cut circle (solid sky/indigo line)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cxPx, cyPx, radiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(14, 165, 233, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 3. 1.85" safe zone circle (inner dashed emerald line)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cxPx, cyPx, safeRadiusPx, 0, Math.PI * 2);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Selected ring highlight in sheet overview
  if (options.isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cxPx, cyPx, radiusPx + Math.max(3, dpi * 0.04), 0, Math.PI * 2);
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = Math.max(2.5, dpi * 0.035);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderFullSheetCanvas(
  canvas: HTMLCanvasElement,
  config: SheetConfig,
  slots: StickerSlotDesign[],
  imagesMap: Map<string, UploadedImage>,
  options: {
    dpi: number;
    forPdfExport: boolean;
    selectedSlotNumber?: number;
  }
) {
  const { dpi, forPdfExport, selectedSlotNumber } = options;
  const widthPx = Math.round(config.sheetWidthIn * dpi);
  const heightPx = Math.round(config.sheetHeightIn * dpi);

  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  // Pure white sheet background for PDF; subtle pearlescent sheen for interactive preview
  if (forPdfExport) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthPx, heightPx);
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, widthPx, heightPx);
    bgGrad.addColorStop(0, "#f8fafc");
    bgGrad.addColorStop(0.5, "#f1f5f9");
    bgGrad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, widthPx, heightPx);
  }

  const positions = computeSlotPositions(config);

  for (const pos of positions) {
    const slot = slots.find((s) => s.slotNumber === pos.slotNumber);
    if (!slot) continue;

    const cxPx = pos.centerXIn * dpi;
    const cyPx = pos.centerYIn * dpi;
    const radiusPx = pos.radiusIn * dpi;
    const bleedRadiusPx = pos.bleedRadiusIn * dpi;
    const safeRadiusPx = pos.safeRadiusIn * dpi;

    renderSingleSticker(
      ctx,
      cxPx,
      cyPx,
      radiusPx,
      bleedRadiusPx,
      safeRadiusPx,
      slot,
      imagesMap,
      {
        dpi,
        showCutLine: forPdfExport ? config.showCutLineOnPdf : true,
        showEditorGuides: false,
        showEmptyPlaceholder: !forPdfExport,
        isSelected: !forPdfExport && selectedSlotNumber === pos.slotNumber,
      }
    );
  }

  ctx.restore();
}

export async function exportPrintablePdf(
  config: SheetConfig,
  slots: StickerSlotDesign[],
  imagesMap: Map<string, UploadedImage>,
  mode: "stickers" | "calibration-test" = "stickers"
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  // Create exact 8.5" x 11" US Letter PDF in inches with zero margin scaling
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: [config.sheetWidthIn, config.sheetHeightIn],
    compress: true,
  });

  if (mode === "calibration-test") {
    // Vector calibration test sheet for plain paper light-box alignment check
    const positions = computeSlotPositions(config);

    // Header info inside top margin
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    pdf.text(
      `2" ROUND STICKER ALIGNMENT TEST SHEET (8.5" x 11" US Letter - Print at 100% / Actual Size, Borderless OFF)`,
      config.sheetWidthIn / 2,
      0.32,
      { align: "center" }
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(
      `Margins: L=${config.leftMarginIn}" T=${config.topMarginIn}" | Gaps: H=${config.horizontalGapIn}" V=${config.verticalGapIn.toFixed(4)}" | Offset: X=${config.offsetXMm}mm Y=${config.offsetYMm}mm`,
      config.sheetWidthIn / 2,
      0.46,
      { align: "center" }
    );

    for (const pos of positions) {
      // 1. Bleed circle (light gray)
      if (config.bleedIn > 0) {
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.008);
        pdf.circle(pos.centerXIn, pos.centerYIn, pos.bleedRadiusIn, "S");
      }

      // 2. Exact 2.0" die-cut circle (solid dark line)
      pdf.setDrawColor(20, 20, 20);
      pdf.setLineWidth(0.012);
      pdf.circle(pos.centerXIn, pos.centerYIn, pos.radiusIn, "S");

      // 3. 1.85" safe zone circle (gray)
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.006);
      pdf.circle(pos.centerXIn, pos.centerYIn, pos.safeRadiusIn, "S");

      // 4. Center crosshair
      pdf.setDrawColor(120, 120, 120);
      pdf.setLineWidth(0.006);
      pdf.line(
        pos.centerXIn - 0.12,
        pos.centerYIn,
        pos.centerXIn + 0.12,
        pos.centerYIn
      );
      pdf.line(
        pos.centerXIn,
        pos.centerYIn - 0.12,
        pos.centerXIn,
        pos.centerYIn + 0.12
      );

      // 5. Slot number
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`#${pos.slotNumber}`, pos.centerXIn, pos.centerYIn - 0.2, {
        align: "center",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`2.00" Cut Line`, pos.centerXIn, pos.centerYIn + 0.25, {
        align: "center",
      });
    }

    pdf.save("2inch-round-stickers-alignment-test.pdf");
    return;
  }

  // Render full 300/400 DPI sheet canvas and place at exact (0, 0, 8.5", 11.0")
  const exportCanvas = document.createElement("canvas");
  renderFullSheetCanvas(exportCanvas, config, slots, imagesMap, {
    dpi: config.dpi,
    forPdfExport: true,
  });

  const imgData = exportCanvas.toDataURL("image/jpeg", 0.98);
  pdf.addImage(
    imgData,
    "JPEG",
    0,
    0,
    config.sheetWidthIn,
    config.sheetHeightIn,
    undefined,
    "FAST"
  );

  pdf.save("2inch-round-pearlescent-stickers-8.5x11.pdf");
}
