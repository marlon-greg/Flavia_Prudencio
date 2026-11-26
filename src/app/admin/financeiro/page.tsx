import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { alunos, caixa, pagamentos } from "@/db/schema";
import { hojeLocal } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
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

  return (
    <div className="stack">
      <h1>Financeiro</h1>
      {sp.ok === "baixa" && <div className="msg ok" role="status">Pagamento baixado e lançado no caixa.</div>}
      <div className="grid-2">
        <div className="card stack">
          <div className="row"><h2 style={{ margin: 0 }}>Mensalidades em aberto</h2><span className="spacer" />
            <AcaoForm acao={acaoGerarCobrancas}>
              <input type="hidden" name="referencia" value={hoje.slice(0, 7)} />
              <button className="btn sec peq">Gerar cobranças de {mesBr(hoje.slice(0, 7))}</button>
            </AcaoForm>
          </div>
          {!pendentes.length && <p className="muted">Nenhuma mensalidade em aberto.</p>}
          {pendentes.map(({ p, nome }) => (
            <details key={p.id} className="lugar" style={{ display: "block" }}>
              <summary style={{ cursor: "pointer" }}>
                <strong>{nome}</strong> · {mesBr(p.referencia)} · {reais(p.valorCentavos)}{" "}
                {p.vencimento < hoje ? <span className="tag falta">Vencida {dataBr(p.vencimento)}</span> : <span className="tag pend">Vence {dataBr(p.vencimento)}</span>}
              </summary>
              <AcaoForm acao={acaoBaixa}>
                <input type="hidden" name="pagamentoId" value={p.id} />
                <div className="campos">
                  <label>Forma<select name="forma"><option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option></select></label>
                  <label>Comprovante (obrigatório)<input name="comprovante" type="file" accept=".pdf,image/*" required /></label>
                </div>
                <button className="btn peq">Dar baixa</button>
              </AcaoForm>
            </details>
          ))}
        </div>

        <div className="card">
          <h2>Novo lançamento no caixa</h2>
          <AcaoForm acao={acaoCaixa}>
            <div className="campos">
              <label>Tipo<select name="tipo" defaultValue="saida"><option value="saida">Despesa (saída)</option><option value="entrada">Entrada</option></select></label>
              <label>Data<input name="data" type="date" defaultValue={hoje} required /></label>
            </div>
            <label>Descrição<input name="descricao" required placeholder="Ex.: Conta de luz" /></label>
            <div className="campos">
              <label>Categoria<select name="categoria"><option>Aluguel</option><option>Utilidades</option><option>Materiais</option><option>Manutenção</option><option>Salários</option><option>Sessão avulsa</option><option>Outros</option></select></label>
              <label>Valor (R$)<input name="valor" required inputMode="decimal" placeholder="0,00" /></label>
            </div>
            <button className="btn">Lançar</button>
          </AcaoForm>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Caixa de {mesBr(mes)}</h2><span className="spacer" />
          <form className="row"><input type="month" name="mes" defaultValue={mes} style={{ marginTop: 0, width: "auto" }} /><button className="btn sec peq">Ver</button></form>
        </div>
        <div className="grid" style={{ margin: "12px 0" }}>
          <div><div className="muted small">Entradas</div><div className="kpi" style={{ fontSize: "1.3rem" }}>{reais(ent)}</div></div>
          <div><div className="muted small">Saídas</div><div className="kpi" style={{ fontSize: "1.3rem", color: "var(--danger)" }}>{reais(sai)}</div></div>
          <div><div className="muted small">Saldo</div><div className="kpi" style={{ fontSize: "1.3rem" }}>{reais(ent - sai)}</div></div>
        </div>
        <div className="tabela">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {lancs.map(l => (
                <tr key={l.id}>
                  <td>{dataBr(l.data)}</td><td>{l.descricao}</td><td>{l.categoria ?? "—"}</td>
                  <td className="num" style={{ color: l.tipo === "saida" ? "var(--danger)" : undefined }}>
                    {l.tipo === "saida" ? "− " : "+ "}{reais(l.valorCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
        </div>
        <p className="muted small">{lancs.length} lançamento(s) em {mesBr(mes)}.</p>
      </div>
    </div>
  );
}
