import { AcaoForm } from "@/components/AcaoForm";
import { CampoArquivo } from "@/components/Campos";
import { Icone } from "@/components/Icone";
import { acaoCancelar } from "../acoes";
import { ANTECEDENCIA_MINIMA_MIN } from "@/lib/servicos";
import { dataCurta } from "@/lib/util";

export type AulaDoAluno = {
  id: number; tipo: string; status: string; falta: boolean; atestadoNome: string | null;
  data: string; hora: string; inicio: Date;
};

export const horaBr = (h: string) => h.replace(":", "h");

/** Cancelamento em etapas (motivo → atestado se preciso → confirmação). A regra RN02 continua no servidor. */
export function CancelarAula({ aula, agora }: { aula: AulaDoAluno; agora: Date }) {
  const min = Math.floor((aula.inicio.getTime() - agora.getTime()) / 60000);
  const exige = min < ANTECEDENCIA_MINIMA_MIN;
  return (
    <details className="cancelar" id={`aula-${aula.id}`}>
      <summary><Icone nome="close" tam={13} /> Cancelar esta aula</summary>
      <div className="painel">
        <div className="etapas">
          <span><b>1</b>Motivo</span><span><b>2</b>Atestado{exige ? "" : " (opcional)"}</span><span><b>3</b>Confirmar</span>
        </div>
        <AcaoForm acao={acaoCancelar}>
          <input type="hidden" name="reservaId" value={aula.id} />
          <p className="small" style={{ margin: 0 }}>
            Aula de <strong>{dataCurta(aula.data)} às {horaBr(aula.hora)}</strong>.{" "}
            {exige
              ? <span style={{ color: "var(--danger)" }}>Faltam {min} minutos: o cancelamento só é aceito com atestado.</span>
              : <span className="muted">Com mais de {ANTECEDENCIA_MINIMA_MIN} minutos de antecedência, não precisa de atestado e você pode marcar uma reposição.</span>}
          </p>
          <label>1. Motivo<input name="motivo" maxLength={120} placeholder="Ex.: viagem, consulta médica" /></label>
          <label>2. Atestado (PDF, JPG ou PNG, até 2 MB){exige ? " — obrigatório" : ""}<CampoArquivo name="atestado" required={exige} /></label>
          <button className="btn perigo peq">3. Confirmar cancelamento</button>
        </AcaoForm>
      </div>
    </details>
  );
}

export function AulaLinha({ aula, agora, cancelar = true }: { aula: AulaDoAluno; agora: Date; cancelar?: boolean }) {
  const passada = aula.inicio <= agora;
  const off = aula.status === "cancelada";
  return (
    <div className={`aula-linha ${aula.tipo === "reposicao" ? "repo" : ""} ${off ? "off" : ""}`}>
      <span className="quando">{dataCurta(aula.data)}<strong>{horaBr(aula.hora)}</strong></span>
      {aula.tipo === "reposicao" ? <span className="tag repo">Reposição</span> : <span className="tag contorno">Fixa</span>}
      {off && <span className="tag cancelada">Cancelada{aula.atestadoNome ? " (atestado)" : ""}</span>}
      {!off && passada && (aula.falta ? <span className="tag falta">Falta</span> : <span className="tag">Presente</span>)}
      {!off && !passada && cancelar && <CancelarAula aula={aula} agora={agora} />}
    </div>
  );
}
