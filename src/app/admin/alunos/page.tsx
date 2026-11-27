import Link from "next/link";
import { CampoEmail, CampoSenha, CampoTelefone } from "@/components/Campos";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alunos, anamneses, horarios, matriculas, planos } from "@/db/schema";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho, Indicador, iniciais } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { acaoCadastrarAluno, acaoEncerrarMatricula, acaoMatricular } from "../../acoes";
import { nomeDia, nomePlano, reais } from "@/lib/util";

export default async function Alunos() {
  const db = await getDb();
  const ps = await db.select().from(planos).orderBy(asc(planos.modalidade), asc(planos.aulasSemana));
  const hs = await db.select().from(horarios).orderBy(asc(horarios.diaSemana), asc(horarios.hora));
  const lista = await db.select({ a: alunos, p: planos, anamnese: anamneses.id }).from(alunos)
    .leftJoin(planos, eq(alunos.planoId, planos.id)).leftJoin(anamneses, eq(anamneses.alunoId, alunos.id))
    .where(eq(alunos.ativo, true)).orderBy(asc(alunos.nome));
  const ms = await db.select({ id: matriculas.id, alunoId: matriculas.alunoId, dia: horarios.diaSemana, hora: horarios.hora })
    .from(matriculas).innerJoin(horarios, eq(matriculas.horarioId, horarios.id)).where(eq(matriculas.ativa, true));
  const semAnamnese = lista.filter(l => !l.anamnese).length;

  return (
    <div className="stack">
      <Cabecalho rotulo="Alunos" titulo="Alunos ativos" sub="Cadastro, horários fixos e ficha de cada aluno." />
      <div className="indicadores">
        <Indicador rotulo="Alunos ativos" valor={lista.length} icone="users" />
        <Indicador rotulo="Matrículas em horários" valor={ms.length} icone="calendar" />
        <Indicador rotulo="Sem anamnese" valor={semAnamnese} icone="file" tom={semAnamnese ? "alerta" : undefined} />
      </div>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><Icone nome="plus" tam={16} /> Cadastrar aluno</summary>
        <div style={{ marginTop: 16 }}>
          <AcaoForm acao={acaoCadastrarAluno}>
            <div className="campos">
              <label>Nome<input name="nome" required minLength={3} maxLength={80} /></label>
              <label>Telefone<CampoTelefone name="telefone" required autoComplete="off" /></label>
              <label>Plano
                <select name="planoId" defaultValue="">
                  <option value="">Sem plano</option>
                  {ps.map(p => <option key={p.id} value={p.id}>{nomePlano(p)} · {reais(p.precoCentavos)}</option>)}
                </select>
              </label>
            </div>
            <p className="muted small" style={{ margin: 0 }}>Para o aluno acessar o portal, informe e-mail e uma senha inicial (8+ caracteres).</p>
            <div className="campos">
              <label>E-mail<CampoEmail name="email" autoComplete="off" /></label>
              <label>Senha inicial<CampoSenha name="senha" minLength={8} autoComplete="new-password" /></label>
            </div>
            <button className="btn">Cadastrar</button>
          </AcaoForm>
        </div>
      </details>

      <div className="card tabela" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Aluno</th><th>Plano</th><th>Anamnese</th><th>Horários fixos</th><th>Matricular em horário</th></tr></thead>
          <tbody>
            {lista.map(({ a, p, anamnese }) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/admin/alunos/${a.id}`} className="pessoa" style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="avatar peq">{iniciais(a.nome)}</span>
                    <span><strong>{a.nome}</strong><div className="muted small">{a.telefone}{a.email ? ` · ${a.email}` : ""}</div></span>
                  </Link>
                </td>
                <td>{nomePlano(p)}</td>
                <td>{anamnese ? <span className="tag ponto">OK</span> : <span className="tag pend ponto">Pendente</span>}</td>
                <td>
                  {ms.filter(m => m.alunoId === a.id).map(m => (
                    <AcaoForm key={m.id} acao={acaoEncerrarMatricula}>
                      <input type="hidden" name="matriculaId" value={m.id} />
                      <div className="row small" style={{ gap: 6, flexWrap: "nowrap" }}><span className="tag contorno">{nomeDia(m.dia).slice(0, 3)} {m.hora}</span>
                        <button className="btn contorno peq" style={{ minHeight: 26, padding: "2px 8px" }} title="Encerrar matrícula neste horário">Remover</button></div>
                    </AcaoForm>
                  ))}
                </td>
                <td style={{ minWidth: 210 }}>
                  <AcaoForm acao={acaoMatricular}>
                    <input type="hidden" name="alunoId" value={a.id} />
                    <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                      <select name="horarioId" required style={{ marginTop: 0, padding: "7px 10px" }}>
                        {hs.map(h => <option key={h.id} value={h.id}>{nomeDia(h.diaSemana).slice(0, 3)} {h.hora}</option>)}
                      </select>
                      <button className="btn peq">OK</button>
                    </div>
                  </AcaoForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="muted" style={{ padding: 16 }}>Nenhum aluno cadastrado.</p>}
      </div>
    </div>
  );
}
