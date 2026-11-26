import { RegraError } from "./servicos";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX = 2 * 1024 * 1024;

/** Converte o arquivo enviado num data URL para gravar no banco. Devolve null se nada foi enviado. */
export async function arquivoParaDados(v: FormDataEntryValue | null) {
  if (!v || typeof v === "string" || v.size === 0) return null;
  if (!TIPOS.includes(v.type)) throw new RegraError("arquivo_invalido", "Envie PDF, JPG ou PNG.");
  if (v.size > MAX) throw new RegraError("arquivo_grande", "O arquivo pode ter no máximo 2 MB.");
  const b64 = Buffer.from(await v.arrayBuffer()).toString("base64");
  return { nome: v.name, dados: `data:${v.type};base64,${b64}` };
}
