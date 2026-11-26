import { getDb } from "@/db";
import { exigirPerfil } from "@/lib/auth";
import { relatorios } from "@/lib/servicos";
import { Cabecalho, Indicador } from "@/components/Topo";
import { horaCurta, mesBr, mesCurto, reais } from "@/lib/util";

const VERDE = "#2C5E4A", VERMELHO = "#C13B3B", AMARELO = "#E0A800", CINZA = "#D1D6D3";
const milhar = (c: number) => (c / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** Barras agrupadas de entradas e saídas por mês (SVG feito no servidor, sem biblioteca). */
function GraficoFluxo({ dados }: { dados: { mes: string; entradas: number; saidas: number }[] }) {
  const W = 560, H = 220, M = { t: 14, r: 8, b: 26, l: 48 };
  const max = Math.max(1, ...dados.flatMap(d => [d.entradas, d.saidas]));
  const passo = (W - M.l - M.r) / Math.max(1, dados.length);
  const bw = Math.min(22, passo / 3);
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / max);
  const linhas = [0, .25, .5, .75, 1].map(f => max * f);
  return (
    <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entradas e saídas por mês">
      {linhas.map((v, i) => (
        <g key={i}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#E7EBE9" strokeDasharray={i ? "3 4" : undefined} />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end">{milhar(v)}</text>
        </g>
      ))}
      {dados.map((d, i) => {
        const cx = M.l + passo * i + passo / 2;
        return (
          <g key={d.mes}>
            <rect x={cx - bw - 2} y={y(d.entradas)} width={bw} height={H - M.b - y(d.entradas)} rx={4} fill={VERDE}><title>{`Entradas ${mesBr(d.mes)}: ${reais(d.entradas)}`}</title></rect>
            <rect x={cx + 2} y={y(d.saidas)} width={bw} height={H - M.b - y(d.saidas)} rx={4} fill={VERMELHO} opacity={.8}><title>{`Saídas ${mesBr(d.mes)}: ${reais(d.saidas)}`}</title></rect>
            <text x={cx} y={H - 8} textAnchor="middle">{mesCurto(d.mes)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Rosca com a divisão de presenças, faltas e cancelamentos. */
function Rosca({ partes }: { partes: { rotulo: string; valor: number; cor: string }[] }) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acum = 0;
  return (
    <div className="rosca">
      <svg width={140} height={140} viewBox="0 0 140 140" role="img" aria-label="Divisão das aulas realizadas">
        <circle cx={70} cy={70} r={R} fill="none" stroke="#F4F6F5" strokeWidth={18} />
        {total > 0 && partes.map(p => {
          const len = (p.valor / total) * C;
          const el = <circle key={p.rotulo} cx={70} cy={70} r={R} fill="none" stroke={p.cor} strokeWidth={18}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acum} transform="rotate(-90 70 70)" />;
          acum += len;
          return el;
        })}
        <text x={70} y={68} textAnchor="middle" style={{ fontSize: 22, fontWeight: 600, fill: "#0F3326" }}>{total}</text>
        <text x={70} y={86} textAnchor="middle">aulas</text>
      </svg>
      <div className="stack" style={{ fontSize: ".85rem" }}>
        {partes.map(p => (
          <div key={p.rotulo}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: p.cor, marginRight: 8 }} />
            {p.rotulo}: <strong>{p.valor}</strong> <span className="muted">({total ? Math.round((p.valor / total) * 100) : 0}%)</span></div>
        ))}
      </div>
    </div>
  );
}

export default async function Relatorios() {
  await exigirPerfil("dona"); // RF12: recepção é redirecionada para /acesso-negado
  const r = await relatorios(await getDb());
  const fluxo = [...r.fluxo].reverse().slice(-6); // do mais antigo ao mais recente
  const pres = r.porHora.reduce((s, h) => s + h.presencas, 0);
  const falt = r.porHora.reduce((s, h) => s + h.faltas, 0);
  const canc = r.porHora.reduce((s, h) => s + h.cancelamentos, 0);
  const maxHora = Math.max(1, ...r.porHora.map(h => h.presencas + h.faltas + h.cancelamentos));
  const inad = r.ativos ? Math.round((r.pendentes / r.ativos) * 100) : 0;
  const ultimo = fluxo.at(-1);

  return (
    <div className="stack">
      <Cabecalho rotulo="Relatórios" titulo="Visão geral do studio" sub="Faturamento, frequência e inadimplência a partir dos registros do sistema." />
      <div className="indicadores">
        <Indicador rotulo="Alunos ativos" valor={r.ativos} icone="users" />
        <Indicador rotulo={ultimo ? `Faturamento ${mesBr(ultimo.mes)}` : "Faturamento"} valor={reais(ultimo?.entradas ?? 0)} icone="cash"
          ajuda={ultimo ? `Saldo ${reais(ultimo.entradas - ultimo.saidas)}` : undefined} />
        <Indicador rotulo="Mensalidades em aberto" valor={r.pendentes} icone="clock" tom="alerta" ajuda={`${inad}% dos alunos ativos`} />
        <Indicador rotulo="Pré-matrículas sem atendimento" valor={r.preMatriculasAbertas} icone="inbox" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-cab"><h2>Faturamento: entradas e saídas</h2><span className="spacer" />
            <span className="legenda-graf"><span><i style={{ background: VERDE }} />Entradas</span><span><i style={{ background: VERMELHO }} />Saídas</span></span></div>
          {fluxo.length ? <GraficoFluxo dados={fluxo} /> : <p className="muted">Sem lançamentos no caixa.</p>}
          <p className="muted small" style={{ marginBottom: 0 }}>Últimos {fluxo.length} meses com lançamentos, em reais.</p>
        </div>
        <div className="card">
          <div className="card-cab"><h2>Frequência das aulas realizadas</h2></div>
          <Rosca partes={[{ rotulo: "Presenças", valor: pres, cor: VERDE }, { rotulo: "Faltas", valor: falt, cor: AMARELO }, { rotulo: "Cancelamentos", valor: canc, cor: CINZA }]} />
          <div style={{ marginTop: 22 }}>
            <div className="row small" style={{ marginBottom: 6 }}><strong>Inadimplência</strong><span className="spacer" /><span>{r.pendentes} mensalidade(s) em aberto · {inad}%</span></div>
            <div className="barra"><div className="trilho"><div className="valor" style={{ width: `${Math.min(100, inad)}%`, background: inad > 20 ? VERMELHO : AMARELO }} /></div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-cab"><h2>Ocupação por horário</h2><span className="spacer" />
          <span className="legenda-graf"><span><i style={{ background: VERDE }} />Presenças</span><span><i style={{ background: AMARELO }} />Faltas</span><span><i style={{ background: CINZA }} />Cancel.</span></span></div>
        {!r.porHora.length && <p className="muted">Nenhuma aula realizada ainda.</p>}
        <div className="stack">
          {r.porHora.map(h => (
            <div key={h.hora} className="barra">
              <span style={{ width: 44, fontWeight: 600 }}>{horaCurta(h.hora)}</span>
              <div className="trilho" style={{ height: 14 }}>
                <div className="valor" style={{ width: `${(h.presencas / maxHora) * 100}%`, background: VERDE }} />
                <div className="valor" style={{ width: `${(h.faltas / maxHora) * 100}%`, background: AMARELO }} />
                <div className="valor" style={{ width: `${(h.cancelamentos / maxHora) * 100}%`, background: CINZA }} />
              </div>
              <span className="muted" style={{ width: 110, textAlign: "right" }}>{h.presencas} · {h.faltas} · {h.cancelamentos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
