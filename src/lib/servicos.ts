// Regras de negócio do Studio Flávia Prudêncio.
// Todas as operações que alteram dados passam por aqui e são verificadas no servidor.
import { and, eq, gt, gte, lte, sql, asc, desc, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import {
  alunos, anamneses, aulas, caixa, horarios, matriculas, pagamentos, planos,
  preMatriculas, reservas, usuarios,
} from "@/db/schema";
import { hashSenha } from "./senha";

export class RegraError extends Error {
  constructor(public codigo: string, mensagem: string) { super(mensagem); }
}

export const CAPACIDADE_PADRAO = 4; // RN01
export const ANTECEDENCIA_MINIMA_MIN = 60; // RN02

// ---------- Datas (fuso de Indaiatuba: America/Sao_Paulo, UTC-3 sem horário de verão) ----------
export const FUSO = "-03:00";
export function inicioDaAula(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${FUSO}`);
}
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00${FUSO}`).getUTCDay();
}
export function hojeLocal(agora = new Date()): string {
  return new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function minutosAte(inicio: Date, agora: Date): number {
  return (inicio.getTime() - agora.getTime()) / 60000;
}

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Exec = DB | Tx;

// ---------- Aulas e ocupação ----------

/** Cria (se ainda não existir) a aula de um horário numa data e os lugares fixos dos matriculados. */
export async function garantirAula(db: Exec, horarioId: number, data: string) {
  const [h] = await db.select().from(horarios).where(eq(horarios.id, horarioId));
  if (!h) throw new RegraError("horario_inexistente", "Horário não encontrado.");
  if (h.diaSemana !== diaDaSemana(data)) throw new RegraError("dia_invalido", "Esse horário não acontece nesse dia.");
  await db.insert(aulas).values({ horarioId, data, inicio: inicioDaAula(data, h.hora) }).onConflictDoNothing();
  const [aula] = await db.select().from(aulas).where(and(eq(aulas.horarioId, horarioId), eq(aulas.data, data)));
  const fixos = await db.select({ alunoId: matriculas.alunoId }).from(matriculas)
    .where(and(eq(matriculas.horarioId, horarioId), eq(matriculas.ativa, true)));
  if (fixos.length) {
    await db.insert(reservas).values(fixos.map(f => ({ aulaId: aula.id, alunoId: f.alunoId, tipo: "fixa" })))
      .onConflictDoNothing();
  }
  return aula;
}

export async function garantirAulasDoDia(db: Exec, data: string) {
  const hs = await db.select().from(horarios).where(eq(horarios.diaSemana, diaDaSemana(data))).orderBy(asc(horarios.hora));
  const res = [];
  for (const h of hs) res.push(await garantirAula(db, h.id, data));
  return res;
}

export async function ocupacao(db: Exec, aulaId: number): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(reservas)
    .where(and(eq(reservas.aulaId, aulaId), eq(reservas.status, "ativa")));
  return Number(r.n);
}

async function exigirAnamnese(db: Exec, alunoId: number) {
  const [a] = await db.select({ id: anamneses.id }).from(anamneses).where(eq(anamneses.alunoId, alunoId));
  if (!a) throw new RegraError("sem_anamnese", "O aluno precisa preencher a anamnese antes de agendar aulas."); // RN05
}

// ---------- Matrícula em horário fixo (RN01, RN05) ----------

