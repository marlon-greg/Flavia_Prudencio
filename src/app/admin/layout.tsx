import { Topo } from "@/components/Topo";
import { exigirPerfil } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await exigirPerfil("recepcao", "dona");
  const links = [
    { href: "/admin", rotulo: "Grade" },
    { href: "/admin/alunos", rotulo: "Alunos" },
    { href: "/admin/financeiro", rotulo: "Financeiro" },
    { href: "/admin/pre-matriculas", rotulo: "Pré-matrículas" },
  ];
  // RF12/RF13: o menu muda por perfil, mas a proteção real é exigirPerfil("dona") em cada página e ação.
  if (s.perfil === "dona") links.push({ href: "/admin/relatorios", rotulo: "Relatórios" }, { href: "/admin/funcionarios", rotulo: "Funcionários" });
  return (
    <>
      <Topo nome={`${s.nome} · ${s.perfil === "dona" ? "Proprietária" : "Recepção"}`} links={links} />
      <main className="container pagina">{children}</main>
    </>
  );
}
