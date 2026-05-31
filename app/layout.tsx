import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// UI font (locked) + display serif (placeholder — spec §13.1, founder picks
// between Tiempos Headline and Source Serif 4; using the free option here).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pantry Pal — Prototype",
  description:
    "A clickable prototype of Pantry Pal. Not a shipped product. © 2026 Joe Fehr.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
