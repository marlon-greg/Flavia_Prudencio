import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { alunos, anamneses, aulas, horarios, matriculas, pagamentos, planos, reservas } from "@/db/schema";
import { Cabecalho, Indicador, iniciais } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { dataBr, dataCurta, mesBr, nomeDia, nomePlano, reais } from "@/lib/util";

const PERGUNTAS: Record<string, string> = {
  objetivo: "Objetivo", dores: "Dores", cirurgias: "Cirurgias", doencas: "Doenças", medicamentos: "Medicamentos", atividade: "Atividade física",
};

/** Ficha do aluno (somente leitura): dados, anamnese, frequência e pagamentos. */
export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [linha] = await db.select({ a: alunos, p: planos }).from(alunos).leftJoin(planos, eq(alunos.planoId, planos.id)).where(eq(alunos.id, id));
  if (!linha) notFound();
  const { a, p } = linha;
  const [an] = await db.select().from(anamneses).where(eq(anamneses.alunoId, id));
  const fixos = await db.select({ dia: horarios.diaSemana, hora: horarios.hora }).from(matriculas)
    .innerJoin(horarios, eq(matriculas.horarioId, horarios.id)).where(and(eq(matriculas.alunoId, id), eq(matriculas.ativa, true)));
  const hist = await db.select({ id: reservas.id, tipo: reservas.tipo, status: reservas.status, falta: reservas.falta, data: aulas.data, hora: horarios.hora })
    .from(reservas).innerJoin(aulas, eq(reservas.aulaId, aulas.id)).innerJoin(horarios, eq(aulas.horarioId, horarios.id))
    .where(and(eq(reservas.alunoId, id), lte(aulas.inicio, new Date()))).orderBy(desc(aulas.inicio)).limit(20);
  const pags = await db.select().from(pagamentos).where(eq(pagamentos.alunoId, id)).orderBy(desc(pagamentos.referencia)).limit(6);
  const realizadas = hist.filter(h => h.status === "ativa");
  const faltas = realizadas.filter(h => h.falta).length;
  const resp = (an?.respostas ?? {}) as Record<string, string>;

  return (
    <div className="stack">
      <Link href="/admin/alunos" className="small" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icone nome="chev_left" tam={14} /> Alunos</Link>
      <Cabecalho rotulo="Ficha do aluno" titulo={<span className="pessoa"><span className="avatar">{iniciais(a.nome)}</span>{a.nome}</span>}
        sub={`${a.telefone}${a.email ? ` · ${a.email}` : ""}`}>
        <a className="btn whats peq" target="_blank" rel="noopener" href={`https://wa.me/55${a.telefone.replace(/\D/g, "")}`}>
          <Icone nome="whatsapp" tam={14} /> WhatsApp</a>
      </Cabecalho>
      <div className="indicadores">
        <Indicador rotulo="Plano" valor={<span style={{ fontSize: "1.05rem" }}>{nomePlano(p)}</span>} icone="cash" ajuda={p ? reais(p.precoCentavos) : undefined} />
        <Indicador rotulo="Presenças (últimas 20)" valor={realizadas.length - faltas} icone="check" />
        <Indicador rotulo="Faltas (últimas 20)" valor={faltas} icone="info" tom="alerta" />
        <Indicador rotulo="Horários fixos" valor={fixos.length} icone="calendar"
          ajuda={fixos.map(f => `${nomeDia(f.dia).slice(0, 3)} ${f.hora}`).join(" · ") || "Nenhum"} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-cab"><h2>Anamnese</h2><span className="spacer" />
            {an ? <span className="tag ponto">Preenchida em {an.criadoEm.toLocaleDateString("pt-BR")}</span> : <span className="tag pend ponto">Pendente</span>}</div>
          {an ? Object.entries(PERGUNTAS).map(([k, r]) => (
            <div key={k} className="lugar"><span className="muted small" style={{ width: 120, flexShrink: 0 }}>{r}</span><span className="nome">{resp[k] || "—"}</span></div>
          )) : <p className="muted">O aluno ainda não preencheu a anamnese no portal.</p>}
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-cab"><h2>Frequência recente</h2></div>
            {!hist.length && <p className="muted">Nenhuma aula realizada.</p>}
            <div className="lista-aulas">
              {hist.slice(0, 8).map(h => (
                <div key={h.id} className={`aula-linha ${h.tipo === "reposicao" ? "repo" : ""} ${h.status === "cancelada" ? "off" : ""}`}>
                  <span className="quando">{dataCurta(h.data)}<strong>{h.hora}</strong></span>
                  {h.status === "cancelada" ? <span className="tag cancelada">Cancelou</span> : h.falta ? <span className="tag falta">Falta</span> : <span className="tag">Presente</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-cab"><h2>Pagamentos</h2></div>
            {!pags.length && <p className="muted">Nenhuma cobrança.</p>}
            {pags.map(x => (
              <div key={x.id} className="lugar">
                <span className="nome">{mesBr(x.referencia)} · {reais(x.valorCentavos)}</span>
                {x.pagoEm ? <span className="tag">Pago{x.forma ? ` · ${x.forma}` : ""}</span> : <span className="tag pend">Vence {dataBr(x.vencimento)}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
