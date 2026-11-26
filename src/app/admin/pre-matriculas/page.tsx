import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { preMatriculas } from "@/db/schema";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho } from "@/components/Topo";
import { acaoPreMatriculaAtendida } from "../../acoes";

export default async function PreMatriculas() {
  const lista = await (await getDb()).select().from(preMatriculas).orderBy(asc(preMatriculas.atendida), desc(preMatriculas.criadoEm));
  const abertas = lista.filter(p => !p.atendida).length;
  return (
    <div className="stack">
      <Cabecalho rotulo="Pré-matrículas" titulo="Pedidos vindos do site" sub={`${abertas} aguardando contato · ${lista.length - abertas} atendida(s)`} />
      <div className="card tabela" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Recebida</th><th>Nome</th><th>Contato</th><th>Interesse</th><th>Mensagem</th><th></th></tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} style={{ opacity: p.atendida ? .55 : 1 }}>
                <td>{p.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td><strong>{p.nome}</strong></td>
                <td>{p.telefone}{p.email ? <div className="small muted">{p.email}</div> : null}</td>
                <td>{p.interesse ? <span className="tag contorno">{p.interesse}</span> : "—"}</td>
                <td className="small">{p.mensagem ?? ""}</td>
                <td>{p.atendida ? <span className="tag ponto">Atendida</span> : (
                  <AcaoForm acao={acaoPreMatriculaAtendida}><input type="hidden" name="id" value={p.id} /><button className="btn sec peq">Marcar atendida</button></AcaoForm>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="muted" style={{ padding: 16 }}>Nenhuma pré-matrícula recebida.</p>}
      </div>
    </div>
  );
}
