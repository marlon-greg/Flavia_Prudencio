import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { lerSessao } from "@/lib/auth";
import { relatorios } from "@/lib/servicos";

export const dynamic = "force-dynamic";

/** Relatórios em JSON. Só a proprietária: sem login 401, outro perfil 403 (RF12). */
export async function GET() {
  const s = await lerSessao();
  if (!s) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  if (s.perfil !== "dona") return NextResponse.json({ erro: "acesso negado" }, { status: 403 });
  return NextResponse.json(await relatorios(await getDb()));
}
