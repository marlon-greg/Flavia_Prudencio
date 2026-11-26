import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { planos } from "@/db/schema";
import { Topo } from "@/components/Topo";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoPreMatricula } from "./acoes";
import { linkWhats, reais } from "@/lib/util";

export const dynamic = "force-dynamic";

const ORDEM = ["Mensal", "Trimestral", "Semestral", "Fisioterapia"];
const SUB: Record<string, string> = {
  Mensal: "Sem fidelidade", Trimestral: "Pagamento a cada 3 meses", Semestral: "Pagamento a cada 6 meses", Fisioterapia: "Sessão individual",
};

export default async function Home() {
  const db = await getDb();
  const lista = await db.select().from(planos).orderBy(asc(planos.aulasSemana)); // RF01: valores vêm do banco
  const grupos = ORDEM.map(m => ({ m, itens: lista.filter(p => p.modalidade === m) })).filter(g => g.itens.length);
  const whats = linkWhats("Olá! Vi o site e gostaria de saber mais sobre as aulas.");

  return (
    <>
      <Topo links={[{ href: "#planos", rotulo: "Planos" }, { href: "#matricula", rotulo: "Pré-matrícula" }, { href: "/login", rotulo: "Entrar" }]} />
      <section className="hero">
        <div className="container stack">
          <span className="tag">Fisioterapia · Pilates · Indaiatuba</span>
          <h1>Movimento com cuidado, em turmas de até 4 alunos</h1>
          <p>Aulas de Pilates com acompanhamento de fisioterapeuta e sessões individuais de fisioterapia.</p>
          <div className="row">
            <a className="btn sec" href="#matricula">Quero me matricular</a>
            <a className="btn whats" href={whats} target="_blank" rel="noopener">Falar no WhatsApp</a>
          </div>
        </div>
      </section>

      <section id="planos" className="secao">
        <div className="container">
          <h2>Planos e valores</h2>
          <p className="muted">Valores mensais por frequência semanal.</p>
          <div className="planos">
            {grupos.map(g => (
              <div key={g.m} className={`card plano ${g.m === "Fisioterapia" ? "destaque" : ""}`}>
                <h3>{g.m}</h3>
                <div className="muted small">{SUB[g.m]}</div>
                <ul>
                  {g.itens.map(p => (
                    <li key={p.id}>
                      <span>{g.m === "Fisioterapia" ? "Por sessão" : `${p.aulasSemana}x por semana`}</span>
                      <strong>{reais(p.precoCentavos)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!grupos.length && <p className="muted">Nenhum plano cadastrado.</p>}
          </div>
        </div>
      </section>

      <section id="matricula" className="secao" style={{ background: "var(--teal-50)" }}>
        <div className="container grid-2">
          <div>
            <h2>Pré-matrícula</h2>
            <p className="muted">Deixe seus dados e o studio entra em contato para combinar o horário e a avaliação inicial.</p>
          </div>
          <div className="card">
            <AcaoForm acao={acaoPreMatricula}>
              <div className="campos">
                <label>Nome completo<input name="nome" required autoComplete="name" /></label>
                <label>Telefone (com DDD)<input name="telefone" required inputMode="tel" placeholder="(19) 99999-0000" /></label>
              </div>
              <label>E-mail<input name="email" type="email" autoComplete="email" /></label>
              <label>Interesse
                <select name="interesse" defaultValue="Pilates">
                  <option>Pilates</option><option>Fisioterapia</option><option>Ainda não sei</option>
                </select>
              </label>
              <label>Mensagem<textarea name="mensagem" placeholder="Algum horário de preferência ou restrição de saúde?" /></label>
              <button className="btn">Enviar pré-matrícula</button>
            </AcaoForm>
          </div>
        </div>
      </section>

      <footer className="rodape">
        <div className="container row">
          <span>Studio Flávia Prudêncio · Fisioterapia e Pilates · Indaiatuba/SP</span>
          <span className="spacer" />
          <Link href="/login" style={{ color: "var(--teal-200)" }}>Área do aluno e equipe</Link>
        </div>
      </footer>
      <a className="btn whats whats-flutuante" href={whats} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">WhatsApp</a>
    </>
  );
}
