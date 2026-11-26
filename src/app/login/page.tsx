import { redirect } from "next/navigation";
import { Topo } from "@/components/Topo";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoLogin } from "../acoes";
import { lerSessao, destinoDoPerfil } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Login() {
  const s = await lerSessao();
  if (s) redirect(destinoDoPerfil(s.perfil));
  return (
    <>
      <Topo links={[{ href: "/", rotulo: "Site" }]} />
      <main className="container pagina" style={{ maxWidth: 420 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.5rem" }}>Entrar</h1>
          <p className="muted small">Alunos, recepção e proprietária usam o mesmo acesso.</p>
          <AcaoForm acao={acaoLogin} limpar={false}>
            <label>E-mail<input name="email" type="email" required autoComplete="username" /></label>
            <label>Senha<input name="senha" type="password" required autoComplete="current-password" /></label>
            <button className="btn" style={{ width: "100%" }}>Entrar</button>
          </AcaoForm>
        </div>
      </main>
    </>
  );
}
