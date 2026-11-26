import { Topo } from "@/components/Topo";
import { exigirPerfil } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const s = await exigirPerfil("aluno");
  return (
    <>
      <Topo nome={s.nome} links={[
        { href: "/portal", rotulo: "Minhas aulas" },
        { href: "/portal/reposicao", rotulo: "Reposição" },
        { href: "/portal/anamnese", rotulo: "Anamnese" },
      ]} />
      <main className="container pagina">{children}</main>
    </>
  );
}
