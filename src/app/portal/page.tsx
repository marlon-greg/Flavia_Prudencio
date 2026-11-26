import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses, aulas as aulasT, horarios, matriculas, pagamentos, planos, reservas } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { aulasDoAluno, hojeLocal, ocupacao } from "@/lib/servicos";
import { Icone } from "@/components/Icone";
import { AulaLinha, horaBr } from "./comum";
import { dataBr, dataCurta, dataExtenso, linkWhats, mesBr, nomeDia, nomePlano, reais } from "@/lib/util";


export default async function Portal({ searchParams }: { searchParams: Promise<{ ok?: string; data?: string }> }) {
  const sp = await searchParams;
  const { aluno } = await alunoDaSessao();
  const db = await getDb();
  const agora = new Date();
  const hoje = hojeLocal(agora);
  const [plano] = aluno.planoId ? await db.select().from(planos).where(eq(planos.id, aluno.planoId)) : [];
  const [anamnese] = await db.select({ id: anamneses.id }).from(anamneses).where(eq(anamneses.alunoId, aluno.id));
  const fixos = await db.select({ dia: horarios.diaSemana, hora: horarios.hora }).from(matriculas)
    .innerJoin(horarios, eq(matriculas.horarioId, horarios.id))
    .where(and(eq(matriculas.alunoId, aluno.id), eq(matriculas.ativa, true)));
  const aulas = await aulasDoAluno(db, aluno.id, agora);
  const proximas = aulas.filter(a => a.inicio > agora);
  const passadas = aulas.filter(a => a.inicio <= agora).reverse();
  const faltasMes = passadas.filter(a => a.status === "ativa" && a.falta && a.data.startsWith(hoje.slice(0, 7))).length;
  const canceladas = aulas.filter(a => a.status === "cancelada" && a.data.startsWith(hoje.slice(0, 7))).length;
  const [aberto] = await db.select().from(pagamentos)
    .where(and(eq(pagamentos.alunoId, aluno.id), isNull(pagamentos.pagoEm))).orderBy(asc(pagamentos.vencimento)).limit(1);

  // Próxima aula e a ocupação da turma dela
  const prox = proximas.find(a => a.status === "ativa");
  let ocupados = 0, capacidade = 4;
  if (prox) {
    const [r] = await db.select({ aulaId: reservas.aulaId, cap: horarios.capacidade }).from(reservas)
      .innerJoin(aulasT, eq(reservas.aulaId, aulasT.id)).innerJoin(horarios, eq(aulasT.horarioId, horarios.id))
      .where(eq(reservas.id, prox.id));
    ocupados = await ocupacao(db, r.aulaId);
    capacidade = r.cap;
  }
  const whats = linkWhats(`Olá! Sou ${aluno.nome}, aluno(a) do studio.`);

  return (
    <div className="stack">
      <header className="cabecalho">
        <div>
          <span className="muted small">{dataExtenso(hoje)}</span>
          <h1 className="ola"><span>Olá,</span> {aluno.nome.split(" ")[0]}</h1>
        </div>
      </header>

      {sp.ok === "reposicao" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") && (
        <div className="msg ok" role="status">Reposição marcada para {dataCurta(sp.data!)}.</div>
      )}
      {sp.ok === "cancelada" && (
        <div className="msg ok" role="status">Aula cancelada. Você pode marcar uma <Link href="/portal/reposicao">reposição</Link>.</div>
      )}

      <div className="portal-grid">
        <div className="stack">
          {!anamnese && (
            <div className="faixa">
              <span className="icone-cx"><Icone nome="file" tam={20} /></span>
              <div><strong>Complete sua anamnese</strong><span>Obrigatória antes de agendar aulas e reposições. Leva cerca de 5 minutos.</span></div>
              <Link className="btn branco peq" href="/portal/anamnese">Preencher <Icone nome="arrow_right" tam={14} /></Link>
            </div>
          )}

          <div className="card proxima">
            {prox ? (
              <div className="proxima-corpo">
                <div>
                  <span className="rotulo">Sua próxima aula</span>
                  <div className="muted">{dataCurta(prox.data)}{prox.tipo === "reposicao" ? " · reposição" : ""}</div>
                  <div className="hora-grande">{horaBr(prox.hora)}</div>
                  <div className="muted small" style={{ marginBottom: 14 }}>Pilates · turma de até {capacidade} alunos</div>
                  <div className="row">
                    <Link className="btn sec peq" href="/portal/reposicao"><Icone nome="refresh" tam={14} /> Remarcar</Link>
                    <a className="btn perigo-leve peq" href={`#aula-${prox.id}`}>Desmarcar</a>
                  </div>
                </div>
                <div className="turma">
                  <span className="rotulo-cx" style={{ color: "var(--green-700)" }}>Sua turma</span>
                  <div className="bolinhas">
                    {Array.from({ length: capacidade }).map((_, i) => <span key={i} className={i < ocupados ? "cheia" : ""} />)}
                  </div>
                  <div className="muted small">{ocupados} {ocupados === 1 ? "lugar ocupado" : "lugares ocupados"}, {Math.max(0, capacidade - ocupados)} livre(s)</div>
                </div>
              </div>
            ) : (
              <div>
                <span className="rotulo">Sua próxima aula</span>
                <p className="muted">Nenhuma aula nos próximos 14 dias. <Link href="/portal/reposicao">Agendar uma reposição</Link></p>
              </div>
            )}
          </div>

          <div className="contadores">
            <Link href="/portal/aulas?aba=anteriores" className="contador amarelo">
              <span className="rotulo-cx">Faltas no mês</span>
              <div className="valor">{faltasMes}</div>
              <div className="muted small">Registradas pela recepção</div>
            </Link>
            <Link href="/portal/reposicao" className="contador verde">
              <span className="rotulo-cx">Cancelamentos no mês</span>
              <div className="valor">{canceladas}</div>
              <div className="muted small">Remarque pela reposição</div>
            </Link>
          </div>

          <div className="card">
            <div className="card-cab"><h2>Atalhos</h2><span className="spacer" /><span className="muted small">Tudo o que você usa no dia a dia</span></div>
            <div className="atalhos">
              <Link className="atalho" href="/portal/reposicao"><span className="icone-cx"><Icone nome="plus" /></span>Agendar reposição</Link>
              <Link className="atalho" href="/portal/aulas"><span className="icone-cx"><Icone nome="calendar" /></span>Minhas aulas</Link>
              <Link className="atalho" href="/portal/plano"><span className="icone-cx"><Icone nome="cash" /></span>Pagamentos</Link>
              <a className="atalho whats" href={whats} target="_blank" rel="noopener"><span className="icone-cx"><Icone nome="whatsapp" /></span>Falar com o studio</a>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card plano-atual">
            <div className="row">
              <span className="rotulo-cx">Plano atual</span><span className="spacer" />
              {aberto && aberto.vencimento < hoje
                ? <span className="tag falta ponto">Em atraso</span>
                : <span className="tag ponto" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>Em dia</span>}
            </div>
            <div className="nome-plano">{nomePlano(plano)}</div>
            <div className="divisor">
              <div><span className="rotulo-cx">Valor</span><div>{plano ? `${reais(plano.precoCentavos)}${plano.modalidade === "Fisioterapia" ? "/sessão" : "/mês"}` : "—"}</div></div>
              <div><span className="rotulo-cx">Horários fixos</span>
                <div>{fixos.length ? fixos.map(f => `${nomeDia(f.dia).slice(0, 3)} ${horaBr(f.hora)}`).join(" · ") : "Sem horário fixo"}</div></div>
            </div>
          </div>

          <div className="card">
            <div className="card-cab"><h2>Próximas aulas</h2><span className="spacer" /><Link className="small" href="/portal/aulas">Ver todas →</Link></div>
            <div className="lista-aulas">
              {!proximas.length && <p className="muted">Nenhuma aula nos próximos 14 dias.</p>}
              {proximas.slice(0, 6).map(a => <AulaLinha key={a.id} aula={a} agora={agora} />)}
            </div>
          </div>

          <div className="card">
            <div className="card-cab"><h2>Últimas aulas</h2><span className="spacer" /><Link className="small" href="/portal/aulas?aba=anteriores">Histórico →</Link></div>
            <div className="lista-aulas">
              {!passadas.length && <p className="muted">Nenhuma aula registrada.</p>}
              {passadas.slice(0, 4).map(a => <AulaLinha key={a.id} aula={a} agora={agora} />)}
            </div>
          </div>

          <div className="card suave">
            <span className="rotulo-cx" style={{ color: "var(--green-700)" }}>Próximo pagamento</span>
            {aberto ? (
              <>
                <div className="row" style={{ marginTop: 8 }}>
                  <span className="kpi" style={{ margin: 0, fontSize: "1.5rem" }}>{reais(aberto.valorCentavos)}</span><span className="spacer" />
                  <span className="muted small">vence {dataBr(aberto.vencimento)}</span>
                </div>
                <p className="muted small" style={{ marginBottom: 0 }}>Mensalidade de {mesBr(aberto.referencia)}. Pague na recepção ou combine pelo WhatsApp.</p>
              </>
            ) : <p className="muted small" style={{ marginBottom: 0 }}>Nenhuma mensalidade em aberto.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
