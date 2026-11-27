export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "5519991574555"; // número do studio; NEXT_PUBLIC_WHATSAPP substitui, se definido
export const linkWhats = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

export const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const nomeDia = (n: number) => DIAS[n];

/** "2026-11-25" -> "Qua, 25/11" */
export function dataCurta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${DIAS[dia].slice(0, 3)}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
export const dataBr = (iso: string) => iso.split("-").reverse().join("/");
export const mesBr = (ref: string) => { const [y, m] = ref.split("-"); return `${m}/${y}`; };

export const nomePlano = (p: { modalidade: string; aulasSemana: number } | null | undefined) =>
  !p ? "Sem plano" : p.modalidade === "Fisioterapia" ? "Fisioterapia (sessão)" : `${p.modalidade} ${p.aulasSemana}x por semana`;

const DIAS_LONGOS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "2026-11-26" -> "Quinta-feira, 26 de novembro" */
export function dataExtenso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DIAS_LONGOS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]}, ${d} de ${MESES[m - 1]}`;
}
/** "2026-11" -> "nov/26" */
export const mesCurto = (ref: string) => { const [y, m] = ref.split("-"); return `${MESES[Number(m) - 1].slice(0, 3)}/${y.slice(2)}`; };
/** "09:00" -> "09h" ; "09:30" -> "09h30" */
export const horaCurta = (h: string) => h.endsWith(":00") ? h.slice(0, 2) + "h" : h.replace(":", "h");
