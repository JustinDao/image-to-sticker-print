"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  FileCheck,
  Sparkles,
  X,
} from "lucide-react";

interface PrinterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadCalibrationPdf: () => void;
  onDownloadStickerPdf: () => void;
}

export function PrinterGuideModal({
  isOpen,
  onClose,
  onDownloadCalibrationPdf,
  onDownloadStickerPdf,
}: PrinterGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-6 h-6 text-emerald-200 shrink-0" />
            <div>
              <h2 className="text-lg font-bold">
                How to Prevent Print Misalignment on 2&quot; Round Labels
              </h2>
              <p className="text-xs text-emerald-100">
                Required printer settings for 8.5&quot; × 11&quot; Pearlescent Round Label Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Rule 1: DO NOT SELECT BORDERLESS */}
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50/60 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-rose-900 text-base">
                  1. DO NOT SELECT &ldquo;Borderless&rdquo; Printing
                </h3>
                <p className="text-sm text-rose-800 mt-1">
                  When <strong>Borderless</strong> is checked, printer drivers automatically stretch and zoom the page by 3–5%, pushing the 2&quot; circles off the die-cut sticker rings.
                </p>
                {/* Simulated Printer Dialog Snippet */}
                <div className="mt-3 rounded-lg bg-white border border-slate-300 p-3 text-xs font-mono text-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Document Size:</span>{" "}
                    <strong className="text-slate-900">Letter 8 1/2 x 11 in</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Orientation:</span>{" "}
                    <strong className="text-slate-900">Portrait</strong>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 bg-rose-100/80 border border-rose-400 rounded px-2.5 py-1.5 text-rose-900 font-semibold">
                    <span className="inline-block w-3.5 h-3.5 border border-slate-500 bg-white rounded-sm" />
                    <span>Borderless — LEAVE UNCHECKED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 2: Document Size & Scaling */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-950 text-base">
                  2. Document Size: 8.5 × 11 in &amp; DO NOT &ldquo;Reduce/Enlarge&rdquo;
                </h3>
                <p className="text-sm text-amber-900 mt-1">
                  Set <strong>Output Paper: Same as Document Size</strong>. Uncheck{" "}
                  <strong>Reduce/Enlarge Document</strong> and never choose{" "}
                  <em>&ldquo;Fit to Page&rdquo;</em> or <em>&ldquo;Shrink to Printable Area&rdquo;</em>. In Chrome/Adobe PDF print dialogs, set Scale to{" "}
                  <strong>Actual Size</strong> or <strong>100%</strong>.
                </p>
                <div className="mt-3 rounded-lg bg-white border border-slate-300 p-3 text-xs font-mono text-slate-700 shadow-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document Size:</span>
                    <strong className="text-emerald-700">Letter 8 1/2 x 11 in</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output Paper:</span>
                    <strong className="text-emerald-700">Same as Document Size</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scale / Page Sizing:</span>
                    <strong className="text-emerald-700">Actual Size (100%) — NOT Fit to Page</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 3: Paper Type & Ink */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">
                  3. Pearl Glossy Sticker Paper Tips (20 Sheets / 240 Labels)
                </h3>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-700 list-disc list-inside">
                  <li>
                    <strong>Paper / Media Type:</strong> Choose{" "}
                    <span className="font-semibold text-slate-900">
                      Glossy Photo Paper
                    </span>{" "}
                    or <span className="font-semibold text-slate-900">Labels</span> for optimal color reproduction and quick drying.
                  </li>
                  <li>
                    <strong>Printer Compatibility:</strong> Inkjet printers with{" "}
                    <strong>DYE ink</strong> or Laser printers capable of handling thick label paper.
                  </li>
                  <li>
                    <strong>Easy Peel:</strong> After printing, bend the sheet slightly back at the edges of the 2&quot; round labels to pop up the die-cut edge cleanly.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Rule 4: Light-box test */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-950">
              <strong>Recommended First Step:</strong> Print the{" "}
              <button
                type="button"
                onClick={onDownloadCalibrationPdf}
                className="underline font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Low-Ink Alignment Test PDF
              </button>{" "}
              on a regular sheet of plain paper first. Hold it behind a blank pearlescent sticker sheet up to a bright light. If your printer tray pulls the page 1mm left or down, adjust the{" "}
              <strong>Printer X / Y Offset (mm)</strong> sliders in the Calibration panel!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDownloadCalibrationPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <FileCheck className="w-4 h-4 text-indigo-600" />
            Download Alignment Test PDF
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/70 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onDownloadStickerPdf();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Download Sticker Sheet PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
