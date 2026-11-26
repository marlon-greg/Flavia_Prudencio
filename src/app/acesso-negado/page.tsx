import Link from "next/link";
import { Topo } from "@/components/Topo";

export default function AcessoNegado() {
  return (
    <>
      <Topo links={[{ href: "/", rotulo: "Site" }]} />
      <main className="container pagina" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <h1 style={{ fontSize: "1.5rem" }}>Acesso negado</h1>
          <p>O seu perfil não tem permissão para abrir esta página.</p>
          <Link className="btn sec" href="/login">Voltar</Link>
        </div>
      </main>
    </>
  );
}
