import {
  pgTable, serial, text, integer, boolean, timestamp, date, jsonb, uniqueIndex, pgEnum,
} from "drizzle-orm/pg-core";

export const perfilEnum = pgEnum("perfil", ["aluno", "recepcao", "dona"]);

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  nome: text("nome").notNull(),
  perfil: perfilEnum("perfil").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const planos = pgTable("planos", {
  id: serial("id").primaryKey(),
  modalidade: text("modalidade").notNull(), // Mensal | Trimestral | Semestral | Fisioterapia
  aulasSemana: integer("aulas_semana").notNull(),
  precoCentavos: integer("preco_centavos").notNull(), // valor mensal (ou por sessão, na fisioterapia)
});

export const alunos = pgTable("alunos", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id).unique(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  planoId: integer("plano_id").references(() => planos.id),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const anamneses = pgTable("anamneses", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").notNull().references(() => alunos.id).unique(),
  respostas: jsonb("respostas").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Horário semanal fixo da grade (ex.: segunda 08:00), com capacidade (RN01 = 4). */
export const horarios = pgTable("horarios", {
  id: serial("id").primaryKey(),
  diaSemana: integer("dia_semana").notNull(), // 0 = domingo ... 6 = sábado
  hora: text("hora").notNull(), // "HH:MM"
  capacidade: integer("capacidade").notNull().default(4),
}, (t) => [uniqueIndex("horario_unico").on(t.diaSemana, t.hora)]);

/** Matrícula do aluno em um horário fixo semanal. */
export const matriculas = pgTable("matriculas", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").notNull().references(() => alunos.id),
  horarioId: integer("horario_id").notNull().references(() => horarios.id),
  ativa: boolean("ativa").notNull().default(true),
});

/** Ocorrência de um horário numa data concreta. */
export const aulas = pgTable("aulas", {
  id: serial("id").primaryKey(),
  horarioId: integer("horario_id").notNull().references(() => horarios.id),
  data: date("data").notNull(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("aula_unica").on(t.horarioId, t.data)]);

/** Lugar de um aluno numa aula: fixo (vem da matrícula) ou reposição. */
export const reservas = pgTable("reservas", {
  id: serial("id").primaryKey(),
  aulaId: integer("aula_id").notNull().references(() => aulas.id),
  alunoId: integer("aluno_id").notNull().references(() => alunos.id),
  tipo: text("tipo").notNull(), // fixa | reposicao
  status: text("status").notNull().default("ativa"), // ativa | cancelada
  falta: boolean("falta").notNull().default(false),
  canceladaEm: timestamp("cancelada_em", { withTimezone: true }),
  motivo: text("motivo"),
  atestadoNome: text("atestado_nome"),
  atestadoDados: text("atestado_dados"), // data URL
}, (t) => [uniqueIndex("reserva_unica").on(t.aulaId, t.alunoId)]);

export const preMatriculas = pgTable("pre_matriculas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  interesse: text("interesse"),
  mensagem: text("mensagem"),
  atendida: boolean("atendida").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const pagamentos = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  alunoId: integer("aluno_id").notNull().references(() => alunos.id),
  referencia: text("referencia").notNull(), // "YYYY-MM"
  valorCentavos: integer("valor_centavos").notNull(),
  vencimento: date("vencimento").notNull(),
  pagoEm: timestamp("pago_em", { withTimezone: true }),
  forma: text("forma"),
  comprovanteNome: text("comprovante_nome"),
  comprovanteDados: text("comprovante_dados"),
}, (t) => [uniqueIndex("pagamento_unico").on(t.alunoId, t.referencia)]);

export const caixa = pgTable("caixa", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(), // entrada | saida
  descricao: text("descricao").notNull(),
  categoria: text("categoria"),
  valorCentavos: integer("valor_centavos").notNull(),
  data: date("data").notNull(),
  pagamentoId: integer("pagamento_id").references(() => pagamentos.id),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});
