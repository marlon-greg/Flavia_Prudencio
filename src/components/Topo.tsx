import Link from "next/link";
import { acaoSair } from "@/app/acoes";

export function Marca() {
  return (
    <Link href="/" className="marca"><span className="fp">FP</span><span>Flávia Prudêncio</span></Link>
  );
}

export function Topo({ links, nome }: { links: { href: string; rotulo: string }[]; nome?: string }) {
  return (
    <header className="topo">
      <div className="container">
        <Marca />
        <nav>{links.map(l => <Link key={l.href} href={l.href}>{l.rotulo}</Link>)}</nav>
        <span className="spacer" />
        {nome && (
          <form action={acaoSair} className="row">
            <span className="usuario">{nome}</span>
            <button className="btn sec peq">Sair</button>
          </form>
        )}
      </div>
    </header>
  );
}
