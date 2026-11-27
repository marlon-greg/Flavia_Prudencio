"use server";
// Ações do servidor. Cada uma confere o perfil da sessão ANTES de alterar qualquer dado:
// esconder um botão na tela não é a proteção; a proteção é esta verificação.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usuarios, preMatriculas } from "@/db/schema";
import { conferirSenha } from "@/lib/senha";
import { criarSessao, encerrarSessao, exigirPerfil, alunoDaSessao, destinoDoPerfil } from "@/lib/auth";
import {
  RegraError, criarPreMatricula, salvarAnamnese, cancelarReserva, reservarReposicao, marcarFalta,
  cadastrarAluno, matricularEmHorario, encerrarMatricula, darBaixa, lancarCaixa, gerarCobrancasDoMes,
  criarFuncionario, definirAtivo, trocarSenha, hojeLocal,
} from "@/lib/servicos";
import { arquivoParaDados } from "@/lib/arquivo";
import { LIMITE, emailValido, telefoneValido } from "@/lib/campos";
import type { Estado } from "@/components/AcaoForm";

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k));

function conferirNome(nome: string) {
  if (nome.length < 3 || nome.length > LIMITE.nome) throw new RegraError("dados_invalidos", `Informe o nome (de 3 a ${LIMITE.nome} caracteres).`);
}

function conferirContato(nome: string, telefone: string, email: string) {
  conferirNome(nome);
  if (!telefoneValido(telefone)) throw new RegraError("dados_invalidos", "Informe um telefone válido com DDD.");
  if (email && !emailValido(email)) throw new RegraError("dados_invalidos", "Informe um e-mail válido.");
}

function limitar(fd: FormData, limites: Record<string, number>) {
  for (const [k, max] of Object.entries(limites)) {
    if (txt(fd, k).length > max) throw new RegraError("dados_invalidos", `Texto longo demais (máximo de ${max} caracteres).`);
  }
}

/** Executa a ação e transforma erros de regra de negócio em mensagem para a tela. */
async function tentar(fn: () => Promise<string | void>, caminhos: string[] = []): Promise<Estado> {
  try {
    const ok = await fn();
    for (const c of caminhos) revalidatePath(c, "layout");
    return { ok: ok || "Salvo." };
  } catch (e) {
    if (e instanceof RegraError) return { erro: e.message };
    throw e;
  }
}

function centavos(v: string) {
  const n = Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100);
  return Number.isFinite(n) ? n : NaN;
}

// ---------- Público ----------

export async function acaoPreMatricula(_: Estado, fd: FormData): Promise<Estado> {
  return tentar(async () => {
    const db = await getDb();
    conferirContato(txt(fd, "nome"), txt(fd, "telefone"), txt(fd, "email"));
    limitar(fd, { interesse: LIMITE.curto, mensagem: LIMITE.longo });
    await criarPreMatricula(db, {
      nome: txt(fd, "nome"), telefone: txt(fd, "telefone"), email: txt(fd, "email") || undefined,
      interesse: txt(fd, "interesse") || undefined, mensagem: txt(fd, "mensagem") || undefined,
    });
    return "Pré-matrícula enviada! O studio vai entrar em contato pelo telefone informado.";
  }, ["/admin"]);
}

export async function acaoLogin(_: Estado, fd: FormData): Promise<Estado> {
  const db = await getDb();
  const email = txt(fd, "email").toLowerCase();
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  if (!u || !u.ativo || !(await conferirSenha(txt(fd, "senha"), u.senhaHash))) {
    return { erro: "E-mail ou senha incorretos." };
  }
  await criarSessao({ uid: u.id, perfil: u.perfil, nome: u.nome });
  redirect(destinoDoPerfil(u.perfil));
}

export async function acaoSair() {
  await encerrarSessao();
  redirect("/login");
}

// ---------- Qualquer usuário logado ----------

export async function acaoTrocarSenha(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirPerfil("aluno", "recepcao", "dona");
  return tentar(async () => {
    const nova = txt(fd, "nova");
    if (nova !== txt(fd, "repetida")) throw new RegraError("senha_diferente", "A repetição não confere com a nova senha.");
    limitar(fd, { nova: LIMITE.senha });
    await trocarSenha(await getDb(), s.uid, txt(fd, "atual"), nova);
    return "Senha alterada. Use a nova senha no próximo acesso.";
  });
}

// ---------- Aluno ----------

export async function acaoAnamnese(_: Estado, fd: FormData): Promise<Estado> {
  const { aluno } = await alunoDaSessao();
  return tentar(async () => {
    const respostas: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) respostas[k] = v.trim();
    if (Object.values(respostas).some(v => v.length > LIMITE.longo)) throw new RegraError("dados_invalidos", `Cada resposta pode ter no máximo ${LIMITE.longo} caracteres.`);
    if (!respostas.objetivo) throw new RegraError("dados_invalidos", "Conte qual é o seu objetivo com as aulas.");
    if (respostas.ciente !== "sim") throw new RegraError("dados_invalidos", "Confirme que as informações são verdadeiras.");
    await salvarAnamnese(await getDb(), aluno.id, respostas);
    return "Anamnese salva. Você já pode agendar reposições.";
  }, ["/portal"]);
}

