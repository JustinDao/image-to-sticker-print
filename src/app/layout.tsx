import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PearlRound 2\" Sticker Print Studio | 8.5×11 12-Up PDF Generator",
  description:
    "Upload artwork or logos and generate an exact 8.5\" × 11\" 300-DPI printable PDF for 2-inch round pearlescent die-cut sticker sheets (12 labels per sheet, 3×4 grid).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
