// Máscaras e validações de campos, usadas na tela (formatação) e no servidor (conferência).
export const LIMITE = { nome: 80, email: 120, senha: 64, curto: 120, longo: 500 } as const;

export const soDigitos = (v: string) => v.replace(/\D/g, "");

/** "19999990000" -> "(19) 99999-0000"; fixo com 10 dígitos -> "(19) 3875-0000". Corta o que passar de 11. */
export function mascaraTelefone(v: string) {
  let d = soDigitos(v);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2); // colado com o código do país
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const resto = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${resto.slice(0, corte)}${resto.length > corte ? "-" + resto.slice(corte) : ""}`;
}

/** DDD de 11 a 99 e, com 11 dígitos, celular começando em 9. */
export function telefoneValido(v: string) {
  return /^[1-9][1-9](9\d{8}|[2-8]\d{7})$/.test(soDigitos(v));
}

export const emailValido = (v: string) =>
  v.length <= LIMITE.email && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v);

/** Digitação em centavos: "38000" -> "380,00". Até R$ 9.999.999,99. */
export function mascaraMoeda(v: string) {
  const d = soDigitos(v).replace(/^0+/, "").slice(0, 9);
  if (!d) return "";
  return (Number(d) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
