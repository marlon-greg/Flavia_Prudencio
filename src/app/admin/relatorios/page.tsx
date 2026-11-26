import { getDb } from "@/db";
import { exigirPerfil } from "@/lib/auth";
import { relatorios } from "@/lib/servicos";
import { mesBr, reais } from "@/lib/util";

export default async function Relatorios() {
  await exigirPerfil("dona"); // RF12: recepção é redirecionada para /acesso-negado
  const r = await relatorios(await getDb());
  const maxFluxo = Math.max(1, ...r.fluxo.flatMap(f => [f.entradas, f.saidas]));
  const maxHora = Math.max(1, ...r.porHora.map(h => h.presencas + h.faltas));
  return (
    <div className="stack">
      <h1>Relatórios</h1>
      <div className="grid">
        <div className="card"><div className="muted small">Alunos ativos</div><div className="kpi">{r.ativos}</div></div>
        <div className="card"><div className="muted small">Mensalidades em aberto</div><div className="kpi">{r.pendentes}</div></div>
        <div className="card"><div className="muted small">Pré-matrículas sem atendimento</div><div className="kpi">{r.preMatriculasAbertas}</div></div>
      </div>
      <div className="grid-2">
        <div className="card stack">
          <h2>Entradas e saídas por mês</h2>
          {!r.fluxo.length && <p className="muted">Sem lançamentos no caixa.</p>}
          {r.fluxo.map(f => (
            <div key={f.mes}>
              <div className="small"><strong>{mesBr(f.mes)}</strong> · saldo {reais(f.entradas - f.saidas)}</div>
              <div className="barra"><span style={{ width: 60 }}>Entrada</span><div className="trilho"><div className="valor" style={{ width: `${(f.entradas / maxFluxo) * 100}%` }} /></div><span style={{ width: 100, textAlign: "right" }}>{reais(f.entradas)}</span></div>
              <div className="barra"><span style={{ width: 60 }}>Saída</span><div className="trilho"><div className="valor" style={{ width: `${(f.saidas / maxFluxo) * 100}%`, background: "var(--danger)" }} /></div><span style={{ width: 100, textAlign: "right" }}>{reais(f.saidas)}</span></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Frequência por horário</h2>
          <p className="muted small">Aulas já realizadas: presenças, faltas e cancelamentos.</p>
          <div className="tabela">
            <table>
              <thead><tr><th>Horário</th><th>Ocupação</th><th className="num">Presenças</th><th className="num">Faltas</th><th className="num">Cancel.</th></tr></thead>
              <tbody>
                {r.porHora.map(h => (
                  <tr key={h.hora}>
                    <td>{h.hora}</td>
                    <td style={{ minWidth: 100 }}><div className="barra"><div className="trilho"><div className="valor" style={{ width: `${((h.presencas + h.faltas) / maxHora) * 100}%` }} /></div></div></td>
                    <td className="num">{h.presencas}</td><td className="num">{h.faltas}</td><td className="num">{h.cancelamentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!r.porHora.length && <p className="muted">Nenhuma aula realizada ainda.</p>}
        </div>
      </div>
    </div>
  );
}
