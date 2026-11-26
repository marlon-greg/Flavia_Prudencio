import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { criarDbPglite, type DB } from "@/db";
import { horarios, planos, reservas, caixa, pagamentos } from "@/db/schema";
import {
  cadastrarAluno, salvarAnamnese, matricularEmHorario, reservarReposicao, cancelarReserva,
  marcarFalta, garantirAula, ocupacao, vagasDeReposicao, aulasDoAluno, darBaixa, gerarCobrancasDoMes,
  lancarCaixa, criarPreMatricula, inicioDaAula, RegraError,
} from "@/lib/servicos";

// Uma quarta-feira futura fixa, para os testes não dependerem do dia em que rodam.
const DATA = "2030-01-09"; // quarta
const QUARTA = 3;
const AGORA = new Date("2030-01-01T12:00:00-03:00");

let db: DB;
let horarioId: number;

async function novoAluno(nome: string, comAnamnese = true) {
  const a = await cadastrarAluno(db, { nome, telefone: "19999990000" });
  if (comAnamnese) await salvarAnamnese(db, a.id, { saude: "ok" });
  return a;
}

async function codigoDoErro(p: Promise<unknown>) {
  try { await p; return "ok"; } catch (e) { if (e instanceof RegraError) return e.codigo; throw e; }
}

beforeEach(async () => {
  db = await criarDbPglite();
  const [h] = await db.insert(horarios).values({ diaSemana: QUARTA, hora: "08:00", capacidade: 4 }).returning();
  horarioId = h.id;
});

describe("RN01 — máximo de 4 alunos por horário", () => {
  it("aceita 4 matrículas e recusa a quinta", async () => {
    for (let i = 1; i <= 4; i++) {
      const a = await novoAluno(`Aluno ${i}`);
      await matricularEmHorario(db, a.id, horarioId, AGORA);
    }
    const quinto = await novoAluno("Quinto");
    expect(await codigoDoErro(matricularEmHorario(db, quinto.id, horarioId, AGORA))).toBe("horario_lotado");
  });

  it("recusa matrícula se uma aula futura já está lotada por reposições", async () => {
    for (let i = 1; i <= 3; i++) await matricularEmHorario(db, (await novoAluno(`F${i}`)).id, horarioId, AGORA);
    await reservarReposicao(db, (await novoAluno("Repõe")).id, horarioId, DATA, AGORA);
    const novo = await novoAluno("Novo");
    expect(await codigoDoErro(matricularEmHorario(db, novo.id, horarioId, AGORA))).toBe("horario_lotado");
  });
});

describe("RN02 — cancelamento com menos de 60 minutos exige atestado", () => {
  let alunoId: number; let reservaId: number; let inicio: Date;
  beforeEach(async () => {
    const a = await novoAluno("Ana"); alunoId = a.id;
    await matricularEmHorario(db, alunoId, horarioId, AGORA);
    const aula = await db.transaction(tx => garantirAula(tx, horarioId, DATA));
    inicio = aula.inicio;
    const [r] = await db.select().from(reservas).where(eq(reservas.aulaId, aula.id));
    reservaId = r.id;
  });
  const antes = (min: number) => new Date(inicio.getTime() - min * 60000);

  it("usa o horário real da aula (08:00 em Indaiatuba, UTC-3)", () => {
    expect(inicio.toISOString()).toBe("2030-01-09T11:00:00.000Z");
    expect(inicioDaAula(DATA, "08:00").getTime()).toBe(inicio.getTime());
  });
  it("59 min antes, sem atestado: recusado", async () => {
    expect(await codigoDoErro(cancelarReserva(db, reservaId, alunoId, { motivo: "x" }, antes(59)))).toBe("exige_atestado");
  });
  it("59 min antes, com atestado: aceito", async () => {
    const r = await cancelarReserva(db, reservaId, alunoId, { motivo: "x", atestado: { nome: "a.pdf", dados: "data:," } }, antes(59));
    expect(r.status).toBe("cancelada");
  });
  it("60 min antes, sem atestado: aceito", async () => {
    expect((await cancelarReserva(db, reservaId, alunoId, {}, antes(60))).status).toBe("cancelada");
  });
  it("61 min antes, sem atestado: aceito", async () => {
    expect((await cancelarReserva(db, reservaId, alunoId, {}, antes(61))).status).toBe("cancelada");
  });
  it("depois do início: recusado", async () => {
    expect(await codigoDoErro(cancelarReserva(db, reservaId, alunoId, {}, antes(-1)))).toBe("aula_passada");
  });
  it("outro aluno não cancela a aula de alguém", async () => {
    const b = await novoAluno("Bia");
    expect(await codigoDoErro(cancelarReserva(db, reservaId, b.id, {}, antes(600)))).toBe("inexistente");
  });
  it("cancelamento libera a vaga", async () => {
    const aula = await db.transaction(tx => garantirAula(tx, horarioId, DATA));
    expect(await ocupacao(db, aula.id)).toBe(1);
    await cancelarReserva(db, reservaId, alunoId, {}, antes(600));
    expect(await ocupacao(db, aula.id)).toBe(0);
  });
});

