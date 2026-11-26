import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { AcaoForm } from "@/components/AcaoForm";
import { Cabecalho } from "@/components/Topo";
import { acaoAnamnese } from "../../acoes";

const PERGUNTAS: [string, string][] = [
  ["objetivo", "Qual é o seu objetivo com as aulas?"],
  ["dores", "Sente dores? Onde?"],
  ["cirurgias", "Já fez cirurgias? Quais e quando?"],
  ["doencas", "Tem alguma doença (pressão, diabetes, coração, coluna)?"],
  ["medicamentos", "Usa medicamentos? Quais?"],
  ["atividade", "Pratica atividade física hoje?"],
];

export default async function Anamnese() {
  const { aluno } = await alunoDaSessao();
  const [a] = await (await getDb()).select().from(anamneses).where(eq(anamneses.alunoId, aluno.id));
  const r = (a?.respostas ?? {}) as Record<string, string>;
  return (
    <div style={{ maxWidth: 760 }}>
      <Cabecalho rotulo="Anamnese" titulo="Sua ficha de saúde"
        sub={a ? `Preenchida em ${a.criadoEm.toLocaleDateString("pt-BR")}. Você pode atualizar quando quiser.`
          : "Obrigatória antes do primeiro agendamento. Leva cerca de 5 minutos."} />
      <div className="card" style={{ padding: 28 }}>
        <AcaoForm acao={acaoAnamnese} limpar={false}>
          {PERGUNTAS.map(([k, q], i) => (
            <label key={k}><span className="muted">{i + 1}.</span> {q}<textarea name={k} defaultValue={r[k] ?? ""} required={k === "objetivo"} /></label>
          ))}
          <label style={{ display: "flex", alignItems: "center" }}><input type="checkbox" name="ciente" value="sim" defaultChecked={r.ciente === "sim"} required />
            Declaro que as informações acima são verdadeiras.</label>
          <button className="btn">Salvar anamnese</button>
        </AcaoForm>
      </div>
    </div>
  );
}
