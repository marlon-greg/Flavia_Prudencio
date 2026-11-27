import Link from "next/link";
import { Marca } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { AcaoForm } from "@/components/AcaoForm";
import { CampoSenha } from "@/components/Campos";
import { exigirPerfil, destinoDoPerfil } from "@/lib/auth";
import { acaoTrocarSenha } from "../../acoes";

export const dynamic = "force-dynamic";

export default async function TrocarSenha() {
  const s = await exigirPerfil("aluno", "recepcao", "dona");
  return (
    <main className="tela-login">
      <div className="card">
        <Marca />
        <span className="rotulo" style={{ marginTop: 26 }}>Minha conta</span>
        <h1 style={{ fontSize: "1.65rem", marginBottom: 6 }}>Trocar senha</h1>
        <p className="muted small" style={{ marginTop: 0 }}>{s.nome}, use pelo menos 8 caracteres.</p>
        <AcaoForm acao={acaoTrocarSenha}>
          <label>Senha atual<CampoSenha name="atual" required autoComplete="current-password" /></label>
          <label>Nova senha<CampoSenha name="nova" required minLength={8} autoComplete="new-password" /></label>
          <label>Repita a nova senha<CampoSenha name="repetida" required minLength={8} autoComplete="new-password" /></label>
          <button className="btn bloco">Salvar nova senha</button>
        </AcaoForm>
        <Link href={destinoDoPerfil(s.perfil)} className="btn contorno peq bloco" style={{ marginTop: 12 }}><Icone nome="chev_left" tam={14} /> Voltar</Link>
      </div>
    </main>
  );
}