export async function matricularEmHorario(db: DB, alunoId: number, horarioId: number, agora = new Date()) {
  return db.transaction(async (tx) => {
    await exigirAnamnese(tx, alunoId);
    const [h] = await tx.select().from(horarios).where(eq(horarios.id, horarioId)).for("update");
    if (!h) throw new RegraError("horario_inexistente", "Horário não encontrado.");
    const [ja] = await tx.select().from(matriculas)
      .where(and(eq(matriculas.alunoId, alunoId), eq(matriculas.horarioId, horarioId), eq(matriculas.ativa, true)));
    if (ja) throw new RegraError("ja_matriculado", "O aluno já está matriculado nesse horário.");
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(matriculas)
      .where(and(eq(matriculas.horarioId, horarioId), eq(matriculas.ativa, true)));
    if (Number(n) >= h.capacidade) throw new RegraError("horario_lotado", `Horário lotado: máximo de ${h.capacidade} alunos.`); // RN01

    // Aulas futuras já criadas desse horário também precisam ter vaga (podem ter reposições).
    const futuras = await tx.select().from(aulas).where(and(eq(aulas.horarioId, horarioId), gt(aulas.inicio, agora)));
    for (const a of futuras) {
      if ((await ocupacao(tx, a.id)) >= h.capacidade) {
        throw new RegraError("horario_lotado", `A aula de ${a.data.split("-").reverse().join("/")} desse horário já está lotada com reposições.`);
      }
    }
    const [m] = await tx.insert(matriculas).values({ alunoId, horarioId }).returning();
    for (const a of futuras) {
      await tx.insert(reservas).values({ aulaId: a.id, alunoId, tipo: "fixa" }).onConflictDoNothing();
    }
    return m;
  });
}

export async function encerrarMatricula(db: DB, matriculaId: number, agora = new Date()) {
  return db.transaction(async (tx) => {
    const [m] = await tx.update(matriculas).set({ ativa: false }).where(eq(matriculas.id, matriculaId)).returning();
    if (!m) throw new RegraError("inexistente", "Matrícula não encontrada.");
    const futuras = await tx.select({ id: aulas.id }).from(aulas)
      .where(and(eq(aulas.horarioId, m.horarioId), gt(aulas.inicio, agora)));
    if (futuras.length) {
      await tx.update(reservas).set({ status: "cancelada", canceladaEm: agora, motivo: "Matrícula encerrada" })
        .where(and(eq(reservas.alunoId, m.alunoId), eq(reservas.tipo, "fixa"), inArray(reservas.aulaId, futuras.map(f => f.id))));
    }
    return m;
  });
}

// ---------- Reposição (RN04, RN05) ----------

export async function reservarReposicao(db: DB, alunoId: number, horarioId: number, data: string, agora = new Date()) {
  return db.transaction(async (tx) => {
    await exigirAnamnese(tx, alunoId);
    const aula0 = await garantirAula(tx, horarioId, data);
    // Trava a aula: duas reservas simultâneas para a última vaga não passam juntas.
    const [aula] = await tx.select().from(aulas).where(eq(aulas.id, aula0.id)).for("update");
    if (aula.inicio <= agora) throw new RegraError("aula_passada", "Essa aula já começou ou já passou.");
    const [h] = await tx.select().from(horarios).where(eq(horarios.id, horarioId));
    const [existente] = await tx.select().from(reservas).where(and(eq(reservas.aulaId, aula.id), eq(reservas.alunoId, alunoId)));
    if (existente?.status === "ativa") throw new RegraError("ja_reservado", "Você já está nessa aula.");
    if ((await ocupacao(tx, aula.id)) >= h.capacidade) throw new RegraError("sem_vaga", "Não há vaga nessa aula."); // RN04
    if (existente) {
      const [r] = await tx.update(reservas).set({ status: "ativa", tipo: "reposicao", canceladaEm: null, motivo: null, falta: false })
        .where(eq(reservas.id, existente.id)).returning();
      return r;
    }
    const [r] = await tx.insert(reservas).values({ aulaId: aula.id, alunoId, tipo: "reposicao" }).returning();
    return r;
  });
}

