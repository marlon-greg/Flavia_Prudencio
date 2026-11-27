import Link from "next/link";
import { Marca } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { exigirPerfil, destinoDoPerfil, type Perfil } from "@/lib/auth";
import { ehTeste } from "@/lib/ambiente";

export const dynamic = "force-dynamic";

type Passo = { titulo: string; como: string; href: string };

const ALUNO: Passo[] = [
  { titulo: "Preencher a anamnese", como: "Conte o objetivo, confirme as informações e salve. Sem a anamnese não é possível agendar.", href: "/portal/anamnese" },
  { titulo: "Ver as próximas aulas", como: "Confira dias, horários e o histórico de presenças e faltas.", href: "/portal/aulas" },
  { titulo: "Cancelar uma aula", como: "Em Minhas aulas, abra “Cancelar esta aula”. Com menos de 60 minutos, o atestado é obrigatório.", href: "/portal/aulas" },
  { titulo: "Marcar uma reposição", como: "Escolha um horário com vaga e toque em Reservar.", href: "/portal/reposicao" },
  { titulo: "Consultar o plano", como: "Veja a modalidade e o valor contratado.", href: "/portal/plano" },
];

const RECEPCAO: Passo[] = [
  { titulo: "Cadastrar um aluno", como: "Abra “Cadastrar aluno”. Para dar acesso ao portal, informe e-mail e senha inicial.", href: "/admin/alunos" },
  { titulo: "Colocar o aluno num horário", como: "Na lista, escolha o horário e clique em OK. Exige anamnese e aceita até 4 alunos por turma.", href: "/admin/alunos" },
  { titulo: "Conferir a grade e marcar faltas", como: "Todos contam como presentes: registre apenas quem faltou.", href: "/admin" },
  { titulo: "Atender uma pré-matrícula", como: "Os pedidos feitos no site aparecem aqui. Depois do contato, marque como atendida.", href: "/admin/pre-matriculas" },
  { titulo: "Dar baixa numa mensalidade", como: "Gere as cobranças do mês, abra a mensalidade, escolha a forma e anexe o comprovante.", href: "/admin/financeiro" },
  { titulo: "Lançar uma despesa", como: "Preencha descrição, categoria e valor.", href: "/admin/financeiro" },
];

const DONA: Passo[] = [
  ...RECEPCAO,
  { titulo: "Acompanhar os relatórios", como: "Alunos ativos, mensalidades em aberto, caixa, presenças e faltas.", href: "/admin/relatorios" },
  { titulo: "Cadastrar a equipe", como: "Crie o acesso da recepção ou desative quem saiu.", href: "/admin/funcionarios" },
];

const PASSOS: Record<Perfil, Passo[]> = { aluno: ALUNO, recepcao: RECEPCAO, dona: DONA };

export default async function Guia() {
  const s = await exigirPerfil("aluno", "recepcao", "dona");
  const teste = ehTeste();
  return (
    <main className="tela-guia">
      <Marca />
      <span className="rotulo" style={{ marginTop: 26 }}>Orientação</span>
      <h1 style={{ fontSize: "1.65rem", marginBottom: 6 }}>Como testar o sistema</h1>
      <p className={`msg ${teste ? "ok" : "erro"}`}>
        {teste
          ? "Você está no ambiente de TESTE. Pode experimentar à vontade: os dados são fictícios."
          : "Atenção: este é o ambiente REAL. Tudo o que for salvo aqui vale de verdade. Não use estes passos para simular com dados inventados; pratique no ambiente de teste."}
      </p>
      <ol className="stack" style={{ paddingLeft: 0, listStyle: "none" }}>
        {PASSOS[s.perfil].map((p, i) => (
          <li key={p.titulo} className="card">
            <strong>{i + 1}. {p.titulo}</strong>
            <p className="muted small" style={{ margin: "6px 0 10px" }}>{p.como}</p>
            <Link href={p.href} className="btn sec peq">Abrir a tela</Link>
          </li>
        ))}
        <li className="card">
          <strong>Sua senha</strong>
          <p className="muted small" style={{ margin: "6px 0 10px" }}>No primeiro acesso, troque a senha que você recebeu.</p>
          <Link href="/conta/senha" className="btn sec peq">Trocar senha</Link>
        </li>
      </ol>
      <Link href={destinoDoPerfil(s.perfil)} className="btn contorno peq bloco"><Icone nome="chev_left" tam={14} /> Voltar</Link>
    </main>
  );
}
