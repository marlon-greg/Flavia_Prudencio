"use client";
// Campos com preenchimento padronizado: telefone, e-mail, valor, senha e arquivo.
// A conferência aqui é só conforto; o servidor valida de novo.
import { useId, useState } from "react";
import { LIMITE, emailValido, mascaraMoeda, mascaraTelefone, telefoneValido } from "@/lib/campos";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** Marca o campo como inválido para o navegador não enviar o formulário. */
const conferir = (el: HTMLInputElement, erro: string) => el.setCustomValidity(erro);

export function CampoTelefone(props: Props) {
  const erro = (v: string) => !v || telefoneValido(v) ? "" : "Telefone incompleto ou inválido. Use DDD + número: (19) 99999-0000.";
  return (
    <input {...props} type="tel" inputMode="numeric" autoComplete={props.autoComplete ?? "tel-national"}
      placeholder="(19) 99999-0000"
      onChange={(e) => {
        const el = e.currentTarget;
        // Não aplica o limite via maxLength para um número colado com +55 não ser cortado antes da máscara.
        el.value = mascaraTelefone(el.value);
        conferir(el, erro(el.value));
      }} />
  );
}

const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com", "uol.com.br"];

export function CampoEmail(props: Props) {
  const lista = useId();
  const [valor, setValor] = useState("");
  const [usuario, dominio = ""] = valor.split("@");
  // Sugere o restante do endereço depois que a pessoa digita o "@".
  const sugestoes = valor.includes("@") && usuario
    ? DOMINIOS.filter(d => d.startsWith(dominio) && d !== dominio).map(d => `${usuario}@${d}`) : [];
  return (
    <>
      <input autoComplete="email" placeholder="nome@exemplo.com" {...props} type="email" inputMode="email"
        list={lista} maxLength={LIMITE.email} autoCapitalize="none" spellCheck={false}
        onChange={(e) => {
          const el = e.currentTarget;
          const v = el.value.replace(/\s/g, "").toLowerCase();
          if (v !== el.value) el.value = v;
          setValor(v);
          conferir(el, !v || emailValido(v) ? "" : "E-mail inválido. Exemplo: nome@exemplo.com");
        }} />
      <datalist id={lista}>{sugestoes.map(s => <option key={s} value={s} />)}</datalist>
    </>
  );
}

export function CampoMoeda(props: Props) {
  return (
    <input {...props} type="text" inputMode="numeric" placeholder="0,00" maxLength={12}
      onChange={(e) => { e.currentTarget.value = mascaraMoeda(e.currentTarget.value); }} />
  );
}

export function CampoSenha(props: Props) {
  const [ver, setVer] = useState(false);
  return (
    <span className="senha">
      <input {...props} type={ver ? "text" : "password"} maxLength={LIMITE.senha} autoCapitalize="none" spellCheck={false} />
      <button type="button" onClick={() => setVer(!ver)} aria-pressed={ver}>{ver ? "Ocultar" : "Mostrar"}</button>
    </span>
  );
}

export function CampoArquivo(props: Props) {
  return (
    <input {...props} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
      onChange={(e) => {
        const el = e.currentTarget; const f = el.files?.[0];
        const erro = !f ? "" : !/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type) ? "Envie PDF, JPG ou PNG."
          : f.size > 2 * 1024 * 1024 ? "O arquivo pode ter no máximo 2 MB." : "";
        conferir(el, erro);
        if (erro) el.reportValidity();
      }} />
  );
}