/** Aulas futuras com vaga, para o aluno escolher reposição. */
export async function vagasDeReposicao(db: DB, alunoId: number, dias = 14, agora = new Date()) {
  const hoje = hojeLocal(agora);
  const lista: { horarioId: number; data: string; hora: string; vagas: number }[] = [];
  for (let i = 0; i <= dias; i++) {
    const data = somarDias(hoje, i);
    const hs = await db.select().from(horarios).where(eq(horarios.diaSemana, diaDaSemana(data))).orderBy(asc(horarios.hora));
    for (const h of hs) {
      if (inicioDaAula(data, h.hora) <= agora) continue;
      const [aula] = await db.select().from(aulas).where(and(eq(aulas.horarioId, h.id), eq(aulas.data, data)));
      let ocupadas: number; let jaEsta = false;
      if (aula) {
        ocupadas = await ocupacao(db, aula.id);
        const [r] = await db.select().from(reservas).where(and(eq(reservas.aulaId, aula.id), eq(reservas.alunoId, alunoId), eq(reservas.status, "ativa")));
        jaEsta = !!r;
      } else {
        const ms = await db.select({ alunoId: matriculas.alunoId }).from(matriculas).where(and(eq(matriculas.horarioId, h.id), eq(matriculas.ativa, true)));
        ocupadas = ms.length; jaEsta = ms.some(m => m.alunoId === alunoId);
      }
      const vagas = h.capacidade - ocupadas;
      if (vagas > 0 && !jaEsta) lista.push({ horarioId: h.id, data, hora: h.hora, vagas });
    }
  }
  return lista;
}

// ---------- Cancelamento (RN02) ----------

export async function cancelarReserva(
  db: DB, reservaId: number, alunoId: number,
  opts: { motivo?: string; atestado?: { nome: string; dados: string } | null },
  agora = new Date(),
) {
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(reservas).where(eq(reservas.id, reservaId)).for("update");
    if (!r || r.alunoId !== alunoId) throw new RegraError("inexistente", "Aula não encontrada.");
    if (r.status !== "ativa") throw new RegraError("ja_cancelada", "Essa aula já foi cancelada.");
    const [aula] = await tx.select().from(aulas).where(eq(aulas.id, r.aulaId));
    const minutos = minutosAte(aula.inicio, agora);
    if (minutos <= 0) throw new RegraError("aula_passada", "Não é possível cancelar uma aula que já começou.");
    if (minutos < ANTECEDENCIA_MINIMA_MIN && !opts.atestado) {
      throw new RegraError("exige_atestado",
        `Faltam menos de ${ANTECEDENCIA_MINIMA_MIN} minutos para a aula: o cancelamento exige atestado.`); // RN02
    }
    const [c] = await tx.update(reservas).set({
      status: "cancelada", canceladaEm: agora, motivo: opts.motivo ?? null,
      atestadoNome: opts.atestado?.nome ?? null, atestadoDados: opts.atestado?.dados ?? null,
    }).where(eq(reservas.id, reservaId)).returning();
    return c;
  });
}

// ---------- Presença por exceção (RN03) ----------

export async function marcarFalta(db: DB, reservaId: number, falta: boolean, agora = new Date()) {
  const [r] = await db.select().from(reservas).where(eq(reservas.id, reservaId));
  if (!r || r.status !== "ativa") throw new RegraError("inexistente", "Reserva não encontrada.");
  const [aula] = await db.select().from(aulas).where(eq(aulas.id, r.aulaId));
  if (aula.data > hojeLocal(agora)) throw new RegraError("aula_futura", "Só é possível marcar falta no dia da aula ou depois.");
  const [u] = await db.update(reservas).set({ falta }).where(eq(reservas.id, reservaId)).returning();
  return u;
}

// ---------- Alunos, anamnese, pré-matrícula ----------

export async function cadastrarAluno(db: DB, d: { nome: string; telefone: string; email?: string; planoId?: number | null; senha?: string }) {
  return db.transaction(async (tx) => {
    let usuarioId: number | null = null;
    if (d.email && d.senha) {
      const [u] = await tx.insert(usuarios).values({
        email: d.email.trim().toLowerCase(), senhaHash: await hashSenha(d.senha), nome: d.nome, perfil: "aluno",
      }).returning();
      usuarioId = u.id;
    }
    const [a] = await tx.insert(alunos).values({
      nome: d.nome, telefone: d.telefone, email: d.email?.trim().toLowerCase() || null, planoId: d.planoId ?? null, usuarioId,
    }).returning();
    return a;
  });
}

export async function salvarAnamnese(db: DB, alunoId: number, respostas: Record<string, string>) {
  const [a] = await db.insert(anamneses).values({ alunoId, respostas })
    .onConflictDoUpdate({ target: anamneses.alunoId, set: { respostas, criadoEm: new Date() } }).returning();
  return a;
}

