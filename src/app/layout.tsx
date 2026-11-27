import "./globals.css";
import { ehTeste } from "@/lib/ambiente";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Studio Flávia Prudêncio · Fisioterapia e Pilates",
  description: "Pilates e fisioterapia em Indaiatuba. Planos, pré-matrícula e portal do aluno.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F3326" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {ehTeste() && <div className="faixa-teste" role="note">AMBIENTE DE TESTE · dados fictícios</div>}
        {children}
      </body>
    </html>
  );
}
