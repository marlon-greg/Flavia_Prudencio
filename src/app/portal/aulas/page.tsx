import Link from "next/link";
import { alunoDaSessao } from "@/lib/auth";
import { getDb } from "@/db";
import { aulasDoAluno, ANTECEDENCIA_MINIMA_MIN } from "@/lib/servicos";
import { Cabecalho } from "@/components/Topo";
import { AulaLinha } from "../comum";

const ABAS = [["proximas", "Próximas"], ["anteriores", "Anteriores"], ["canceladas", "Canceladas"]] as const;

export default async function MinhasAulas({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sp = await searchParams;
  const aba = ABAS.some(([k]) => k === sp.aba) ? sp.aba! : "proximas";
  const { aluno } = await alunoDaSessao();
  const agora = new Date();
  const aulas = await aulasDoAluno(await getDb(), aluno.id, agora);
  const lista = aba === "proximas" ? aulas.filter(a => a.inicio > agora && a.status === "ativa")
    : aba === "anteriores" ? aulas.filter(a => a.inicio <= agora && a.status === "ativa").reverse()
    : aulas.filter(a => a.status === "cancelada").reverse();
  const passadas = aulas.filter(a => a.inicio <= agora && a.status === "ativa");
  const faltas = passadas.filter(a => a.falta).length;

  return (
    <div>
      <Cabecalho rotulo="Minhas aulas" titulo="Agenda e histórico" sub="Próximos 14 dias e últimos 60 dias." />
      <div className="indicadores" style={{ marginBottom: 18 }}>
        <div className="card indicador"><span className="rotulo-cx">Próximas</span><div className="kpi">{aulas.filter(a => a.inicio > agora && a.status === "ativa").length}</div></div>
        <div className="card indicador"><span className="rotulo-cx">Presenças</span><div className="kpi">{passadas.length - faltas}</div></div>
        <div className="card indicador alerta"><span className="rotulo-cx">Faltas</span><div className="kpi">{faltas}</div></div>
        <div className="card indicador"><span className="rotulo-cx">Canceladas</span><div className="kpi">{aulas.filter(a => a.status === "cancelada").length}</div></div>
      </div>
      <nav className="abas" aria-label="Filtro das aulas">
        {ABAS.map(([k, r]) => <Link key={k} href={`/portal/aulas?aba=${k}`} className={aba === k ? "ativa" : ""}>{r}</Link>)}
      </nav>
      <div className="card">
        {aba === "proximas" && <p className="muted small" style={{ marginTop: 0 }}>
          Cancelamentos com menos de {ANTECEDENCIA_MINIMA_MIN} minutos de antecedência só são aceitos com atestado.</p>}
        <div className="lista-aulas">
          {!lista.length && <p className="muted">Nenhuma aula nesta lista.</p>}
          {lista.map(a => <AulaLinha key={a.id} aula={a} agora={agora} />)}
        </div>
      </div>
    </div>
  );
}
