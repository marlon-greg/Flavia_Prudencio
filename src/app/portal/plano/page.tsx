import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { horarios, matriculas, pagamentos, planos } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { hojeLocal } from "@/lib/servicos";
import { Cabecalho } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { dataBr, linkWhats, mesBr, nomeDia, nomePlano, reais } from "@/lib/util";

export default async function MeuPlano() {
  const { aluno } = await alunoDaSessao();
  const db = await getDb();
  const hoje = hojeLocal();
  const [plano] = aluno.planoId ? await db.select().from(planos).where(eq(planos.id, aluno.planoId)) : [];
  const fixos = await db.select({ dia: horarios.diaSemana, hora: horarios.hora }).from(matriculas)
    .innerJoin(horarios, eq(matriculas.horarioId, horarios.id))
    .where(and(eq(matriculas.alunoId, aluno.id), eq(matriculas.ativa, true)));
  const pags = await db.select().from(pagamentos).where(eq(pagamentos.alunoId, aluno.id)).orderBy(desc(pagamentos.referencia)).limit(12);
  const emAberto = pags.filter(p => !p.pagoEm);

  return (
    <div>
      <Cabecalho rotulo="Meu plano" titulo={nomePlano(plano)} sub={plano ? `${reais(plano.precoCentavos)}${plano.modalidade === "Fisioterapia" ? " por sessão" : " por mês"}` : undefined} />
      <div className="grid-2">
        <div className="card plano-atual">
          <div className="row"><span className="rotulo-cx">Plano atual</span><span className="spacer" />
            {emAberto.length ? <span className="tag pend ponto">{emAberto.length} em aberto</span>
              : <span className="tag ponto" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>Em dia</span>}</div>
          <div className="nome-plano">{nomePlano(plano)}</div>
          <div className="divisor">
            <div><span className="rotulo-cx">Horários fixos</span>
              <div>{fixos.length ? fixos.map(f => `${nomeDia(f.dia)} ${f.hora}`).join(" · ") : "Sem horário fixo"}</div></div>
          </div>
          <a className="btn branco peq" style={{ marginTop: 18 }} target="_blank" rel="noopener"
            href={linkWhats(`Olá! Sou ${aluno.nome} e gostaria de alterar meu plano.`)}><Icone nome="whatsapp" tam={14} /> Alterar plano pelo WhatsApp</a>
        </div>
        <div className="card">
          <div className="card-cab"><h2>Pagamentos</h2></div>
          {!pags.length && <p className="muted">Nenhuma cobrança.</p>}
          <div className="tabela">
            <table>
              <thead><tr><th>Mês</th><th>Valor</th><th>Situação</th></tr></thead>
              <tbody>
                {pags.map(p => (
                  <tr key={p.id}>
                    <td><strong>{mesBr(p.referencia)}</strong>{p.forma && <div className="muted small">{p.forma}</div>}</td>
                    <td>{reais(p.valorCentavos)}</td>
                    <td>{p.pagoEm ? <span className="tag ponto">Pago</span>
                      : p.vencimento < hoje ? <span className="tag falta ponto">Venceu {dataBr(p.vencimento)}</span>
                      : <span className="tag pend ponto">Vence {dataBr(p.vencimento)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
