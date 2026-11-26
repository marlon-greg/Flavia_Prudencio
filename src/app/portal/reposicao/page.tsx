import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { vagasDeReposicao } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoReposicao } from "../../acoes";
import { dataCurta } from "@/lib/util";

export default async function Reposicao() {
  const { aluno } = await alunoDaSessao();
  const db = await getDb();
  const [anamnese] = await db.select({ id: anamneses.id }).from(anamneses).where(eq(anamneses.alunoId, aluno.id));
  const vagas = await vagasDeReposicao(db, aluno.id, 14);
  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.5rem" }}>Reposição e reagendamento</h1>
      <p className="muted">Horários dos próximos 14 dias com vaga. Cada turma tem no máximo 4 alunos.</p>
      {!anamnese && <div className="msg aviso">Preencha a <Link href="/portal/anamnese">anamnese</Link> antes de agendar.</div>}
      {!vagas.length && <p className="muted">Nenhum horário com vaga.</p>}
      <div className="grade">
        {vagas.map(v => (
          <div key={`${v.horarioId}-${v.data}`} className="card aula">
            <div className="cab"><span className="hora">{dataCurta(v.data)} · {v.hora}</span>
              <span className="tag">{v.vagas} {v.vagas === 1 ? "vaga" : "vagas"}</span></div>
            <AcaoForm acao={acaoReposicao}>
              <input type="hidden" name="horarioId" value={v.horarioId} />
              <input type="hidden" name="data" value={v.data} />
              <button className="btn peq">Reservar</button>
            </AcaoForm>
          </div>
        ))}
      </div>
    </div>
  );
}
