// Popula o banco com planos, grade de horários e usuários iniciais.
// Uso: npm run seed   (usa DATABASE_URL se existir; senão o PGlite em .data/pglite)
// Não roda duas vezes: se já houver usuários, para.
import { getDb } from "../src/db";
import { planos, horarios, usuarios } from "../src/db/schema";
import {
  cadastrarAluno, salvarAnamnese, matricularEmHorario, criarFuncionario, gerarCobrancasDoMes, lancarCaixa, hojeLocal,
} from "../src/lib/servicos";

const SENHA = process.env.SEED_SENHA || "studio2026";

async function main() {
  const db = await getDb();
  if ((await db.select({ id: usuarios.id }).from(usuarios).limit(1)).length) {
    console.log("O banco já tem usuários; seed ignorado.");
    return;
  }

  const tabela: [string, number, number][] = [
    ["Mensal", 1, 15000], ["Mensal", 2, 22000], ["Mensal", 3, 27000],
    ["Trimestral", 1, 13000], ["Trimestral", 2, 19500], ["Trimestral", 3, 23000],
    ["Semestral", 1, 12000], ["Semestral", 2, 18000], ["Semestral", 3, 22000],
    ["Fisioterapia", 1, 9000],
  ];
  const ps = await db.insert(planos).values(tabela.map(([modalidade, aulasSemana, precoCentavos]) => ({ modalidade, aulasSemana, precoCentavos }))).returning();
  const plano = (m: string, n: number) => ps.find(p => p.modalidade === m && p.aulasSemana === n)!.id;

  const horas = ["07:00", "08:00", "09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  const linhas = [];
  for (let dia = 1; dia <= 5; dia++) for (const hora of horas) linhas.push({ diaSemana: dia, hora, capacidade: 4 });
  for (const hora of ["08:00", "09:00", "10:00"]) linhas.push({ diaSemana: 6, hora, capacidade: 4 });
  const hs = await db.insert(horarios).values(linhas).returning();
  const h = (dia: number, hora: string) => hs.find(x => x.diaSemana === dia && x.hora === hora)!.id;

  await criarFuncionario(db, { nome: "Flávia Prudêncio", email: "flavia@studio.local", senha: SENHA, perfil: "dona" });
  await criarFuncionario(db, { nome: "Recepção", email: "recepcao@studio.local", senha: SENHA, perfil: "recepcao" });

  const alunosSeed: { nome: string; email?: string; plano: [string, number]; anamnese: boolean; horarios: [number, string][] }[] = [
    { nome: "Ana Beatriz Carvalho", email: "ana@studio.local", plano: ["Mensal", 2], anamnese: true, horarios: [[2, "09:00"], [4, "09:00"]] },
    { nome: "Bruno Henrique Lopes", email: "bruno@studio.local", plano: ["Trimestral", 3], anamnese: false, horarios: [] },
    { nome: "Camila Vasconcelos", plano: ["Semestral", 2], anamnese: true, horarios: [[3, "17:00"], [5, "17:00"]] },
    { nome: "Daniel Moreira Costa", plano: ["Mensal", 3], anamnese: true, horarios: [[1, "18:00"], [3, "18:00"], [5, "18:00"]] },
    { nome: "Gabriela Rezende Lima", plano: ["Trimestral", 2], anamnese: true, horarios: [[2, "09:00"], [4, "18:00"]] },
    { nome: "Isabela Marques", plano: ["Semestral", 3], anamnese: true, horarios: [[1, "07:00"], [3, "07:00"], [5, "07:00"]] },
    { nome: "João Pedro Almeida", plano: ["Mensal", 3], anamnese: true, horarios: [[1, "07:00"], [2, "09:00"], [5, "07:00"]] },
    { nome: "Larissa Bittencourt", plano: ["Trimestral", 1], anamnese: true, horarios: [[2, "09:00"]] },
  ];
  for (const s of alunosSeed) {
    const a = await cadastrarAluno(db, {
      nome: s.nome, telefone: "(19) 99999-0000", email: s.email, senha: s.email ? SENHA : undefined, planoId: plano(...s.plano),
    });
    if (s.anamnese) await salvarAnamnese(db, a.id, { objetivo: "Fortalecimento e postura", ciente: "sim" });
    for (const [dia, hora] of s.horarios) await matricularEmHorario(db, a.id, h(dia, hora));
  }

  const hoje = hojeLocal();
  await gerarCobrancasDoMes(db, hoje.slice(0, 7));
  await lancarCaixa(db, { tipo: "saida", descricao: "Aluguel", categoria: "Aluguel", valorCentavos: 280000, data: `${hoje.slice(0, 7)}-05`, usuarioId: null });

  console.log(`Seed concluído. Senha inicial de todos os usuários: ${SENHA}`);
  console.log("Proprietária: flavia@studio.local · Recepção: recepcao@studio.local");
  console.log("Alunos: ana@studio.local (com anamnese) · bruno@studio.local (sem anamnese)");
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
