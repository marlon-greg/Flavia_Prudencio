// Prepara o banco REAL: planos, grade de horários e um único Admin. Nenhum aluno ou conta de teste.
// Uso:  node --env-file=.env.producao --import tsx scripts/preparar-real.ts
// Se o banco já tiver usuários, só mostra o que existe e não muda nada.
// Para zerar um banco que recebeu dados de teste (APAGA TUDO, sem volta), acrescente: --apagar-tudo
import { randomInt } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { planos, horarios, usuarios } from "../src/db/schema";
import { criarFuncionario } from "../src/lib/servicos";
import { PLANOS_INICIAIS, gradeInicial } from "./dados-base";

const ARQUIVO = "../ACESSOS_PRODUCAO.md";
const LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function main() {
  if (!process.env.DATABASE_URL || process.env.AMBIENTE === "teste") throw new Error("Defina a DATABASE_URL do banco real.");
  if (existsSync(ARQUIVO)) throw new Error(`${ARQUIVO} já existe; mova o arquivo antes, para não perder senhas.`);
  const apagar = process.argv.includes("--apagar-tudo");
  const db = await getDb();
  const atuais = await db.select({ email: usuarios.email, perfil: usuarios.perfil }).from(usuarios);
  if (atuais.length && !apagar) {
    console.log(`O banco já tem ${atuais.length} usuário(s):`);
    console.table(atuais);
    console.log("Nada foi alterado. Se são só dados de teste, rode de novo com --apagar-tudo.");
    return;
  }
  const senha = Array.from({ length: 16 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
  await db.transaction(async (tx) => {
    if (apagar) await tx.execute(sql`TRUNCATE caixa, pagamentos, reservas, aulas, matriculas, anamneses, pre_matriculas, alunos, usuarios, horarios, planos RESTART IDENTITY CASCADE`);
    if (!(await tx.select().from(planos).limit(1)).length) await tx.insert(planos).values(PLANOS_INICIAIS);
    if (!(await tx.select().from(horarios).limit(1)).length) await tx.insert(horarios).values(gradeInicial());
  });
  await criarFuncionario(db, { nome: "Administrador", email: "admin@studio.local", senha, perfil: "dona" });
  writeFileSync(ARQUIVO, `# Acesso · site REAL

Não envie este arquivo a ninguém. Troque a senha no primeiro acesso (menu "Trocar senha").

| Quem | E-mail | Senha inicial |
|---|---|---|
| Admin | admin@studio.local | ${senha} |
`);
  console.log(`Banco real pronto. Acesso do Admin gravado em ${ARQUIVO}`);
}

main().then(() => process.exit(0), e => { console.error(e.message, e.cause?.message ?? ""); process.exit(1); });
