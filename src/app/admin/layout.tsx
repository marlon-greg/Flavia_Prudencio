import { Estrutura } from "@/components/Topo";
import type { ItemMenu } from "@/components/Menu";
import { exigirPerfil } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await exigirPerfil("recepcao", "dona");
  const itens: ItemMenu[] = [
    { href: "/admin", rotulo: "Grade diária", curto: "Grade", icone: "calendar", secao: "Operação" },
    { href: "/admin/alunos", rotulo: "Alunos", icone: "users", secao: "Operação" },
    { href: "/admin/pre-matriculas", rotulo: "Pré-matrículas", icone: "inbox", secao: "Operação" },
    { href: "/admin/financeiro", rotulo: "Financeiro", icone: "cash", secao: "Gestão" },
  ];
  // RF12/RF13: o menu muda por perfil, mas a proteção real é exigirPerfil("dona") em cada página e ação.
  if (s.perfil === "dona") itens.push(
    { href: "/admin/relatorios", rotulo: "Relatórios", icone: "chart", secao: "Gestão" },
    { href: "/admin/funcionarios", rotulo: "Funcionários", icone: "badge", secao: "Gestão" },
  );
  return (
    <Estrutura tema="escuro" nome={s.nome} detalhe={s.perfil === "dona" ? "Proprietária · acesso total" : "Recepção"} itens={itens}>
      {children}
    </Estrutura>
  );
}
