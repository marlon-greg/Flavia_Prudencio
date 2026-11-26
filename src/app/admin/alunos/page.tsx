import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alunos, anamneses, horarios, matriculas, planos } from "@/db/schema";
import { AcaoForm } from "@/components/AcaoForm";
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

  return (
    <div className="stack">
      <h1>Alunos</h1>
      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Cadastrar aluno</summary>
        <AcaoForm acao={acaoCadastrarAluno}>
          <div className="campos">
            <label>Nome<input name="nome" required /></label>
            <label>Telefone<input name="telefone" required inputMode="tel" /></label>
            <label>Plano
              <select name="planoId" defaultValue="">
                <option value="">Sem plano</option>
                {ps.map(p => <option key={p.id} value={p.id}>{nomePlano(p)} · {reais(p.precoCentavos)}</option>)}
              </select>
            </label>
          </div>
          <p className="muted small">Para o aluno acessar o portal, informe e-mail e uma senha inicial (8+ caracteres).</p>
          <div className="campos">
            <label>E-mail<input name="email" type="email" /></label>
            <label>Senha inicial<input name="senha" type="text" minLength={8} /></label>
          </div>
          <button className="btn">Cadastrar</button>
        </AcaoForm>
      </details>

      <div className="card tabela">
        <table>
          <thead><tr><th>Aluno</th><th>Plano</th><th>Anamnese</th><th>Horários fixos</th><th>Matricular</th></tr></thead>
          <tbody>
            {lista.map(({ a, p, anamnese }) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong><div className="muted small">{a.telefone}{a.email ? ` · ${a.email}` : ""}</div></td>
                <td>{nomePlano(p)}</td>
                <td>{anamnese ? <span className="tag">OK</span> : <span className="tag pend">Pendente</span>}</td>
                <td>
                  {ms.filter(m => m.alunoId === a.id).map(m => (
                    <AcaoForm key={m.id} acao={acaoEncerrarMatricula}>
                      <input type="hidden" name="matriculaId" value={m.id} />
                      <div className="row small">{nomeDia(m.dia).slice(0, 3)} {m.hora}
                        <button className="btn sec peq" title="Encerrar matrícula neste horário">Remover</button></div>
                    </AcaoForm>
                  ))}
                </td>
                <td style={{ minWidth: 200 }}>
                  <AcaoForm acao={acaoMatricular}>
                    <input type="hidden" name="alunoId" value={a.id} />
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <select name="horarioId" required style={{ marginTop: 0 }}>
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
        {!lista.length && <p className="muted">Nenhum aluno cadastrado.</p>}
      </div>
    </div>
  );
}