export async function acaoCancelar(_: Estado, fd: FormData): Promise<Estado> {
  const { aluno } = await alunoDaSessao();
  const r = await tentar(async () => {
    const atestado = await arquivoParaDados(fd.get("atestado"));
    limitar(fd, { motivo: LIMITE.curto });
    await cancelarReserva(await getDb(), num(fd, "reservaId"), aluno.id, { motivo: txt(fd, "motivo") || undefined, atestado });
  }, ["/portal", "/admin"]);
  if (r?.erro) return r;
  redirect("/portal?ok=cancelada");
}

export async function acaoReposicao(_: Estado, fd: FormData): Promise<Estado> {
  const { aluno } = await alunoDaSessao();
  const r = await tentar(async () => {
    await reservarReposicao(await getDb(), aluno.id, num(fd, "horarioId"), txt(fd, "data"));
  }, ["/portal", "/admin"]);
  if (r?.erro) return r;
  // O horário reservado sai da lista de vagas; leva o aluno às próximas aulas, onde ele aparece.
  redirect(`/portal?ok=reposicao&data=${encodeURIComponent(txt(fd, "data"))}`);
}

// ---------- Recepção e proprietária ----------

export async function acaoFalta(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    const falta = txt(fd, "falta") === "1";
    await marcarFalta(await getDb(), num(fd, "reservaId"), falta);
    return falta ? "Falta registrada." : "Falta removida.";
  }, ["/admin", "/portal"]);
}

export async function acaoCadastrarAluno(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    const nome = txt(fd, "nome"); const telefone = txt(fd, "telefone");
    const email = txt(fd, "email"); const senha = txt(fd, "senha");
    conferirContato(nome, telefone, email);
    if (email && senha.length < 8) throw new RegraError("senha_fraca", "Para criar o acesso ao portal, a senha precisa ter 8 caracteres ou mais.");
    const db = await getDb();
    if (email) {
      const [ja] = await db.select().from(usuarios).where(eq(usuarios.email, email.toLowerCase()));
      if (ja) throw new RegraError("email_em_uso", "Já existe um usuário com esse e-mail.");
    }
    await cadastrarAluno(db, { nome, telefone, email: email || undefined, senha: senha || undefined, planoId: num(fd, "planoId") || null });
    return `Aluno ${nome} cadastrado.`;
  }, ["/admin"]);
}

export async function acaoMatricular(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    await matricularEmHorario(await getDb(), num(fd, "alunoId"), num(fd, "horarioId"));
    return "Aluno matriculado no horário.";
  }, ["/admin", "/portal"]);
}

export async function acaoEncerrarMatricula(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    await encerrarMatricula(await getDb(), num(fd, "matriculaId"));
    return "Matrícula encerrada.";
  }, ["/admin", "/portal"]);
}

export async function acaoBaixa(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirPerfil("recepcao", "dona");
  const r = await tentar(async () => {
    const comprovante = await arquivoParaDados(fd.get("comprovante"));
    await darBaixa(await getDb(), num(fd, "pagamentoId"), { forma: txt(fd, "forma") || "PIX", comprovante, usuarioId: s.uid });
  }, ["/admin", "/portal"]);
  if (r?.erro) return r;
  redirect("/admin/financeiro?ok=baixa"); // a mensalidade sai da lista; a confirmação aparece no topo
}

export async function acaoCaixa(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    const tipo = txt(fd, "tipo") === "entrada" ? "entrada" : "saida";
    limitar(fd, { descricao: LIMITE.curto, categoria: LIMITE.curto });
    await lancarCaixa(await getDb(), {
      tipo, descricao: txt(fd, "descricao"), categoria: txt(fd, "categoria") || undefined,
      valorCentavos: centavos(txt(fd, "valor")), data: txt(fd, "data") || hojeLocal(), usuarioId: s.uid,
    });
    return tipo === "saida" ? "Despesa lançada." : "Entrada lançada.";
  }, ["/admin"]);
}

export async function acaoGerarCobrancas(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    const ref = txt(fd, "referencia") || hojeLocal().slice(0, 7);
    const n = await gerarCobrancasDoMes(await getDb(), ref);
    return n ? `${n} cobrança(s) gerada(s) para ${ref}.` : `As cobranças de ${ref} já existiam.`;
  }, ["/admin"]);
}

export async function acaoPreMatriculaAtendida(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("recepcao", "dona");
  return tentar(async () => {
    await (await getDb()).update(preMatriculas).set({ atendida: true }).where(eq(preMatriculas.id, num(fd, "id")));
    return "Marcada como atendida.";
  }, ["/admin"]);
}

// ---------- Só a proprietária ----------

export async function acaoCriarFuncionario(_: Estado, fd: FormData): Promise<Estado> {
  await exigirPerfil("dona");
  return tentar(async () => {
    const perfil = txt(fd, "perfil") === "dona" ? "dona" : "recepcao";
    conferirNome(txt(fd, "nome"));
    if (!emailValido(txt(fd, "email"))) throw new RegraError("dados_invalidos", "Informe um e-mail válido.");
    limitar(fd, { senha: LIMITE.senha });
    await criarFuncionario(await getDb(), { nome: txt(fd, "nome"), email: txt(fd, "email"), senha: txt(fd, "senha"), perfil });
    return "Funcionário cadastrado.";
  }, ["/admin"]);
}

export async function acaoAtivarFuncionario(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirPerfil("dona");
  return tentar(async () => {
    const ativo = txt(fd, "ativo") === "1";
    await definirAtivo(await getDb(), num(fd, "usuarioId"), ativo, s.uid);
    return ativo ? "Acesso reativado." : "Acesso desativado.";
  }, ["/admin"]);
}
