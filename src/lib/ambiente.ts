/**
 * Teste e real usam bancos separados. É teste quando não há DATABASE_URL (banco local)
 * ou quando a publicação de demonstração define AMBIENTE=teste.
 */
export const ehTeste = () => !process.env.DATABASE_URL || process.env.AMBIENTE === "teste";

/** Impede que dados e contas de demonstração sejam gravados no banco real. */
export function recusarBancoReal() {
  if (!ehTeste()) {
    throw new Error("Recusado: DATABASE_URL aponta para o banco real. Dados de teste só no banco local ou com AMBIENTE=teste.");
  }
}
