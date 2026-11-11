"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Upload,
  Download,
  Printer,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  Sliders,
  Sparkles,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  FileCheck,
  AlertCircle,
  Type,
  Image as ImageIcon,
  Layers,
  Check,
} from "lucide-react";
import {
  DEFAULT_SHEET_CONFIG,
  SHEET_PRESETS,
  SheetConfig,
  StickerSlotDesign,
  UploadedImage,
  computeSlotPositions,
  createDefaultSlotDesign,
} from "@/lib/templates";
import {
  renderSingleSticker,
  renderFullSheetCanvas,
  exportPrintablePdf,
} from "@/lib/renderer";
import { PrinterGuideModal } from "./PrinterGuideModal";

const SWATCH_COLORS = [
  { name: "Pure White", hex: "#ffffff" },
  { name: "Pearl Cream", hex: "#fdfbf7" },
  { name: "Champagne", hex: "#fef3c7" },
  { name: "Soft Blush", hex: "#ffe4e6" },
  { name: "Mint Sage", hex: "#d1fae5" },
  { name: "Sky Mist", hex: "#e0f2fe" },
  { name: "Lavender", hex: "#ede9fe" },
  { name: "Midnight", hex: "#0f172a" },
];

export function StickerStudio() {
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(DEFAULT_SHEET_CONFIG);
  const [slots, setSlots] = useState<StickerSlotDesign[]>(() =>
    Array.from({ length: 12 }, (_, idx) => createDefaultSlotDesign(idx + 1))
  );
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number>(1);
  const [syncAllSlots, setSyncAllSlots] = useState<boolean>(true);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [showEditorGuides, setShowEditorGuides] = useState<boolean>(true);
  const [activeEditorTab, setActiveEditorTab] = useState<"image" | "text" | "calibration">("image");
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isDraggingOverUpload, setIsDraggingOverUpload] = useState<boolean>(false);
  const [skipFirstCount, setSkipFirstCount] = useState<number>(0);

  // Panning state in circular editor
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; origOffsetX: number; origOffsetY: number }>({
    x: 0,
    y: 0,
    origOffsetX: 0,
    origOffsetY: 0,
  });

  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imagesMap = useMemo(() => {
    const map = new Map<string, UploadedImage>();
    images.forEach((img) => map.set(img.id, img));
    return map;
  }, [images]);

  const currentSlot = useMemo(() => {
    return (
      slots.find((s) => s.slotNumber === selectedSlotNumber) || slots[0]
    );
  }, [slots, selectedSlotNumber]);

  const activeSlotsCount = useMemo(
    () => slots.filter((s) => s.enabled).length,
    [slots]
  );

  // Update helper that respects syncAllSlots (except for `enabled` and `slotNumber`)
  const updateSlotDesign = useCallback(
    (updater: (prev: StickerSlotDesign) => Partial<StickerSlotDesign>) => {
      setSlots((prevSlots) =>
        prevSlots.map((slot) => {
          if (syncAllSlots || slot.slotNumber === selectedSlotNumber) {
            const changes = updater(slot);
            return {
              ...slot,
              ...changes,
              slotNumber: slot.slotNumber,
              enabled:
                changes.enabled !== undefined && slot.slotNumber === selectedSlotNumber
                  ? changes.enabled
                  : slot.enabled,
            };
          }
          return slot;
        })
      );
    },
    [syncAllSlots, selectedSlotNumber]
  );

  // Handle file upload
  const handleFilesSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      Array.from(fileList).forEach((file, index) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) return;
          const imgEl = new window.Image();
          imgEl.onload = () => {
            const newId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const uploaded: UploadedImage = {
              id: newId,
              name: file.name,
              dataUrl,
              width: imgEl.naturalWidth || imgEl.width,
              height: imgEl.naturalHeight || imgEl.height,
              element: imgEl,
            };

            setImages((prev) => [...prev, uploaded]);

            // Assign first uploaded image to current slot (or all slots if syncAllSlots is true)
            if (index === 0) {
              setSlots((prevSlots) =>
                prevSlots.map((slot) => {
                  if (syncAllSlots || slot.slotNumber === selectedSlotNumber || !slot.imageId) {
                    return {
                      ...slot,
                      imageId: newId,
                      scale: 1.0,
                      offsetX: 0,
                      offsetY: 0,
                      rotation: 0,
                    };
                  }
                  return slot;
                })
              );
            }
          };
          imgEl.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    },
    [syncAllSlots, selectedSlotNumber]
  );

  // Generate a crisp built-in sample sticker graphic so users can test right away
  const handleLoadSampleSticker = useCallback(() => {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 800;
    sampleCanvas.height = 800;
    const ctx = sampleCanvas.getContext("2d");
    if (!ctx) return;

    // Rich botanical/artisan badge background
    const grad = ctx.createRadialGradient(400, 400, 40, 400, 400, 420);
    grad.addColorStop(0, "#fffbeb");
    grad.addColorStop(0.65, "#fef3c7");
    grad.addColorStop(1, "#fde68a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Decorative botanical leaves / geometric sunburst
    ctx.save();
    ctx.translate(400, 400);
    ctx.strokeStyle = "rgba(180, 83, 9, 0.18)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      ctx.rotate((Math.PI * 2) / 24);
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(0, 340);
      ctx.stroke();
    }
    ctx.restore();

    // Center emblem illustration (honey jar / artisan crest)
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(400, 400, 115, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(400, 400, 102, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fffbeb";
    ctx.font = "bold 46px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("100%", 400, 382);
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText("ARTISAN", 400, 426);

    const dataUrl = sampleCanvas.toDataURL("image/png");
    const imgEl = new window.Image();
    imgEl.onload = () => {
      const sampleId = `sample-${Date.now()}`;
      const sampleImg: UploadedImage = {
        id: sampleId,
        name: "Artisan-Pearl-Badge.png",
        dataUrl,
        width: 800,
        height: 800,
        element: imgEl,
      };
      setImages((prev) => [...prev, sampleImg]);
      setSlots((prevSlots) =>
        prevSlots.map((slot) => ({
          ...slot,
          imageId: sampleId,
          scale: 1.05,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          backgroundColor: "#fef3c7",
          innerRingEnabled: true,
          innerRingColor: "#b45309",
          innerRingInsetIn: 0.11,
          innerRingWidthPt: 2,
          topCurvedText: "HANDCRAFTED SMALL BATCH",
          bottomCurvedText: "• EST. 2026 •",
          centerText: "",
          textColor: "#78350f",
          textSizePt: 10.5,
        }))
      );
    };
    imgEl.src = dataUrl;
  }, []);

  // Re-render single sticker editor canvas
  useEffect(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 340;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    ctx.clearRect(0, 0, size, size);

    // Checkerboard backdrop outside the sticker
    const tileSize = 14;
    for (let y = 0; y < size; y += tileSize) {
      for (let x = 0; x < size; x += tileSize) {
        ctx.fillStyle =
          (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
            ? "#f1f5f9"
            : "#e2e8f0";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // 2.0" circle occupies 270px diameter in the 340px editor canvas (135px per inch)
    const editorDpi = 135;
    const cx = size / 2;
    const cy = size / 2;
    const radiusPx = (sheetConfig.diameterIn / 2) * editorDpi;
    const bleedRadiusPx =
      (sheetConfig.diameterIn / 2 + Math.max(0, sheetConfig.bleedIn)) * editorDpi;
    const safeRadiusPx = (sheetConfig.safeZoneIn / 2) * editorDpi;

    // Dim area outside the 2.0" cut circle slightly so the cut line stands out
    renderSingleSticker(
      ctx,
      cx,
      cy,
      radiusPx,
      bleedRadiusPx,
      safeRadiusPx,
      currentSlot,
      imagesMap,
      {
        dpi: editorDpi,
        showCutLine: true,
        showEditorGuides,
        showEmptyPlaceholder: true,
      }
    );
  }, [currentSlot, imagesMap, sheetConfig, showEditorGuides]);

  // Re-render full 8.5" x 11" sheet preview canvas
  useEffect(() => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    renderFullSheetCanvas(canvas, sheetConfig, slots, imagesMap, {
      dpi: 72, // 612 x 792 px crisp interactive preview
      forPdfExport: false,
      selectedSlotNumber,
    });
  }, [sheetConfig, slots, imagesMap, selectedSlotNumber]);

  // Editor mouse/touch pan handlers
  const handleEditorPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origOffsetX: currentSlot.offsetX,
      origOffsetY: currentSlot.offsetY,
    };
  };

  const handleEditorPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const diameterPx = 270; // 2.0" * 135 dpi
    const newOffsetX = Number(
      (panStartRef.current.origOffsetX + dx / diameterPx).toFixed(4)
    );
    const newOffsetY = Number(
      (panStartRef.current.origOffsetY + dy / diameterPx).toFixed(4)
    );
    updateSlotDesign(() => ({
      offsetX: Math.max(-1.5, Math.min(1.5, newOffsetX)),
      offsetY: Math.max(-1.5, Math.min(1.5, newOffsetY)),
    }));
  };

  const handleEditorPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsPanning(false);
    }
  };

  const handleEditorWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    const nextScale = Number(
      Math.max(0.15, Math.min(4.0, currentSlot.scale + delta)).toFixed(2)
    );
    updateSlotDesign(() => ({ scale: nextScale }));
  };

  // Click on full sheet preview canvas to select a slot (1..12)
  const handleSheetCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickXIn =
      ((e.clientX - rect.left) / rect.width) * sheetConfig.sheetWidthIn;
    const clickYIn =
      ((e.clientY - rect.top) / rect.height) * sheetConfig.sheetHeightIn;

    const positions = computeSlotPositions(sheetConfig);
    for (const pos of positions) {
      const dist = Math.hypot(
        clickXIn - pos.centerXIn,
        clickYIn - pos.centerYIn
      );
      if (dist <= pos.radiusIn * 1.15) {
        setSelectedSlotNumber(pos.slotNumber);
        break;
      }
    }
  };

  // Handle preset switching
  const handleSelectPreset = (presetId: string) => {
    const preset = SHEET_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSheetConfig((prev) => ({
      ...prev,
      presetId: preset.id,
      sheetWidthIn: preset.sheetWidthIn,
      sheetHeightIn: preset.sheetHeightIn,
      columns: preset.columns,
      rows: preset.rows,
      diameterIn: preset.diameterIn,
      safeZoneIn: preset.safeZoneIn,
      leftMarginIn: preset.leftMarginIn,
      topMarginIn: preset.topMarginIn,
      horizontalGapIn: preset.horizontalGapIn,
      verticalGapIn: preset.verticalGapIn,
    }));
  };

  // Handle skipping first N used stickers on a partially used sheet
  const handleApplySkipCount = (count: number) => {
    const clamped = Math.max(0, Math.min(12, count));
    setSkipFirstCount(clamped);
    setSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        enabled: slot.slotNumber > clamped,
      }))
    );
  };

  // Toggle individual slot enabled state
  const toggleSlotEnabled = (slotNumber: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.slotNumber === slotNumber ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  // Copy current slot design to all 12 slots
  const copyCurrentToAllSlots = () => {
    setSlots((prev) =>
      prev.map((s) => ({
        ...currentSlot,
        slotNumber: s.slotNumber,
        enabled: s.enabled,
      }))
    );
  };

  // Generate PDF
  const handleExportPdf = async (mode: "stickers" | "calibration-test") => {
    try {
      setIsGeneratingPdf(true);
      await exportPrintablePdf(sheetConfig, slots, imagesMap, mode);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Navigation & Action Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  PearlRound 2&quot; Sticker Print Studio
                </h1>
                <span className="hidden md:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  8.5&quot; × 11&quot; • 12-Up Die-Cut
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Precision 2-Inch Round Pearlescent Photo Sticker Sheet Generator (3 Cols × 4 Rows • 20 Sheets / 240 Labels)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100 transition"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Printer Settings Guide
            </button>

            <button
              type="button"
              onClick={() => handleExportPdf("calibration-test")}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
              title="Print a low-ink alignment test grid on plain paper first"
            >
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Alignment Test PDF
            </button>

            <button
              type="button"
              onClick={() => handleExportPdf("stickers")}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf
                ? "Generating 300 DPI PDF..."
                : `Download Printable PDF (${activeSlotsCount}/12)`}
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 cols): Upload + Circular Sticker Cropper + Design Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Image Upload & Library */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Upload Artwork or Logo
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleSticker}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Label
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverUpload(true);
              }}
              onDragLeave={() => setIsDraggingOverUpload(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOverUpload(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
                isDraggingOverUpload
                  ? "border-indigo-500 bg-indigo-50/70"
                  : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-slate-50"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">
                    Click to choose an image or drag &amp; drop here
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports PNG (with transparency), JPG, WebP, SVG • Automatically clips to 2&quot; round labels with full-bleed protection
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded Images Gallery Bar */}
            {images.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>
                    Uploaded Images ({images.length}) — click to assign to{" "}
                    {syncAllSlots ? "all 12 stickers" : `Sticker #${selectedSlotNumber}`}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {images.map((img) => {
                    const isSelectedImg = currentSlot.imageId === img.id;
                    return (
                      <div
                        key={img.id}
                        className={`group relative flex items-center gap-2 rounded-xl border p-1.5 pr-3 cursor-pointer transition shrink-0 ${
                          isSelectedImg
                            ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                        onClick={() =>
                          updateSlotDesign(() => ({
                            imageId: img.id,
                          }))
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100"
                        />
                        <div className="max-w-[120px]">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {img.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {img.width}×{img.height}px
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages((prev) => prev.filter((i) => i.id !== img.id));
                            setSlots((prev) =>
                              prev.map((s) =>
                                s.imageId === img.id ? { ...s, imageId: null } : s
                              )
                            );
                          }}
                          className="ml-1 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Interactive 2" Circle Sticker Designer & Cropper */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    2&quot; Round Label Editor{" "}
                    <span className="text-indigo-600 font-semibold">
                      (Sticker #{selectedSlotNumber})
                    </span>
                  </h2>
                </div>
              </div>

              {/* Sync All vs Single Sticker Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncAllSlots((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                    syncAllSlots
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {syncAllSlots ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Syncing All 12 Stickers
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      Editing Only Sticker #{selectedSlotNumber}
                    </>
                  )}
                </button>

                {!syncAllSlots && (
                  <button
                    type="button"
                    onClick={copyCurrentToAllSlots}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    title="Copy this sticker's design to all 12 slots"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    Apply to All 12
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Interactive Circular Canvas */}
              <div className="md:col-span-6 flex flex-col items-center">
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                  <canvas
                    ref={editorCanvasRef}
                    onPointerDown={handleEditorPointerDown}
                    onPointerMove={handleEditorPointerMove}
                    onPointerUp={handleEditorPointerUp}
                    onPointerCancel={handleEditorPointerUp}
                    onWheel={handleEditorWheel}
                    className="w-[300px] h-[300px] sm:w-[330px] sm:h-[330px] cursor-grab active:cursor-grabbing touch-none block"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditorGuides((v) => !v)}
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-slate-900/75 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-900 transition"
                  >
                    {showEditorGuides ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Hide Guides
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Show Guides
                      </>
                    )}
                  </button>
                </div>

                {/* Legend for the 3 circles */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-500 inline-block" />
                    <strong>2.00&quot; Cut Line</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-b-2 border-dashed border-emerald-500 inline-block" />
                    <strong>1.85&quot; Safe Zone</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-b-2 border-dashed border-rose-500 inline-block" />
                    <strong>Bleed (+{(sheetConfig.bleedIn * 2).toFixed(2)}&quot;)</strong>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 text-center">
                  Drag inside circle to reposition • Scroll wheel or slider to zoom
                </p>
              </div>

              {/* Editor Tabs & Controls */}
              <div className="md:col-span-6 space-y-4">
                {/* Sub-navigation tabs */}
                <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("image")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                      activeEditorTab === "image"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Crop &amp; Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("text")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                      activeEditorTab === "text"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Text &amp; Ring
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("calibration")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                      activeEditorTab === "calibration"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Calibration
                  </button>
                </div>

                {/* TAB 1: IMAGE CROP, ROTATE & BACKGROUND */}
                {activeEditorTab === "image" && (
                  <div className="space-y-4">
                    {/* Zoom / Scale */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <ZoomIn className="w-3.5 h-3.5 text-indigo-600" />
                          Image Zoom / Scale
                        </span>
                        <span className="font-mono text-indigo-600">
                          {Math.round(currentSlot.scale * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign((s) => ({
                              scale: Math.max(0.15, Number((s.scale - 0.1).toFixed(2))),
                            }))
                          }
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min="0.2"
                          max="3.5"
                          step="0.02"
                          value={currentSlot.scale}
                          onChange={(e) =>
                            updateSlotDesign(() => ({
                              scale: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign((s) => ({
                              scale: Math.min(3.5, Number((s.scale + 0.1).toFixed(2))),
                            }))
                          }
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Fit Presets */}
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign(() => ({
                              scale: 1.04, // Covers 2" + bleed
                              offsetX: 0,
                              offsetY: 0,
                            }))
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Maximize2 className="w-3 h-3 text-indigo-600" />
                          Full Bleed Fill
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign(() => ({
                              scale: 0.88, // Fits inside 1.85" safe zone
                              offsetX: 0,
                              offsetY: 0,
                            }))
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Minimize2 className="w-3 h-3 text-emerald-600" />
                          Fit Safe Zone
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign(() => ({
                              offsetX: 0,
                              offsetY: 0,
                              rotation: 0,
                            }))
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Crosshair className="w-3 h-3 text-slate-600" />
                          Center
                        </button>
                      </div>
                    </div>

                    {/* Rotation */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                          Rotation
                        </span>
                        <span className="font-mono text-indigo-600">
                          {currentSlot.rotation}°
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign((s) => ({
                              rotation: ((s.rotation - 90 + 540) % 360) - 180,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          -90°
                        </button>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={currentSlot.rotation}
                          onChange={(e) =>
                            updateSlotDesign(() => ({
                              rotation: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSlotDesign((s) => ({
                              rotation: ((s.rotation + 90 + 540) % 360) - 180,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          +90°
                        </button>
                      </div>
                    </div>

                    {/* Background Fill Color */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span>Circle &amp; Bleed Background Color</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {currentSlot.backgroundColor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={currentSlot.backgroundColor}
                          onChange={(e) =>
                            updateSlotDesign(() => ({
                              backgroundColor: e.target.value,
                            }))
                          }
                          className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                        />
                        {SWATCH_COLORS.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() =>
                              updateSlotDesign(() => ({
                                backgroundColor: swatch.hex,
                              }))
                            }
                            title={swatch.name}
                            style={{ backgroundColor: swatch.hex }}
                            className={`w-6 h-6 rounded-full border transition ${
                              currentSlot.backgroundColor.toLowerCase() ===
                              swatch.hex.toLowerCase()
                                ? "ring-2 ring-indigo-600 ring-offset-1 border-indigo-600"
                                : "border-slate-300 hover:scale-105"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CURVED / CENTER TEXT & BORDER RING */}
                {activeEditorTab === "text" && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Top Curved Label Text (Inside 1.85&quot; Safe Zone)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ORGANIC SPICE COLLECTION"
                        value={currentSlot.topCurvedText}
                        onChange={(e) =>
                          updateSlotDesign(() => ({
                            topCurvedText: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bottom Curved Label Text
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HANDCRAFTED • NET WT 4 OZ"
                        value={currentSlot.bottomCurvedText}
                        onChange={(e) =>
                          updateSlotDesign(() => ({
                            bottomCurvedText: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Center Text (Optional Multi-Line)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Smoked Paprika"
                        value={currentSlot.centerText}
                        onChange={(e) =>
                          updateSlotDesign(() => ({
                            centerText: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Text Size ({currentSlot.textSizePt} pt)
                        </label>
                        <input
                          type="range"
                          min="7"
                          max="22"
                          step="0.5"
                          value={currentSlot.textSizePt}
                          onChange={(e) =>
                            updateSlotDesign(() => ({
                              textSizePt: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentSlot.textColor}
                            onChange={(e) =>
                              updateSlotDesign(() => ({
                                textColor: e.target.value,
                              }))
                            }
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-600">
                            {currentSlot.textColor}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative Inner Ring */}
                    <div className="pt-2 border-t border-slate-200">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold text-slate-700">
                          Decorative Inner Safe-Zone Border Ring
                        </span>
                        <input
                          type="checkbox"
                          checked={currentSlot.innerRingEnabled}
                          onChange={(e) =>
                            updateSlotDesign(() => ({
                              innerRingEnabled: e.target.checked,
                            }))
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                      {currentSlot.innerRingEnabled && (
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            type="color"
                            value={currentSlot.innerRingColor}
                            onChange={(e) =>
                              updateSlotDesign(() => ({
                                innerRingColor: e.target.value,
                              }))
                            }
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="block text-[11px] text-slate-500">
                              Ring Inset ({currentSlot.innerRingInsetIn.toFixed(2)}&quot;)
                            </span>
                            <input
                              type="range"
                              min="0.06"
                              max="0.25"
                              step="0.01"
                              value={currentSlot.innerRingInsetIn}
                              onChange={(e) =>
                                updateSlotDesign(() => ({
                                  innerRingInsetIn: parseFloat(e.target.value),
                                }))
                              }
                              className="w-full accent-indigo-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: SHEET TEMPLATE & PRINTER CALIBRATION */}
                {activeEditorTab === "calibration" && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sheet Layout Preset
                      </label>
                      <select
                        value={sheetConfig.presetId}
                        onChange={(e) => handleSelectPreset(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        {SHEET_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bleed Overprint */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                        <span>Full-Bleed Overprint Radius</span>
                        <span className="font-mono text-indigo-600">
                          +{sheetConfig.bleedIn.toFixed(3)}&quot; (
                          {(sheetConfig.bleedIn * 25.4).toFixed(1)} mm)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-1">
                        Extends artwork past the 2.0&quot; cut edge so minor printer shifts never leave white edges.
                      </p>
                      <input
                        type="range"
                        min="0"
                        max="0.10"
                        step="0.005"
                        value={sheetConfig.bleedIn}
                        onChange={(e) =>
                          setSheetConfig((prev) => ({
                            ...prev,
                            bleedIn: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    {/* Printer X / Y Micro-Offset (mm) */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Horizontal Shift (X)</span>
                          <span className="font-mono text-indigo-600">
                            {sheetConfig.offsetXMm > 0 ? "+" : ""}
                            {sheetConfig.offsetXMm.toFixed(1)} mm
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.25"
                          value={sheetConfig.offsetXMm}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              offsetXMm: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Vertical Shift (Y)</span>
                          <span className="font-mono text-indigo-600">
                            {sheetConfig.offsetYMm > 0 ? "+" : ""}
                            {sheetConfig.offsetYMm.toFixed(1)} mm
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.25"
                          value={sheetConfig.offsetYMm}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              offsetYMm: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>
                    </div>

                    {/* Custom Margin & Gap Inputs */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Left Margin (in)
                        </label>
                        <input
                          type="number"
                          step="0.005"
                          value={sheetConfig.leftMarginIn}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              presetId: "custom",
                              leftMarginIn: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Top Margin (in)
                        </label>
                        <input
                          type="number"
                          step="0.005"
                          value={sheetConfig.topMarginIn}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              presetId: "custom",
                              topMarginIn: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Horiz Gap (in)
                        </label>
                        <input
                          type="number"
                          step="0.005"
                          value={sheetConfig.horizontalGapIn}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              presetId: "custom",
                              horizontalGapIn: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Vert Gap (in)
                        </label>
                        <input
                          type="number"
                          step="0.005"
                          value={Number(sheetConfig.verticalGapIn.toFixed(4))}
                          onChange={(e) =>
                            setSheetConfig((prev) => ({
                              ...prev,
                              presetId: "custom",
                              verticalGapIn: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Cut Line on PDF Toggle */}
                    <label className="flex items-center justify-between pt-2 border-t border-slate-100 cursor-pointer">
                      <span className="text-xs font-medium text-slate-700">
                        Draw faint 2.0&quot; cut ring on exported PDF
                      </span>
                      <input
                        type="checkbox"
                        checked={sheetConfig.showCutLineOnPdf}
                        onChange={(e) =>
                          setSheetConfig((prev) => ({
                            ...prev,
                            showCutLineOnPdf: e.target.checked,
                          }))
                        }
                        className="rounded text-indigo-600"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Step 3: Critical Printer Settings Banner (Directly matching uploaded instructions) */}
          <section className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-300" />
                <h3 className="text-sm sm:text-base font-bold">
                  Mandatory Printer Settings to Prevent Misalignment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-semibold text-emerald-100 transition"
              >
                View Full Visual Guide
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="font-bold text-rose-300 uppercase tracking-wide">
                  1. DO NOT Select Borderless
                </p>
                <p className="mt-1 text-emerald-100 leading-relaxed">
                  Uncheck <strong>Borderless</strong> in your printer dialog. Borderless mode expands the print and misaligns the 2&quot; circles.
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="font-bold text-amber-300 uppercase tracking-wide">
                  2. Size: Letter 8.5 × 11 in
                </p>
                <p className="mt-1 text-emerald-100 leading-relaxed">
                  Set Output Paper to <strong>Same as Document Size</strong>. Uncheck{" "}
                  <strong>Reduce/Enlarge Document</strong> (Print at{" "}
                  <strong>100% / Actual Size</strong>).
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="font-bold text-emerald-300 uppercase tracking-wide">
                  3. Pearl Glossy Media
                </p>
                <p className="mt-1 text-emerald-100 leading-relaxed">
                  Select <strong>Glossy Photo Paper</strong> or <strong>Labels</strong>. Compatible with DYE Inkjet &amp; thick-paper Laser printers.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): Live 8.5" x 11" Sheet Preview & Partial Sheet Slot Selector */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live 8.5&quot; × 11&quot; Sticker Sheet Preview
                </h2>
                <p className="text-xs text-slate-500">
                  12 Round Labels (2&quot; Diameter) • Click any circle to select
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {activeSlotsCount} of 12 Active
              </span>
            </div>

            {/* Interactive Sheet Container with 8.5" x 11" Dimension Callouts */}
            <div className="flex flex-col items-center bg-slate-100/90 rounded-2xl p-4 border border-slate-200">
              <div className="relative flex items-center">
                {/* Vertical 11" Dimension Callout */}
                <div className="hidden sm:flex flex-col items-center mr-3 h-[380px] justify-between text-[11px] font-bold text-slate-600 select-none">
                  <div className="w-3 border-t-2 border-slate-500" />
                  <div className="w-0.5 flex-1 bg-slate-400" />
                  <span className="py-1 -rotate-90 whitespace-nowrap tracking-wider">
                    11&quot;
                  </span>
                  <div className="w-0.5 flex-1 bg-slate-400" />
                  <div className="w-3 border-b-2 border-slate-500" />
                </div>

                {/* Sheet Canvas */}
                <div className="relative rounded-lg overflow-hidden shadow-lg border border-slate-300 bg-white">
                  <canvas
                    ref={sheetCanvasRef}
                    onClick={handleSheetCanvasClick}
                    className="w-[290px] sm:w-[320px] aspect-[8.5/11] cursor-pointer block"
                  />
                </div>
              </div>

              {/* Horizontal 8.5" Dimension Callout */}
              <div className="mt-2.5 flex items-center w-[290px] sm:w-[320px] sm:ml-6 justify-between text-[11px] font-bold text-slate-600 select-none">
                <div className="h-3 border-l-2 border-slate-500" />
                <div className="h-0.5 flex-1 bg-slate-400" />
                <span className="px-2">8.5&quot; (3 × 4 Grid • 2&quot; Circles)</span>
                <div className="h-0.5 flex-1 bg-slate-400" />
                <div className="h-3 border-r-2 border-slate-500" />
              </div>
            </div>

            {/* Partial Sheet Printing / Slot Toggle Grid (1..12) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Partial Sheet Saver (Toggle Stickers 1–12)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Already peeled some stickers from a sheet? Disable used slots to print only on remaining labels.
                  </p>
                </div>
              </div>

              {/* Quick Skip Slider */}
              <div className="mb-3 flex items-center gap-3 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                  Skip first <strong>{skipFirstCount}</strong> used labels:
                </span>
                <input
                  type="range"
                  min="0"
                  max="11"
                  step="1"
                  value={skipFirstCount}
                  onChange={(e) =>
                    handleApplySkipCount(parseInt(e.target.value, 10))
                  }
                  className="w-full accent-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => handleApplySkipCount(0)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                >
                  Enable All
                </button>
              </div>

              {/* 3x4 Mini Slot Selector Grid */}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isSelected = slot.slotNumber === selectedSlotNumber;
                  return (
                    <div
                      key={slot.slotNumber}
                      onClick={() => setSelectedSlotNumber(slot.slotNumber)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : slot.enabled
                          ? "border-slate-200 bg-white hover:border-slate-300"
                          : "border-slate-200 bg-slate-100/70 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {slot.slotNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-800">
                          {slot.enabled ? "Print" : "Skip"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSlotEnabled(slot.slotNumber);
                        }}
                        className="text-slate-500 hover:text-indigo-600"
                        title={
                          slot.enabled
                            ? `Disable Sticker #${slot.slotNumber}`
                            : `Enable Sticker #${slot.slotNumber}`
                        }
                      >
                        {slot.enabled ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Primary Export Action */}
            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleExportPdf("stickers")}
                disabled={isGeneratingPdf}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isGeneratingPdf
                  ? "Rendering High-DPI Sheet PDF..."
                  : `Download Printable 8.5" × 11" PDF (${activeSlotsCount} Stickers)`}
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf("calibration-test")}
                disabled={isGeneratingPdf}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                Download Plain-Paper Alignment Test PDF (Low Ink)
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Printer Guide Modal */}
      <PrinterGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onDownloadCalibrationPdf={() => handleExportPdf("calibration-test")}
        onDownloadStickerPdf={() => handleExportPdf("stickers")}
      />
    </div>
  );
}
