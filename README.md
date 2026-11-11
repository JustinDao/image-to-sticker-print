# PearlRound 2" Sticker Print Studio

**Live App:** [https://image-to-sticker-print.vercel.app/](https://image-to-sticker-print.vercel.app/)

A Vercel-ready Next.js web application for designing and generating exact **8.5" × 11" (US Letter) 300-DPI printable PDFs** for **2-Inch Round Pearlescent Die-Cut Label Sheets** (12 labels per sheet in a 3-column × 4-row grid, 20 sheets / 240 labels per pack).

## Features

- **Exact 12-Up 2" Round Sheet Geometry**:
  - Pre-configured for `8.5" × 11"` sheets with `2.00"` diameter round labels arranged in 3 columns × 4 rows (numbered `1` through `12`).
  - Includes presets for **Standard 12-Up (Avery 22807 / 22822 / Koala 2R)**, **Equal Vertical Spacing (0.60" gaps)**, **0.75" Top/Bottom Margin Variant**, and **Custom Calibration**.
- **Full-Bleed & Safe Zone Guides**:
  - Interactive circular cropper displays the **2.00" Die-Cut Line**, **1.85" Safe Zone**, and configurable **Full-Bleed Overprint** (`+0.04"` default) so slight printer shifts never leave unprinted white slivers on the pearlescent sticker edge.
- **Partial Sheet Saver**:
  - Toggle individual sticker slots (`#1`–`#12`) on or off—or skip the first *N* used stickers—to print on partially used sheets without wasting labels.
- **Curved Text & Inner Ring Designer**:
  - Add top/bottom curved text, center labels, custom background colors, and decorative inner border rings for spice jars, brand logos, mailing seals, and party favors.
- **Printer Alignment Calibration & Low-Ink Test PDF**:
  - Export a **Plain-Paper Alignment Test PDF** first to verify alignment against a physical label sheet in front of a light, and fine-tune X/Y printer offsets in millimeters.
  - Built-in visual printer checklist reminding you to **disable Borderless printing** and print at **100% / Actual Size** (`Letter 8.5 × 11 in`).

## Local Development

```bash
npm install
npm run dev
```

## Deploying to Vercel

Push this repository to GitHub/GitLab/Bitbucket and import it into [Vercel](https://vercel.com/new), or deploy directly from the CLI:

```bash
npx vercel
```
