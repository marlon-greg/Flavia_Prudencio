import Link from "next/link";
import { CampoEmail, CampoTelefone } from "@/components/Campos";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { planos } from "@/db/schema";
import { Marca } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoPreMatricula } from "./acoes";
import { WHATSAPP, linkWhats, reais } from "@/lib/util";

export const dynamic = "force-dynamic";

const ORDEM = ["Mensal", "Trimestral", "Semestral", "Fisioterapia"];
const SUB: Record<string, string> = {
  Mensal: "Sem fidelidade", Trimestral: "Pagamento a cada 3 meses", Semestral: "Pagamento a cada 6 meses", Fisioterapia: "Sessão individual",
};

/** "R$ 220,00" com o símbolo e os centavos menores, como nos cartões do protótipo. */
function Preco({ centavos }: { centavos: number }) {
  const t = reais(centavos).replace(/ /g, " ");
  const [simbolo, resto] = [t.slice(0, t.indexOf(" ")), t.slice(t.indexOf(" ") + 1)];
  const [inteiro, cent] = resto.split(",");
  return <strong><small style={{ fontSize: ".6em", fontWeight: 500 }}>{simbolo}&nbsp;</small>{inteiro}<small style={{ fontSize: ".6em", fontWeight: 500 }}>,{cent}</small></strong>;
}

const telefoneBr = (n: string) => {
  const d = n.replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : n;
};

