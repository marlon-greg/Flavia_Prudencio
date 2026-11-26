import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usuarios, alunos } from "@/db/schema";

export type Perfil = "aluno" | "recepcao" | "dona";
export type Sessao = { uid: number; perfil: Perfil; nome: string };

const COOKIE = "sfp_sessao";

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET não definido");
  return new TextEncoder().encode(s || "dev-somente-local-nao-usar-em-producao");
}

export async function criarSessao(s: Sessao) {
  const token = await new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(segredo());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

/** Lê a sessão do cookie assinado e confere no banco se o usuário continua ativo. */
export async function lerSessao(): Promise<Sessao | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    const db = await getDb();
    const [u] = await db.select().from(usuarios).where(eq(usuarios.id, Number(payload.uid)));
    if (!u || !u.ativo) return null;
    return { uid: u.id, perfil: u.perfil, nome: u.nome };
  } catch {
    return null;
  }
}

/** Exige login com um dos perfis. Sem login vai para /login; perfil errado vai para /acesso-negado. */
export async function exigirPerfil(...perfis: Perfil[]): Promise<Sessao> {
  const s = await lerSessao();
  if (!s) redirect("/login");
  if (!perfis.includes(s.perfil)) redirect("/acesso-negado");
  return s;
}

export async function alunoDaSessao() {
  const s = await exigirPerfil("aluno");
  const db = await getDb();
  const [a] = await db.select().from(alunos).where(eq(alunos.usuarioId, s.uid));
  if (!a) redirect("/acesso-negado");
  return { sessao: s, aluno: a };
}

export function destinoDoPerfil(p: Perfil) {
  return p === "aluno" ? "/portal" : "/admin";
}
