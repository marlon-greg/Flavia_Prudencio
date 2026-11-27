import { asc, inArray } from "drizzle-orm";
import { CampoEmail, CampoSenha } from "@/components/Campos";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { exigirPerfil } from "@/lib/auth";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho, iniciais } from "@/components/Topo";
import { acaoAtivarFuncionario, acaoCriarFuncionario } from "../../acoes";

export default async function Funcionarios() {
  const s = await exigirPerfil("dona"); // RF15: só a proprietária
  const lista = await (await getDb()).select().from(usuarios).where(inArray(usuarios.perfil, ["recepcao", "dona"])).orderBy(asc(usuarios.nome));
  return (
    <div className="stack">
      <Cabecalho rotulo="Funcionários" titulo="Equipe e acessos" sub="Quem pode entrar no painel. Funcionários desativados não conseguem fazer login." />
      <div className="grid-2">
        <div className="card tabela" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Nome</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id}>
                  <td><span className="pessoa"><span className="avatar peq">{iniciais(u.nome)}</span><span><strong>{u.nome}</strong><div className="small muted">{u.email}</div></span></span></td>
                  <td>{u.perfil === "dona" ? "Proprietária" : "Recepção"}</td>
                  <td>{u.ativo ? <span className="tag ponto">Ativo</span> : <span className="tag cancelada ponto">Desativado</span>}</td>
                  <td>{u.id !== s.uid && (
                    <AcaoForm acao={acaoAtivarFuncionario}>
                      <input type="hidden" name="usuarioId" value={u.id} />
                      <input type="hidden" name="ativo" value={u.ativo ? "0" : "1"} />
                      <button className={`btn peq ${u.ativo ? "contorno" : ""}`}>{u.ativo ? "Desativar" : "Reativar"}</button>
                    </AcaoForm>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-cab"><h2>Novo funcionário</h2></div>
          <AcaoForm acao={acaoCriarFuncionario}>
            <label>Nome<input name="nome" required minLength={3} maxLength={80} /></label>
            <label>E-mail<CampoEmail name="email" required autoComplete="off" /></label>
            <label>Senha inicial (8+ caracteres)<CampoSenha name="senha" minLength={8} required autoComplete="new-password" /></label>
            <label>Perfil<select name="perfil"><option value="recepcao">Recepção</option><option value="dona">Proprietária</option></select></label>
            <button className="btn">Cadastrar</button>
          </AcaoForm>
        </div>
      </div>
    </div>
  );
}
