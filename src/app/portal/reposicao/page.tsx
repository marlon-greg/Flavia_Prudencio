import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { vagasDeReposicao } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho } from "@/components/Topo";
import { acaoReposicao } from "../../acoes";
import { dataCurta } from "@/lib/util";
import { horaBr } from "../comum";

export default async function Reposicao() {
  const { aluno } = await alunoDaSessao();
  const db = await getDb();
  const [anamnese] = await db.select({ id: anamneses.id }).from(anamneses).where(eq(anamneses.alunoId, aluno.id));
  const vagas = await vagasDeReposicao(db, aluno.id, 14);
  const dias = [...new Set(vagas.map(v => v.data))];
  return (
    <div>
      <Cabecalho rotulo="Reposição" titulo="Escolha um horário com vaga" sub="Próximos 14 dias. Cada turma tem no máximo 4 alunos." />
      {!anamnese && <div className="msg aviso" style={{ marginBottom: 16 }}>Preencha a <Link href="/portal/anamnese">anamnese</Link> antes de agendar.</div>}
      {!vagas.length && <p className="muted">Nenhum horário com vaga.</p>}
      {dias.map(d => (
        <section key={d}>
          <div className="dia-titulo">{dataCurta(d)}</div>
          <div className="grade">
            {vagas.filter(v => v.data === d).map(v => (
              <div key={`${v.horarioId}-${v.data}`} className="card aula">
                <div className="cab">
                  <span className="hora">{dataCurta(v.data)} · {horaBr(v.hora)}</span>
                  <span className={`tag ${v.vagas === 1 ? "pend" : ""}`}>{v.vagas} {v.vagas === 1 ? "vaga" : "vagas"}</span>
                </div>
                <div className="bolinhas" style={{ margin: "0 0 12px" }}>
                  {Array.from({ length: 4 }).map((_, i) => <span key={i} className={i < 4 - v.vagas ? "cheia" : ""} />)}
                </div>
                <AcaoForm acao={acaoReposicao}>
                  <input type="hidden" name="horarioId" value={v.horarioId} />
                  <input type="hidden" name="data" value={v.data} />
                  <button className="btn peq bloco">Reservar</button>
                </AcaoForm>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
