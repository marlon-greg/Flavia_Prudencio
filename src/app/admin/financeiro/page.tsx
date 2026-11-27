import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { CampoArquivo, CampoMoeda } from "@/components/Campos";
import { getDb } from "@/db";
import { alunos, caixa, pagamentos } from "@/db/schema";
import { hojeLocal } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho, Indicador } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { acaoBaixa, acaoCaixa, acaoGerarCobrancas } from "../../acoes";
import { dataBr, mesBr, reais } from "@/lib/util";

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ mes?: string; ok?: string }> }) {
  const sp = await searchParams;
  const hoje = hojeLocal();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoje.slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const prox = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const db = await getDb();
  const pendentes = await db.select({ p: pagamentos, nome: alunos.nome }).from(pagamentos)
    .innerJoin(alunos, eq(pagamentos.alunoId, alunos.id)).where(isNull(pagamentos.pagoEm)).orderBy(asc(pagamentos.vencimento));
  const lancs = await db.select().from(caixa)
    .where(and(gte(caixa.data, `${mes}-01`), lt(caixa.data, `${prox}-01`))).orderBy(desc(caixa.data), desc(caixa.id));
  const ent = lancs.filter(l => l.tipo === "entrada").reduce((s, l) => s + l.valorCentavos, 0);
  const sai = lancs.filter(l => l.tipo === "saida").reduce((s, l) => s + l.valorCentavos, 0);
  const aReceber = pendentes.reduce((s, x) => s + x.p.valorCentavos, 0);
  const vencidas = pendentes.filter(x => x.p.vencimento < hoje).length;

  return (
    <div className="stack">
      <Cabecalho rotulo="Financeiro" titulo="Caixa e recebimentos" sub="Baixa de mensalidades com comprovante e lançamentos do caixa.">
        <form className="row" style={{ gap: 6 }}>
          <input type="month" name="mes" defaultValue={mes} aria-label="Mês do caixa" style={{ marginTop: 0, width: "auto", padding: "6px 12px", borderRadius: 999 }} />
          <button className="btn contorno peq">Ver mês</button>
        </form>
      </Cabecalho>
      {sp.ok === "baixa" && <div className="msg ok" role="status">Pagamento baixado e lançado no caixa.</div>}

      <div className="indicadores">
        <Indicador rotulo={`Entradas · ${mesBr(mes)}`} valor={reais(ent)} icone="arrow_right" />
        <Indicador rotulo={`Saídas · ${mesBr(mes)}`} valor={reais(sai)} icone="upload" tom="perigo" />
        <Indicador rotulo="Saldo do mês" valor={reais(ent - sai)} icone="cash" tom={ent - sai < 0 ? "perigo" : undefined} />
        <Indicador rotulo="A receber" valor={reais(aReceber)} icone="clock" tom="alerta" ajuda={`${pendentes.length} em aberto · ${vencidas} vencida(s)`} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-cab"><h2>Mensalidades em aberto</h2><span className="spacer" />
            <AcaoForm acao={acaoGerarCobrancas}>
              <input type="hidden" name="referencia" value={hoje.slice(0, 7)} />
              <button className="btn sec peq">Gerar cobranças de {mesBr(hoje.slice(0, 7))}</button>
            </AcaoForm>
          </div>
          {!pendentes.length && <p className="muted">Nenhuma mensalidade em aberto.</p>}
          {pendentes.map(({ p, nome }) => (
            <details key={p.id} className="lugar ficha" style={{ display: "block" }}>
              <summary>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 140 }}><strong>{nome}</strong><div className="muted small">{mesBr(p.referencia)} · {reais(p.valorCentavos)}</div></span>
                  {p.vencimento < hoje ? <span className="tag falta ponto">Vencida {dataBr(p.vencimento)}</span> : <span className="tag pend ponto">Vence {dataBr(p.vencimento)}</span>}
                  <span className="btn contorno peq">Dar baixa</span>
                </div>
              </summary>
              <div style={{ background: "var(--ink-50)", borderRadius: "var(--r)", padding: 14, marginTop: 10 }}>
                <AcaoForm acao={acaoBaixa}>
                  <input type="hidden" name="pagamentoId" value={p.id} />
                  <div className="campos">
                    <label>Forma<select name="forma"><option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option></select></label>
                    <label>Comprovante (obrigatório)<CampoArquivo name="comprovante" required /></label>
                  </div>
                  <button className="btn peq"><Icone nome="check" tam={14} /> Dar baixa</button>
                </AcaoForm>
              </div>
            </details>
          ))}
        </div>

        <div className="card">
          <div className="card-cab"><h2>Novo lançamento no caixa</h2></div>
          <AcaoForm acao={acaoCaixa}>
            <div className="campos">
              <label>Tipo<select name="tipo" defaultValue="saida"><option value="saida">Despesa (saída)</option><option value="entrada">Entrada</option></select></label>
              <label>Data<input name="data" type="date" defaultValue={hoje} required /></label>
            </div>
            <label>Descrição<input name="descricao" required maxLength={120} placeholder="Ex.: Conta de luz" /></label>
            <div className="campos">
              <label>Categoria<select name="categoria"><option>Aluguel</option><option>Utilidades</option><option>Materiais</option><option>Manutenção</option><option>Salários</option><option>Sessão avulsa</option><option>Outros</option></select></label>
              <label>Valor (R$)<CampoMoeda name="valor" required /></label>
            </div>
            <button className="btn">Lançar</button>
          </AcaoForm>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-cab" style={{ padding: "18px 22px 0" }}><h2>Caixa de {mesBr(mes)}</h2></div>
        <div className="tabela">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {lancs.map(l => (
                <tr key={l.id}>
                  <td>{dataBr(l.data)}</td><td><strong style={{ fontWeight: 500 }}>{l.descricao}</strong></td><td><span className="tag contorno">{l.categoria ?? "—"}</span></td>
                  <td className="num" style={{ color: l.tipo === "saida" ? "var(--danger)" : "var(--green-700)", fontWeight: 500 }}>
                    {l.tipo === "saida" ? "− " : "+ "}{reais(l.valorCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ padding: "0 22px 16px" }}>{lancs.length} lançamento(s) em {mesBr(mes)}.</p>
      </div>
    </div>
  );
}
