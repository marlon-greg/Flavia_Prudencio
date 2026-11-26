import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Studio Flávia Prudêncio · Fisioterapia e Pilates",
  description: "Pilates e fisioterapia em Indaiatuba. Planos, pré-matrícula e portal do aluno.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
