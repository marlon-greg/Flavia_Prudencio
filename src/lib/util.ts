export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "5519999999999"; // definir o número real em NEXT_PUBLIC_WHATSAPP
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
