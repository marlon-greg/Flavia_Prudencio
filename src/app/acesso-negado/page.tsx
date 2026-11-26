import Link from "next/link";
import { Marca } from "@/components/Topo";

export default function AcessoNegado() {
  return (
    <main className="tela-login">
      <div className="card stack">
        <Marca />
        <span className="rotulo" style={{ marginTop: 20 }}>Permissão</span>
        <h1 style={{ fontSize: "1.5rem" }}>Acesso negado</h1>
        <p className="muted">O seu perfil não tem permissão para abrir esta página.</p>
        <Link className="btn sec bloco" href="/login">Voltar</Link>
      </div>
    </main>
  );
}