export default async function Home() {
  const db = await getDb();
  const lista = await db.select().from(planos).orderBy(asc(planos.aulasSemana)); // RF01: valores vêm do banco
  const grupos = ORDEM.map(m => ({ m, itens: lista.filter(p => p.modalidade === m) })).filter(g => g.itens.length);
  const whats = linkWhats("Olá! Vi o site e gostaria de saber mais sobre as aulas.");

  return (
    <>
      <header className="site-nav">
        <div className="container">
          <Marca />
          <nav>
            <a href="#metodo">Método</a>
            <a href="#planos">Planos</a>
            <a href="#contato">Contato</a>
            <Link href="/login">Entrar</Link>
            <a className="btn peq" href="#matricula">Agende sua avaliação</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div>
            <span className="rotulo">Fisioterapia · Pilates clínico</span>
            <h1>Bem-estar <em>que começa</em> no movimento certo.</h1>
            <p className="lead">
              Atendimento individualizado em turmas de até 4 alunos por horário. Avaliação antes da primeira
              aula, com acompanhamento de fisioterapeuta: você sai com um plano claro.
            </p>
            <div className="row">
              <a className="btn" href="#matricula">Agende sua avaliação <Icone nome="arrow_right" tam={16} /></a>
              <a className="btn contorno" href="#planos">Ver planos</a>
            </div>
            <div className="numeros">
              <div><strong>4</strong><span>alunos por horário, no máximo</span></div>
              <div><strong>12</strong><span>horários por dia, de segunda a sexta</span></div>
              <div><strong>1ª</strong><span>aula só depois da avaliação</span></div>
            </div>
          </div>
          <div className="foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/capa.jpg" alt="Sala do studio com luz natural, piso de madeira e plantas" />
            <span className="selo">Atendimento individualizado</span>
            <div className="flutuante">
              <span className="rotulo" style={{ fontSize: ".6rem", marginBottom: 0 }}>Primeira visita</span>
              <strong>Avaliação corporal</strong>
              <span className="muted small">Postura, mobilidade e queixas</span>
            </div>
          </div>
        </div>
      </section>

      <section id="metodo" className="secao" style={{ background: "var(--teal-50)" }}>
        <div className="container">
          <div className="secao-cab">
            <div><span className="rotulo">Método</span><h2>Cuidado clínico, conduzido com calma.</h2></div>
          </div>
          <div className="pilares">
            {[
              ["leaf", "Avaliação corporal", "Anamnese completa e histórico de saúde antes da primeira aula."],
              ["users", "Turmas pequenas", "Máximo de 4 alunos por horário: atenção real, não academia em série."],
              ["sparkle", "Progressão guiada", "Cada plano é ajustado conforme a sua evolução e os seus objetivos."],
            ].map(([i, t, d]) => (
              <div key={t} className="card pilar">
                <span className="icone-cx"><Icone nome={i} tam={18} /></span>
                <h3>{t}</h3><p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="secao">
        <div className="container">
          <div className="secao-cab">
            <div><span className="rotulo">Planos &amp; valores</span><h2>Escolha o ritmo que cabe na sua semana.</h2></div>
            <p>Todos os planos incluem avaliação inicial e acompanhamento da fisioterapeuta responsável.</p>
          </div>
          <div className="planos">
            {grupos.map(g => {
              const dest = g.m === "Fisioterapia";
              return (
                <div key={g.m} className={`card plano ${dest ? "destaque" : ""}`}>
                  {dest && <span className="selo-dest">Destaque</span>}
                  <h3>{g.m}</h3>
                  <div className="muted small">{SUB[g.m]}</div>
                  <ul>
                    {g.itens.map(p => (
                      <li key={p.id}>
                        <span>{dest ? "Por sessão" : `${p.aulasSemana}x por semana`}</span>
                        <Preco centavos={p.precoCentavos} />
                      </li>
                    ))}
                  </ul>
                  <a className={`btn bloco ${dest ? "branco" : "sec"}`} href="#matricula">Quero esse plano <Icone nome="arrow_right" tam={14} /></a>
                </div>
              );
            })}
            {!grupos.length && <p className="muted">Nenhum plano cadastrado.</p>}
          </div>
          <p className="muted small" style={{ textAlign: "center", marginTop: 18 }}>
            Valores mensais por frequência semanal. A sessão de fisioterapia é cobrada por atendimento.
          </p>
        </div>
      </section>

      <section className="secao" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="banner">
            <div>
              <span className="rotulo">Primeira visita</span>
              <h2>Comece com uma avaliação corporal.</h2>
              <p>Antes da primeira aula a fisioterapeuta avalia postura, mobilidade e queixas. Você sai com a recomendação certa para o seu corpo.</p>
              <a className="btn branco" href="#matricula">Agende agora <Icone nome="arrow_right" tam={14} /></a>
            </div>
            <div className="passos">
              <div><b>1</b>Pré-matrícula pelo site<small>2 min</small></div>
              <div><b>2</b>Anamnese no portal do aluno<small>5 min</small></div>
              <div><b>3</b>Avaliação e plano sugerido<small>no studio</small></div>
            </div>
          </div>
        </div>
      </section>

      <section id="matricula" className="secao" style={{ background: "var(--teal-50)" }}>
        <div className="container matricula-grid">
          <div id="contato">
            <span className="rotulo">Pré-matrícula &amp; contato</span>
            <h2>Deixe seus dados. O studio entra em contato.</h2>
            <p className="muted">Combinamos com você o melhor horário e a avaliação inicial.</p>
            <div className="contatos">
              <a href={whats} target="_blank" rel="noopener"><Icone nome="whatsapp" tam={17} /> WhatsApp {telefoneBr(WHATSAPP)}</a>
              <span><Icone nome="map" tam={17} /> Indaiatuba / SP</span>
              <span><Icone nome="clock" tam={17} /> Seg a sex: 07h–12h e 15h–22h · Sáb: 08h–11h</span>
            </div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <AcaoForm acao={acaoPreMatricula}>
              <div className="campos">
                <label>Nome completo<input name="nome" required minLength={3} maxLength={80} autoComplete="name" placeholder="Seu nome" /></label>
                <label>Telefone (com DDD)<CampoTelefone name="telefone" required /></label>
              </div>
              <label>E-mail<CampoEmail name="email" /></label>
              <label>Interesse
                <select name="interesse" defaultValue="Pilates">
                  <option>Pilates</option><option>Fisioterapia</option><option>Ainda não sei</option>
                </select>
              </label>
              <label>Mensagem<textarea name="mensagem" maxLength={500} placeholder="Algum horário de preferência ou restrição de saúde?" /></label>
              <button className="btn bloco">Enviar pré-matrícula <Icone nome="arrow_right" tam={16} /></button>
            </AcaoForm>
          </div>
        </div>
      </section>

      <footer className="rodape">
        <div className="container">
          <div className="rodape-grid">
            <div>
              <Marca />
              <p className="muted" style={{ marginTop: 14, maxWidth: 260 }}>Studio de fisioterapia e pilates clínico em Indaiatuba.</p>
            </div>
            <div><h4>Endereço</h4><p>Indaiatuba / SP</p></div>
            <div><h4>Contato</h4><p><a href={whats} target="_blank" rel="noopener">WhatsApp {telefoneBr(WHATSAPP)}</a></p></div>
            <div><h4>Horários</h4><p>Seg a sex</p><p>07h–12h · 15h–22h</p><p className="muted">Sábado · 08h–11h</p></div>
          </div>
          <div className="rodape-fim">
            <span>© {new Date().getFullYear()} Studio Flávia Prudêncio · Fisioterapia e Pilates</span>
            <Link href="/login">Área do aluno e equipe</Link>
          </div>
        </div>
      </footer>
      <a className="btn whats whats-flutuante" href={whats} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
        <Icone nome="whatsapp" tam={18} /> WhatsApp
      </a>
    </>
  );
}