export async function criarPreMatricula(db: DB, d: { nome: string; telefone: string; email?: string; interesse?: string; mensagem?: string }) {
  if (!d.nome.trim() || d.telefone.replace(/\D/g, "").length < 10) {
    throw new RegraError("dados_invalidos", "Informe nome e telefone com DDD.");
  }
  const [p] = await db.insert(preMatriculas).values(d).returning();
  return p;
}

// ---------- Financeiro (RF11, RF14) ----------

export async function gerarCobrancasDoMes(db: DB, referencia: string) {
  const ativos = await db.select({ id: alunos.id, preco: planos.precoCentavos, modalidade: planos.modalidade })
    .from(alunos).innerJoin(planos, eq(alunos.planoId, planos.id)).where(eq(alunos.ativo, true));
  const mensais = ativos.filter(a => a.modalidade !== "Fisioterapia");
  if (!mensais.length) return 0;
  const res = await db.insert(pagamentos).values(mensais.map(a => ({
    alunoId: a.id, referencia, valorCentavos: a.preco, vencimento: `${referencia}-10`,
  }))).onConflictDoNothing().returning();
  return res.length;
}

export async function darBaixa(
  db: DB, pagamentoId: number,
  d: { forma: string; comprovante: { nome: string; dados: string } | null; usuarioId: number | null },
  agora = new Date(),
) {
  if (!d.comprovante) throw new RegraError("sem_comprovante", "Anexe o comprovante para dar baixa.");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(pagamentos).where(eq(pagamentos.id, pagamentoId)).for("update");
    if (!p) throw new RegraError("inexistente", "Pagamento não encontrado.");
    if (p.pagoEm) throw new RegraError("ja_pago", "Esse pagamento já foi baixado.");
    const [a] = await tx.select().from(alunos).where(eq(alunos.id, p.alunoId));
    const [u] = await tx.update(pagamentos).set({
      pagoEm: agora, forma: d.forma, comprovanteNome: d.comprovante!.nome, comprovanteDados: d.comprovante!.dados,
    }).where(eq(pagamentos.id, pagamentoId)).returning();
    await tx.insert(caixa).values({
      tipo: "entrada", descricao: `Mensalidade ${p.referencia} — ${a.nome}`, categoria: "Mensalidade",
      valorCentavos: p.valorCentavos, data: hojeLocal(agora), pagamentoId, usuarioId: d.usuarioId,
    });
    return u;
  });
}

export async function lancarCaixa(db: DB, d: { tipo: "entrada" | "saida"; descricao: string; categoria?: string; valorCentavos: number; data: string; usuarioId: number | null }) {
  if (!d.descricao.trim()) throw new RegraError("dados_invalidos", "Informe a descrição.");
  if (!Number.isInteger(d.valorCentavos) || d.valorCentavos <= 0) throw new RegraError("dados_invalidos", "Informe um valor maior que zero.");
  const [c] = await db.insert(caixa).values(d).returning();
  return c;
}

// ---------- Funcionários (RF15) ----------

export async function criarFuncionario(db: DB, d: { nome: string; email: string; senha: string; perfil: "recepcao" | "dona" }) {
  if (d.senha.length < 8) throw new RegraError("senha_fraca", "A senha precisa ter pelo menos 8 caracteres.");
  const email = d.email.trim().toLowerCase();
  const [ja] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  if (ja) throw new RegraError("email_em_uso", "Já existe um usuário com esse e-mail.");
  const [u] = await db.insert(usuarios).values({ nome: d.nome, email, senhaHash: await hashSenha(d.senha), perfil: d.perfil }).returning();
  return u;
}

export async function definirAtivo(db: DB, usuarioId: number, ativo: boolean, quemFaz: number) {
  if (usuarioId === quemFaz) throw new RegraError("proprio_usuario", "Você não pode desativar o seu próprio acesso.");
  const [u] = await db.update(usuarios).set({ ativo }).where(eq(usuarios.id, usuarioId)).returning();
  return u;
}

