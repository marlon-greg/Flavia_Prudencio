import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { preMatriculas } from "@/db/schema";
import { AcaoForm } from "@/components/AcaoForm";
import { acaoPreMatriculaAtendida } from "../../acoes";

export default async function PreMatriculas() {
  const lista = await (await getDb()).select().from(preMatriculas).orderBy(asc(preMatriculas.atendida), desc(preMatriculas.criadoEm));
  return (
    <div className="stack">
      <h1>Pré-matrículas do site</h1>
      <div className="card tabela">
        <table>
          <thead><tr><th>Recebida</th><th>Nome</th><th>Contato</th><th>Interesse</th><th>Mensagem</th><th></th></tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} style={{ opacity: p.atendida ? .55 : 1 }}>
                <td>{p.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td><strong>{p.nome}</strong></td>
                <td>{p.telefone}{p.email ? <div className="small muted">{p.email}</div> : null}</td>
                <td>{p.interesse ?? "—"}</td>
                <td className="small">{p.mensagem ?? ""}</td>
                <td>{p.atendida ? <span className="tag">Atendida</span> : (
                  <AcaoForm acao={acaoPreMatriculaAtendida}><input type="hidden" name="id" value={p.id} /><button className="btn sec peq">Marcar atendida</button></AcaoForm>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="muted">Nenhuma pré-matrícula recebida.</p>}
      </div>
    </div>
  );
}
