import { asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { exigirPerfil } from "@/lib/auth";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoAtivarFuncionario, acaoCriarFuncionario } from "../../acoes";

export default async function Funcionarios() {
  const s = await exigirPerfil("dona"); // RF15: só a proprietária
  const lista = await (await getDb()).select().from(usuarios).where(inArray(usuarios.perfil, ["recepcao", "dona"])).orderBy(asc(usuarios.nome));
  return (
    <div className="stack">
      <h1>Funcionários</h1>
      <div className="grid-2">
        <div className="card tabela">
          <table>
            <thead><tr><th>Nome</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.nome}</strong><div className="small muted">{u.email}</div></td>
                  <td>{u.perfil === "dona" ? "Proprietária" : "Recepção"}</td>
                  <td>{u.ativo ? <span className="tag">Ativo</span> : <span className="tag cancelada">Desativado</span>}</td>
                  <td>{u.id !== s.uid && (
                    <AcaoForm acao={acaoAtivarFuncionario}>
                      <input type="hidden" name="usuarioId" value={u.id} />
                      <input type="hidden" name="ativo" value={u.ativo ? "0" : "1"} />
                      <button className={`btn peq ${u.ativo ? "sec" : ""}`}>{u.ativo ? "Desativar" : "Reativar"}</button>
                    </AcaoForm>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Novo funcionário</h2>
          <AcaoForm acao={acaoCriarFuncionario}>
            <label>Nome<input name="nome" required /></label>
            <label>E-mail<input name="email" type="email" required /></label>
            <label>Senha inicial (8+ caracteres)<input name="senha" type="text" minLength={8} required /></label>
            <label>Perfil<select name="perfil"><option value="recepcao">Recepção</option><option value="dona">Proprietária</option></select></label>
            <button className="btn">Cadastrar</button>
          </AcaoForm>
        </div>
      </div>
    </div>
  );
}
