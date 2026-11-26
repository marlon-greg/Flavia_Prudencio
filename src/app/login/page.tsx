import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoLogin } from "../acoes";
import { lerSessao, destinoDoPerfil } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Login() {
  const s = await lerSessao();
  if (s) redirect(destinoDoPerfil(s.perfil));
  return (
    <main className="tela-login">
      <div className="card">
        <Marca />
        <span className="rotulo" style={{ marginTop: 26 }}>Acesso ao sistema</span>
        <h1 style={{ fontSize: "1.65rem", marginBottom: 6 }}>Entrar</h1>
        <p className="muted small" style={{ marginTop: 0 }}>Alunos, recepção e proprietária usam o mesmo acesso.</p>
        <AcaoForm acao={acaoLogin} limpar={false}>
          <label>E-mail<input name="email" type="email" required autoComplete="username" placeholder="seu@email.com" /></label>
          <label>Senha<input name="senha" type="password" required autoComplete="current-password" placeholder="••••••••" /></label>
          <button className="btn bloco">Entrar <Icone nome="arrow_right" tam={16} /></button>
        </AcaoForm>
        <Link href="/" className="btn contorno peq bloco" style={{ marginTop: 12 }}><Icone nome="chev_left" tam={14} /> Voltar para o site</Link>
      </div>
    </main>
  );
}
