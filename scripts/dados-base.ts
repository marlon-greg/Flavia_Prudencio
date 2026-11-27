// Planos e grade de horários do studio, usados no banco de teste e no real.
const tabela: [string, number, number][] = [
  ["Mensal", 1, 15000], ["Mensal", 2, 22000], ["Mensal", 3, 27000],
  ["Trimestral", 1, 13000], ["Trimestral", 2, 19500], ["Trimestral", 3, 23000],
  ["Semestral", 1, 12000], ["Semestral", 2, 18000], ["Semestral", 3, 22000],
  ["Fisioterapia", 1, 9000],
];
export const PLANOS_INICIAIS = tabela.map(([modalidade, aulasSemana, precoCentavos]) => ({ modalidade, aulasSemana, precoCentavos }));

export function gradeInicial() {
  const horas = ["07:00", "08:00", "09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  const linhas = [];
  for (let dia = 1; dia <= 5; dia++) for (const hora of horas) linhas.push({ diaSemana: dia, hora, capacidade: 4 });
  for (const hora of ["08:00", "09:00", "10:00"]) linhas.push({ diaSemana: 6, hora, capacidade: 4 });
  return linhas;
}
