export interface SheetPreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  sheetWidthIn: number;
  sheetHeightIn: number;
  columns: number;
  rows: number;
  diameterIn: number;
  safeZoneIn: number;
  leftMarginIn: number;
  topMarginIn: number;
  horizontalGapIn: number;
  verticalGapIn: number;
}

export interface SheetConfig {
  presetId: string;
  sheetWidthIn: number;
  sheetHeightIn: number;
  columns: number;
  rows: number;
  diameterIn: number;
  safeZoneIn: number;
  leftMarginIn: number;
  topMarginIn: number;
  horizontalGapIn: number;
  verticalGapIn: number;
  /** Extra radius (in inches) printed outside the 2.0" die-cut circle to prevent white edges on slight printer shifts */
  bleedIn: number;
  /** Fine horizontal printer shift compensation in millimeters (+ moves right, - moves left) */
  offsetXMm: number;
  /** Fine vertical printer shift compensation in millimeters (+ moves down, - moves up) */
  offsetYMm: number;
  /** Whether to draw a faint 2.0" cut circle on the exported PDF (useful for plain-paper test prints; disable for final pearl sticker print) */
  showCutLineOnPdf: boolean;
  /** Export resolution in DPI (300 is standard photo print quality) */
  dpi: 300 | 400;
}

export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  element?: HTMLImageElement;
}

export interface StickerSlotDesign {
  slotNumber: number; // 1 to 12
  enabled: boolean; // Whether to print this sticker on the sheet
  imageId: string | null;
  /** Scale multiplier where 1.0 = image covers the 2" circle ("cover" fit) */
  scale: number;
  /** Horizontal pan offset as a fraction of the 2" circle diameter (-1 to +1) */
  offsetX: number;
  /** Vertical pan offset as a fraction of the 2" circle diameter (-1 to +1) */
  offsetY: number;
  /** Rotation in degrees (-180 to 180) */
  rotation: number;
  /** Background fill color inside the circle/bleed area */
  backgroundColor: string;
  /** Optional decorative inner border ring inside the safe zone */
  innerRingEnabled: boolean;
  innerRingColor: string;
  innerRingInsetIn: number;
  innerRingWidthPt: number;
  /** Optional curved / center text overlay for labels */
  topCurvedText: string;
  bottomCurvedText: string;
  centerText: string;
  textColor: string;
  textSizePt: number;
}

export const SHEET_PRESETS: SheetPreset[] = [
  {
    id: "pearl-12up-standard",
    name: "2\" Round Pearlescent — Standard 12-Up (Default)",
    subtitle: "8.5\" × 11\" Sheet • 3 Cols × 4 Rows (12 Labels) • Avery 22807 / Koala 2R Layout",
    description:
      "Standard 12-per-sheet 2\" diameter die-cut round label layout (0.625\" margins, 0.625\" horizontal gap, 0.5833\" vertical gap).",
    sheetWidthIn: 8.5,
    sheetHeightIn: 11.0,
    columns: 3,
    rows: 4,
    diameterIn: 2.0,
    safeZoneIn: 1.85,
    leftMarginIn: 0.625,
    topMarginIn: 0.625,
    horizontalGapIn: 0.625,
    verticalGapIn: 0.5833, // (11 - 4*2 - 2*0.625) / 3 = 1.75 / 3 = 0.58333"
  },
  {
    id: "pearl-12up-equal",
    name: "2\" Round Pearlescent — Equal Vertical Spacing (0.60\")",
    subtitle: "8.5\" × 11\" Sheet • 3 Cols × 4 Rows • 0.625\" Horiz / 0.60\" Vert Spacing",
    description:
      "Divides both horizontal (0.625\") and vertical (0.60\") spaces evenly between page edges and rows.",
    sheetWidthIn: 8.5,
    sheetHeightIn: 11.0,
    columns: 3,
    rows: 4,
    diameterIn: 2.0,
    safeZoneIn: 1.85,
    leftMarginIn: 0.625,
    topMarginIn: 0.6,
    horizontalGapIn: 0.625,
    verticalGapIn: 0.6,
  },
  {
    id: "avery-22807-word",
    name: "Avery 22807 / 22822 (0.75\" Top Margin Variant)",
    subtitle: "8.5\" × 11\" Sheet • 0.75\" Top/Bottom Margin • 0.50\" Vertical Gap",
    description:
      "Alternative 12-up 2\" round template used by some Word templates with 0.75\" top/bottom margins and 0.50\" row gaps.",
    sheetWidthIn: 8.5,
    sheetHeightIn: 11.0,
    columns: 3,
    rows: 4,
    diameterIn: 2.0,
    safeZoneIn: 1.85,
    leftMarginIn: 0.6875,
    topMarginIn: 0.75,
    horizontalGapIn: 0.5625,
    verticalGapIn: 0.5,
  },
  {
    id: "custom",
    name: "Custom Sheet Calibration",
    subtitle: "Manually configure margins and gaps in inches",
    description: "Customize every margin and gap measurement to match any sheet layout.",
    sheetWidthIn: 8.5,
    sheetHeightIn: 11.0,
    columns: 3,
    rows: 4,
    diameterIn: 2.0,
    safeZoneIn: 1.85,
    leftMarginIn: 0.625,
    topMarginIn: 0.625,
    horizontalGapIn: 0.625,
    verticalGapIn: 0.5833,
  },
];

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  ...SHEET_PRESETS[0],
  presetId: SHEET_PRESETS[0].id,
  bleedIn: 0.04, // ~1mm bleed overprint past the 2" die-cut circle to prevent white edges
  offsetXMm: 0,
  offsetYMm: 0,
  showCutLineOnPdf: false,
  dpi: 300,
};

export function createDefaultSlotDesign(slotNumber: number): StickerSlotDesign {
  return {
    slotNumber,
    enabled: true,
    imageId: null,
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    backgroundColor: "#ffffff",
    innerRingEnabled: false,
    innerRingColor: "#d4af37",
    innerRingInsetIn: 0.1,
    innerRingWidthPt: 1.5,
    topCurvedText: "",
    bottomCurvedText: "",
    centerText: "",
    textColor: "#1e293b",
    textSizePt: 11,
  };
}

export interface SlotPositionIn {
  slotNumber: number; // 1..12
  row: number; // 0..3
  col: number; // 0..2
  centerXIn: number;
  centerYIn: number;
  radiusIn: number;
  bleedRadiusIn: number;
  safeRadiusIn: number;
}

export function computeSlotPositions(config: SheetConfig): SlotPositionIn[] {
  const positions: SlotPositionIn[] = [];
  const radiusIn = config.diameterIn / 2;
  const bleedRadiusIn = radiusIn + Math.max(0, config.bleedIn);
  const safeRadiusIn = config.safeZoneIn / 2;

  const offsetXIn = config.offsetXMm / 25.4;
  const offsetYIn = config.offsetYMm / 25.4;

  let slotNumber = 1;
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.columns; col++) {
      const leftIn =
        config.leftMarginIn +
        col * (config.diameterIn + config.horizontalGapIn) +
        offsetXIn;
      const topIn =
        config.topMarginIn +
        row * (config.diameterIn + config.verticalGapIn) +
        offsetYIn;

      positions.push({
        slotNumber,
        row,
        col,
        centerXIn: leftIn + radiusIn,
        centerYIn: topIn + radiusIn,
        radiusIn,
        bleedRadiusIn,
        safeRadiusIn,
      });
      slotNumber++;
    }
  }
  return positions;
}