// ---------- Consultas ----------

export async function gradeDoDia(db: DB, data: string) {
  const aulasDia = await db.transaction(tx => garantirAulasDoDia(tx, data));
  const res = [];
  for (const a of aulasDia) {
    const [h] = await db.select().from(horarios).where(eq(horarios.id, a.horarioId));
    const rs = await db.select({
      id: reservas.id, tipo: reservas.tipo, status: reservas.status, falta: reservas.falta,
      alunoId: alunos.id, nome: alunos.nome,
    }).from(reservas).innerJoin(alunos, eq(reservas.alunoId, alunos.id))
      .where(eq(reservas.aulaId, a.id)).orderBy(asc(reservas.tipo), asc(alunos.nome));
    res.push({ aula: a, hora: h.hora, capacidade: h.capacidade, reservas: rs });
  }
  return res;
}

export async function aulasDoAluno(db: DB, alunoId: number, agora = new Date()) {
  // Garante as aulas dos próximos 14 dias para os horários fixos do aluno.
  const hoje = hojeLocal(agora);
  const ms = await db.select().from(matriculas).where(and(eq(matriculas.alunoId, alunoId), eq(matriculas.ativa, true)));
  for (const m of ms) {
    const [h] = await db.select().from(horarios).where(eq(horarios.id, m.horarioId));
    for (let i = 0; i <= 14; i++) {
      const d = somarDias(hoje, i);
      if (diaDaSemana(d) === h.diaSemana) await db.transaction(tx => garantirAula(tx, h.id, d));
    }
  }
  return db.select({
    id: reservas.id, tipo: reservas.tipo, status: reservas.status, falta: reservas.falta, motivo: reservas.motivo,
    atestadoNome: reservas.atestadoNome, data: aulas.data, inicio: aulas.inicio, hora: horarios.hora,
  }).from(reservas).innerJoin(aulas, eq(reservas.aulaId, aulas.id)).innerJoin(horarios, eq(aulas.horarioId, horarios.id))
    .where(and(eq(reservas.alunoId, alunoId), gte(aulas.data, somarDias(hoje, -60)), lte(aulas.data, somarDias(hoje, 14))))
    .orderBy(asc(aulas.inicio));
}

export async function relatorios(db: DB) {
  const [{ ativos }] = await db.select({ ativos: sql<number>`count(*)::int` }).from(alunos).where(eq(alunos.ativo, true));
  const fluxo = await db.select({
    mes: sql<string>`to_char(${caixa.data}, 'YYYY-MM')`,
    entradas: sql<number>`coalesce(sum(case when ${caixa.tipo}='entrada' then ${caixa.valorCentavos} end),0)::int`,
    saidas: sql<number>`coalesce(sum(case when ${caixa.tipo}='saida' then ${caixa.valorCentavos} end),0)::int`,
  }).from(caixa).groupBy(sql`1`).orderBy(desc(sql`1`)).limit(12);
  const porHora = await db.select({
    hora: horarios.hora,
    presencas: sql<number>`count(*) filter (where ${reservas.status}='ativa' and not ${reservas.falta})::int`,
    faltas: sql<number>`count(*) filter (where ${reservas.status}='ativa' and ${reservas.falta})::int`,
    cancelamentos: sql<number>`count(*) filter (where ${reservas.status}='cancelada')::int`,
  }).from(reservas).innerJoin(aulas, eq(reservas.aulaId, aulas.id)).innerJoin(horarios, eq(aulas.horarioId, horarios.id))
    .where(lte(aulas.inicio, new Date())).groupBy(horarios.hora).orderBy(asc(horarios.hora));
  const [{ pendentes }] = await db.select({ pendentes: sql<number>`count(*)::int` }).from(pagamentos).where(sql`${pagamentos.pagoEm} is null`);
  const [{ pre }] = await db.select({ pre: sql<number>`count(*)::int` }).from(preMatriculas).where(eq(preMatriculas.atendida, false));
  return { ativos: Number(ativos), fluxo, porHora, pendentes: Number(pendentes), preMatriculasAbertas: Number(pre) };
}
