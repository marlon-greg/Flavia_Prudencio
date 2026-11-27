// Cria os acessos Admin, Dona (teste) e Secretária e grava as senhas num arquivo fora do Git.
// Não altera usuários que já existem.
// Local:    npx tsx scripts/criar-acessos.ts
// Recusa o banco real. Para o banco real, use scripts/preparar-real.ts.
import { randomInt } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { usuarios } from "../src/db/schema";
import { criarFuncionario } from "../src/lib/servicos";
import { recusarBancoReal } from "../src/lib/ambiente";

const LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const senha = (n: number) => Array.from({ length: n }, () => LETRAS[randomInt(LETRAS.length)]).join("");

const ACESSOS = [
  { quem: "Admin (seu, não mostrar)", nome: "Administrador", email: "admin@studio.local", perfil: "dona" as const, tam: 16 },
  { quem: "Dona (TESTE, para demonstração)", nome: "Dona Teste", email: "dona.teste@studio.local", perfil: "dona" as const, tam: 10 },
  { quem: "Secretária (teste)", nome: "Secretária Teste", email: "secretaria@studio.local", perfil: "recepcao" as const, tam: 10 },
];

async function main() {
  recusarBancoReal();
  const online = !!process.env.DATABASE_URL;
  const arquivo = `../ACESSOS_${online ? "DEMO" : "LOCAL"}.md`;
  if (existsSync(arquivo)) throw new Error(`${arquivo} já existe; não vou sobrescrever as senhas guardadas.`);
  const db = await getDb();
  const linhas: string[] = [];
  for (const a of ACESSOS) {
    const [ja] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, a.email));
    let s = "(já existia: senha não alterada)";
    if (!ja) { s = senha(a.tam); await criarFuncionario(db, { nome: a.nome, email: a.email, senha: s, perfil: a.perfil }); }
    linhas.push(`| ${a.quem} | ${a.email} | ${s} |`);
  }
  writeFileSync(arquivo, `# Acessos · ${online ? "TESTE (demonstração publicada)" : "TESTE local (http://localhost:3000)"}

NÃO envie este arquivo inteiro a ninguém e não coloque no Git.

| Quem | E-mail | Senha |
|---|---|---|
${linhas.join("\n")}
`);
  console.log(`Pronto. Senhas gravadas em ${arquivo}`);
}

main().then(() => process.exit(0), e => { console.error(e.message, e.cause?.code ?? "", e.cause?.message ?? ""); process.exit(1); });
