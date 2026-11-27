import Link from "next/link";
import { acaoSair } from "@/app/acoes";
import { Icone } from "./Icone";
import { Menu, type ItemMenu } from "./Menu";

export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <Link href="/" className={`marca ${claro ? "clara" : ""}`}>
      <span className="fp">FP</span>
      <span><span className="marca-nome">Flávia Prudêncio</span><span className="marca-sub">Fisio · Pilates</span></span>
    </Link>
  );
}

export const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

/** Estrutura das áreas logadas: menu lateral no computador; no celular, barra no topo e abas. */
export function Estrutura({ tema, nome, detalhe, itens, extras, children }: {
  tema: "claro" | "escuro"; nome: string; detalhe: string; itens: ItemMenu[];
  extras?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`app tema-${tema}`}>
      <aside className="lateral">
        <Marca claro={tema === "escuro"} />
        <div className="cartao-usuario">
          <span className="avatar">{iniciais(nome)}</span>
          <span><strong>{nome}</strong><span>{detalhe}</span></span>
        </div>
        <Menu itens={itens} />
        <div className="lateral-rodape">
          {extras}
          <Link className="link-lateral" href="/conta/senha"><Icone nome="badge" tam={16} /> Trocar senha</Link>
          <form action={acaoSair}>
            <button className="link-lateral"><Icone nome="logout" tam={16} /> Sair</button>
          </form>
        </div>
      </aside>
      <main className="conteudo">
        <div className="barra-guia"><Link href="/conta/guia" className="btn contorno peq"><Icone nome="file" tam={14} /> Como testar</Link></div>
        {children}
      </main>
    </div>
  );
}

/** Cabeçalho de página no estilo do protótipo: rótulo pequeno, título e ações à direita. */
export function Cabecalho({ rotulo, titulo, sub, children }: { rotulo?: string; titulo: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="cabecalho">
      <div>
        {rotulo && <span className="rotulo">{rotulo}</span>}
        <h1>{titulo}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="cabecalho-acoes">{children}</div>}
    </header>
  );
}

export function Indicador({ rotulo, valor, icone, tom, ajuda }: { rotulo: string; valor: React.ReactNode; icone: string; tom?: "alerta" | "perigo" | "verde"; ajuda?: React.ReactNode }) {
  return (
    <div className={`card indicador ${tom ?? ""}`}>
      <div className="indicador-topo"><span className="rotulo-cx">{rotulo}</span><span className="indicador-icone"><Icone nome={icone} tam={15} /></span></div>
      <div className="kpi">{valor}</div>
      {ajuda && <div className="muted small">{ajuda}</div>}
    </div>
  );
}
