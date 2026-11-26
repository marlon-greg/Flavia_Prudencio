import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses, horarios, matriculas, pagamentos, planos } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { aulasDoAluno, ANTECEDENCIA_MINIMA_MIN } from "@/lib/servicos";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoCancelar } from "../acoes";
import { dataCurta, linkWhats, mesBr, nomeDia, nomePlano, reais } from "@/lib/util";

export default async function Portal({ searchParams }: { searchParams: Promise<{ ok?: string; data?: string }> }) {
  const sp = await searchParams;
  const { aluno } = await alunoDaSessao();
  const db = await getDb();
  const agora = new Date();
  const [plano] = aluno.planoId ? await db.select().from(planos).where(eq(planos.id, aluno.planoId)) : [];
  const [anamnese] = await db.select({ id: anamneses.id }).from(anamneses).where(eq(anamneses.alunoId, aluno.id));
  const fixos = await db.select({ dia: horarios.diaSemana, hora: horarios.hora }).from(matriculas)
    .innerJoin(horarios, eq(matriculas.horarioId, horarios.id))
    .where(and(eq(matriculas.alunoId, aluno.id), eq(matriculas.ativa, true)));
  const aulas = await aulasDoAluno(db, aluno.id, agora);
  const proximas = aulas.filter(a => a.inicio > agora);
  const passadas = aulas.filter(a => a.inicio <= agora && a.status === "ativa").reverse();
  const faltas = passadas.filter(a => a.falta).length;
  const pags = await db.select().from(pagamentos).where(eq(pagamentos.alunoId, aluno.id)).orderBy(desc(pagamentos.referencia)).limit(6);

  return (
    <div className="stack">
      <h1>Olá, {aluno.nome.split(" ")[0]}</h1>
      {sp.ok === "reposicao" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") && (
        <div className="msg ok" role="status">Reposição marcada para {dataCurta(sp.data!)}.</div>
      )}
      {sp.ok === "cancelada" && (
        <div className="msg ok" role="status">Aula cancelada. Você pode marcar uma <Link href="/portal/reposicao">reposição</Link>.</div>
      )}
      {!anamnese && (
        <div className="msg aviso">
          Você ainda não preencheu a anamnese. Sem ela não é possível agendar aulas nem reposições.{" "}
          <Link href="/portal/anamnese">Preencher agora</Link>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <div className="muted small">Meu plano</div>
          <div className="kpi" style={{ fontSize: "1.3rem" }}>{nomePlano(plano)}</div>
          {plano && <div className="muted">{reais(plano.precoCentavos)}{plano.modalidade === "Fisioterapia" ? " por sessão" : " por mês"}</div>}
          <div className="small" style={{ marginTop: 8 }}>
            {fixos.length ? fixos.map(f => `${nomeDia(f.dia)} ${f.hora}`).join(" · ") : "Sem horário fixo"}
          </div>
        </div>
        <div className="card">
          <div className="muted small">Faltas nos últimos 60 dias</div>
          <div className="kpi">{faltas}</div>
          <div className="muted small">Registradas pela recepção</div>
        </div>
        <div className="card stack">
          <div className="muted small">Dúvidas ou imprevistos?</div>
          <a className="btn whats" target="_blank" rel="noopener"
            href={linkWhats(`Olá! Sou ${aluno.nome}, aluno(a) do studio.`)}>Falar com o studio no WhatsApp</a>
        </div>
      </div>

      <div className="card">
        <h2>Próximas aulas</h2>
        <p className="muted small">
          Cancelamentos com menos de {ANTECEDENCIA_MINIMA_MIN} minutos de antecedência só são aceitos com atestado.
        </p>
        {!proximas.length && <p className="muted">Nenhuma aula nos próximos 14 dias.</p>}
        {proximas.map(a => {
          const min = Math.floor((a.inicio.getTime() - agora.getTime()) / 60000);
          return (
            <div key={a.id} className="lugar" style={{ flexWrap: "wrap" }}>
              <span className="nome"><strong>{dataCurta(a.data)}</strong> às {a.hora}</span>
              {a.tipo === "reposicao" && <span className="tag repo">Reposição</span>}
              {a.status === "cancelada" ? <span className="tag cancelada">Cancelada{a.atestadoNome ? " (atestado)" : ""}</span> : (
                <details style={{ width: "100%" }}>
                  <summary className="small" style={{ cursor: "pointer", color: "var(--danger)" }}>Cancelar esta aula</summary>
                  <AcaoForm acao={acaoCancelar}>
                    <input type="hidden" name="reservaId" value={a.id} />
                    {min < ANTECEDENCIA_MINIMA_MIN && <div className="msg aviso">Faltam {min} minutos: anexe o atestado.</div>}
                    <label>Motivo<input name="motivo" /></label>
                    <label>Atestado (PDF, JPG ou PNG, até 2 MB)<input name="atestado" type="file" accept=".pdf,image/*" /></label>
                    <button className="btn perigo peq">Confirmar cancelamento</button>
                  </AcaoForm>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Aulas anteriores</h2>
          {!passadas.length && <p className="muted">Nenhuma aula registrada.</p>}
          {passadas.slice(0, 12).map(a => (
            <div key={a.id} className="lugar">
              <span className="nome">{dataCurta(a.data)} às {a.hora}</span>
              {a.falta ? <span className="tag falta">Falta</span> : <span className="tag">Presente</span>}
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Pagamentos</h2>
          {!pags.length && <p className="muted">Nenhuma cobrança.</p>}
          {pags.map(p => (
            <div key={p.id} className="lugar">
              <span className="nome">{mesBr(p.referencia)} · {reais(p.valorCentavos)}</span>
              {p.pagoEm ? <span className="tag">Pago</span> : <span className="tag pend">Em aberto</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
