import Link from "next/link";
import { getDb } from "@/db";
import { gradeDoDia, hojeLocal, somarDias } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoFalta } from "../acoes";
import { dataBr, dataCurta } from "@/lib/util";

export default async function Grade({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams;
  const hoje = hojeLocal();
  const data = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") ? sp.data! : hoje;
  const grade = await gradeDoDia(await getDb(), data);
  const podeFalta = data <= hoje;

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>Grade de {dataCurta(data)}</h1>
        <span className="spacer" />
        <Link className="btn sec peq" href={`/admin?data=${somarDias(data, -1)}`}>← Anterior</Link>
        {data !== hoje && <Link className="btn sec peq" href="/admin">Hoje</Link>}
        <Link className="btn sec peq" href={`/admin?data=${somarDias(data, 1)}`}>Próximo →</Link>
      </div>
      <p className="muted small">
        Presença por exceção: todo aluno da lista conta como presente. Registre apenas as faltas.
        {!podeFalta && " Faltas só podem ser marcadas no dia da aula ou depois."}
      </p>
      {!grade.length && <p className="muted">Não há horários cadastrados para {dataBr(data)}.</p>}
      <div className="grade">
        {grade.map(g => {
          const ativas = g.reservas.filter(r => r.status === "ativa");
          const livres = Math.max(0, g.capacidade - ativas.length);
          return (
            <div key={g.aula.id} className="card aula">
              <div className="cab">
                <span className="hora">{g.hora}</span>
                <span className={`tag ${livres ? "" : "pend"}`}>{ativas.length}/{g.capacidade}</span>
              </div>
              {ativas.map(r => (
                <div key={r.id} className="lugar">
                  <span className="nome">{r.nome}</span>
                  {r.tipo === "reposicao" && <span className="tag repo">Repõe</span>}
                  {r.falta && <span className="tag falta">Falta</span>}
                  {podeFalta && (
                    <AcaoForm acao={acaoFalta}>
                      <input type="hidden" name="reservaId" value={r.id} />
                      <input type="hidden" name="falta" value={r.falta ? "0" : "1"} />
                      <button className={`btn peq ${r.falta ? "sec" : "perigo"}`}>{r.falta ? "Desfazer" : "Marcar falta"}</button>
                    </AcaoForm>
                  )}
                </div>
              ))}
              {Array.from({ length: livres }).map((_, i) => <div key={i} className="lugar livre">Vaga livre</div>)}
              {g.reservas.filter(r => r.status === "cancelada").map(r => (
                <div key={r.id} className="lugar small muted"><span className="nome">{r.nome}</span><span className="tag cancelada">Cancelou</span></div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