describe("RN03 — presença por exceção", () => {
  it("falta gravada aparece na lista de aulas do aluno", async () => {
    const a = await novoAluno("Ana");
    await matricularEmHorario(db, a.id, horarioId, AGORA);
    const aula = await db.transaction(tx => garantirAula(tx, horarioId, DATA));
    const [r] = await db.select().from(reservas).where(eq(reservas.aulaId, aula.id));
    expect(await codigoDoErro(marcarFalta(db, r.id, true, AGORA))).toBe("aula_futura");
    await marcarFalta(db, r.id, true, new Date("2030-01-09T09:30:00-03:00"));
    const lista = await aulasDoAluno(db, a.id, new Date("2030-01-09T10:00:00-03:00"));
    expect(lista.find(x => x.id === r.id)?.falta).toBe(true);
  });
});

describe("RN04 — reposição só com vaga", () => {
  it("vagas diminuem após reposição e a quinta é recusada", async () => {
    for (let i = 1; i <= 2; i++) await matricularEmHorario(db, (await novoAluno(`F${i}`)).id, horarioId, AGORA);
    const vaga = (await vagasDeReposicao(db, 999, 14, AGORA)).find(v => v.data === DATA)!;
    expect(vaga.vagas).toBe(2);
    await reservarReposicao(db, (await novoAluno("R1")).id, horarioId, DATA, AGORA);
    expect((await vagasDeReposicao(db, 999, 14, AGORA)).find(v => v.data === DATA)!.vagas).toBe(1);
    await reservarReposicao(db, (await novoAluno("R2")).id, horarioId, DATA, AGORA);
    expect((await vagasDeReposicao(db, 999, 14, AGORA)).find(v => v.data === DATA)).toBeUndefined();
    expect(await codigoDoErro(reservarReposicao(db, (await novoAluno("R3")).id, horarioId, DATA, AGORA))).toBe("sem_vaga");
  });

  it("duas reservas simultâneas para a última vaga: só uma passa", async () => {
    for (let i = 1; i <= 3; i++) await matricularEmHorario(db, (await novoAluno(`F${i}`)).id, horarioId, AGORA);
    const x = await novoAluno("X"); const y = await novoAluno("Y");
    const res = await Promise.allSettled([
      reservarReposicao(db, x.id, horarioId, DATA, AGORA),
      reservarReposicao(db, y.id, horarioId, DATA, AGORA),
    ]);
    expect(res.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const aula = await db.transaction(tx => garantirAula(tx, horarioId, DATA));
    expect(await ocupacao(db, aula.id)).toBe(4);
  });

  it("não reserva aula que já passou", async () => {
    const a = await novoAluno("A");
    expect(await codigoDoErro(reservarReposicao(db, a.id, horarioId, DATA, new Date("2030-01-09T08:00:00-03:00")))).toBe("aula_passada");
  });
});

describe("RN05 — anamnese obrigatória", () => {
  it("sem anamnese não matricula nem repõe; depois de preencher, consegue", async () => {
    const a = await novoAluno("Sem", false);
    expect(await codigoDoErro(matricularEmHorario(db, a.id, horarioId, AGORA))).toBe("sem_anamnese");
    expect(await codigoDoErro(reservarReposicao(db, a.id, horarioId, DATA, AGORA))).toBe("sem_anamnese");
    await salvarAnamnese(db, a.id, { saude: "ok" });
    expect(await codigoDoErro(reservarReposicao(db, a.id, horarioId, DATA, AGORA))).toBe("ok");
  });
});

describe("Financeiro e cadastros gravam no banco", () => {
  it("baixa exige comprovante, grava o pagamento e lança entrada no caixa", async () => {
    const [p] = await db.insert(planos).values({ modalidade: "Mensal", aulasSemana: 2, precoCentavos: 22000 }).returning();
    await cadastrarAluno(db, { nome: "Pag", telefone: "19999990000", planoId: p.id });
    expect(await gerarCobrancasDoMes(db, "2030-01")).toBe(1);
    expect(await gerarCobrancasDoMes(db, "2030-01")).toBe(0); // não duplica
    const [pg] = await db.select().from(pagamentos);
    expect(await codigoDoErro(darBaixa(db, pg.id, { forma: "PIX", comprovante: null, usuarioId: 1 }))).toBe("sem_comprovante");
    await darBaixa(db, pg.id, { forma: "PIX", comprovante: { nome: "c.png", dados: "data:," }, usuarioId: null });
    const [pg2] = await db.select().from(pagamentos);
    expect(pg2.pagoEm).not.toBeNull();
    const cx = await db.select().from(caixa);
    expect(cx).toHaveLength(1);
    expect(cx[0].valorCentavos).toBe(22000);
    expect(await codigoDoErro(darBaixa(db, pg.id, { forma: "PIX", comprovante: { nome: "c", dados: "d" }, usuarioId: 1 }))).toBe("ja_pago");
  });

  it("despesa é gravada; valor inválido é recusado", async () => {
    expect(await codigoDoErro(lancarCaixa(db, { tipo: "saida", descricao: "Luz", valorCentavos: 0, data: "2030-01-05", usuarioId: null }))).toBe("dados_invalidos");
    await lancarCaixa(db, { tipo: "saida", descricao: "Luz", valorCentavos: 38000, data: "2030-01-05", usuarioId: null });
    expect(await db.select().from(caixa)).toHaveLength(1);
  });

  it("pré-matrícula valida telefone e grava", async () => {
    expect(await codigoDoErro(criarPreMatricula(db, { nome: "X", telefone: "123" }))).toBe("dados_invalidos");
    expect(await codigoDoErro(criarPreMatricula(db, { nome: "X", telefone: "(19) 99999-0000" }))).toBe("ok");
  });
});
