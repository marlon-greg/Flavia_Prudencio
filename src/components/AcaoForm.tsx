"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";

export type Estado = { erro?: string; ok?: string } | null;

/**
 * Formulário que chama uma ação do servidor e mostra o erro ou a confirmação que ela devolver.
 * Envia por onSubmit (e não pela prop `action`) para o React não apagar o que a pessoa digitou
 * quando o servidor recusa; os campos só são limpos quando a ação dá certo.
 */
export function AcaoForm({ acao, children, className, limpar = true }: {
  acao: (prev: Estado, fd: FormData) => Promise<Estado>;
  children: React.ReactNode; className?: string; limpar?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok && limpar) ref.current?.reset(); }, [estado, limpar]);
  return (
    <form ref={ref} className={className} onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => enviar(fd));
    }}>
      <fieldset disabled={pendente} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className="stack">
        {children}
        {estado?.erro && <div className="msg erro" role="alert">{estado.erro}</div>}
        {estado?.ok && <div className="msg ok" role="status">{estado.ok}</div>}
      </fieldset>
    </form>
  );
}
