import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anamneses } from "@/db/schema";
import { alunoDaSessao } from "@/lib/auth";
import { AcaoForm } from "@/components/AcaoForm";
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
    <div className="card" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Anamnese</h1>
      <p className="muted small">
        {a ? `Preenchida em ${a.criadoEm.toLocaleDateString("pt-BR")}. Você pode atualizar quando quiser.`
           : "Obrigatória antes do primeiro agendamento."}
      </p>
      <AcaoForm acao={acaoAnamnese} limpar={false}>
        {PERGUNTAS.map(([k, q]) => (
          <label key={k}>{q}<textarea name={k} defaultValue={r[k] ?? ""} required={k === "objetivo"} /></label>
        ))}
        <label><input type="checkbox" name="ciente" value="sim" defaultChecked={r.ciente === "sim"} required />
          Declaro que as informações acima são verdadeiras.</label>
        <button className="btn">Salvar anamnese</button>
      </AcaoForm>
    </div>
  );
}
