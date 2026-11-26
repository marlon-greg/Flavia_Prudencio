import Link from "next/link";
import { getDb } from "@/db";
import { gradeDoDia, hojeLocal, somarDias } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho, Indicador } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { acaoFalta } from "../acoes";
import { dataBr, dataExtenso, horaCurta } from "@/lib/util";

export default async function Grade({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams;
  const hoje = hojeLocal();
  const data = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") ? sp.data! : hoje;
  const grade = await gradeDoDia(await getDb(), data);
  const podeFalta = data <= hoje;
  const maxVagas = Math.max(4, ...grade.map(g => g.capacidade));
  const ativasDe = (g: (typeof grade)[number]) => g.reservas.filter(r => r.status === "ativa");
  const agendados = grade.reduce((s, g) => s + ativasDe(g).length, 0);
  const livres = grade.reduce((s, g) => s + Math.max(0, g.capacidade - ativasDe(g).length), 0);
  const faltas = grade.reduce((s, g) => s + ativasDe(g).filter(r => r.falta).length, 0);

  return (
    <div>
      <Cabecalho rotulo="Grade diária" titulo={dataExtenso(data)}
        sub={<>{maxVagas} vagas por horário · presença por exceção: registre só as faltas.{!podeFalta && " Faltas só podem ser marcadas no dia da aula ou depois."}</>}>
        <Link className="btn contorno peq" href={`/admin?data=${somarDias(data, -1)}`}><Icone nome="chev_left" tam={14} /> Anterior</Link>
        <Link className={`btn peq ${data === hoje ? "sec" : "contorno"}`} href="/admin"><Icone nome="calendar" tam={14} /> Hoje</Link>
        <Link className="btn contorno peq" href={`/admin?data=${somarDias(data, 1)}`}>Próximo <Icone nome="chev_right" tam={14} /></Link>
        <form className="row" style={{ gap: 6 }}>
          <input type="date" name="data" defaultValue={data} aria-label="Ir para a data" style={{ marginTop: 0, width: "auto", padding: "6px 10px", borderRadius: 999 }} />
          <button className="btn peq">Ir</button>
        </form>
      </Cabecalho>

      <div className="indicadores" style={{ marginBottom: 16 }}>
        <Indicador rotulo="Aulas no dia" valor={grade.length} icone="calendar" />
        <Indicador rotulo="Alunos agendados" valor={agendados} icone="users" />
        <Indicador rotulo="Vagas livres" valor={livres} icone="plus" />
        <Indicador rotulo="Faltas registradas" valor={faltas} icone="info" tom="alerta" />
      </div>

      <div className="card legenda" style={{ marginBottom: 16 }}>
        <span><i style={{ background: "#EEF6F1", borderColor: "#8FC0A6", borderStyle: "dashed" }} />Vaga livre</span>
        <span><i style={{ background: "var(--info-bg)", borderColor: "#9DBBDD" }} />Aluno fixo</span>
        <span><i style={{ background: "var(--warn-bg)", borderColor: "#EBCB6A" }} />Aluno repondo</span>
        <span><i style={{ background: "var(--danger-bg)", borderColor: "#E7A5A5" }} />Falta</span>
      </div>

      <div className="card grade-tabela tabela">
        {!grade.length ? <p className="muted grade-vazia">Não há horários cadastrados para {dataBr(data)}.</p> : (
          <div style={{ minWidth: 0 }}>
            <div className="grade-linha titulos" style={{ ["--vagas" as string]: maxVagas }}>
              <span>Horário</span>{Array.from({ length: maxVagas }).map((_, i) => <span key={i}>Vaga {i + 1}</span>)}
            </div>
            {grade.map(g => {
              const ativas = ativasDe(g);
              const canceladas = g.reservas.filter(r => r.status === "cancelada");
              const nLivres = Math.max(0, g.capacidade - ativas.length);
              return (
                <div key={g.aula.id} className="grade-linha aula" style={{ ["--vagas" as string]: maxVagas }}>
                  <div className="grade-hora">
                    <span className="hora">{horaCurta(g.hora)}</span>
                    <span className={`tag ocupacao ${nLivres ? "" : "pend"}`}>{ativas.length}/{g.capacidade}</span>
                    {canceladas.length > 0 && <div className="muted small" style={{ marginTop: 6 }} title={canceladas.map(c => c.nome).join(", ")}>
                      {canceladas.length} cancel.</div>}
                  </div>
                  {ativas.map(r => (
                    <div key={r.id} className={`vaga ${r.falta ? "falta" : r.tipo === "reposicao" ? "repo" : "fixo"}`}>
                      <span className="tipo">{r.falta ? "Falta" : r.tipo === "reposicao" ? "Reposição" : "Fixo"}</span>
                      <span className="nome">{r.nome}</span>
                      {podeFalta && (
                        <AcaoForm acao={acaoFalta}>
                          <input type="hidden" name="reservaId" value={r.id} />
                          <input type="hidden" name="falta" value={r.falta ? "0" : "1"} />
                          <button className={`btn peq ${r.falta ? "contorno" : "perigo-leve"}`}>{r.falta ? "Desfazer" : "Marcar falta"}</button>
                        </AcaoForm>
                      )}
                    </div>
                  ))}
                  {Array.from({ length: nLivres }).map((_, i) => (
                    <div key={`l${i}`} className="vaga livre"><span className="tipo">Livre</span><span className="small"><Icone nome="plus" tam={13} /> Vaga livre</span></div>
                  ))}
                  {Array.from({ length: Math.max(0, maxVagas - g.capacidade) }).map((_, i) => <div key={`x${i}`} />)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
