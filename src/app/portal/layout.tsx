import { Estrutura } from "@/components/Topo";
import { Icone } from "@/components/Icone";
import { AbrirAncora } from "@/components/AbrirAncora";
import { alunoDaSessao } from "@/lib/auth";
import { getDb } from "@/db";
import { planos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { linkWhats, nomePlano } from "@/lib/util";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { aluno } = await alunoDaSessao();
  const [plano] = aluno.planoId ? await (await getDb()).select().from(planos).where(eq(planos.id, aluno.planoId)) : [];
  return (
    <Estrutura tema="claro" nome={aluno.nome.split(" ").slice(0, 2).join(" ")} detalhe={nomePlano(plano)}
      itens={[
        { href: "/portal", rotulo: "Início", icone: "home" },
        { href: "/portal/aulas", rotulo: "Minhas aulas", curto: "Aulas", icone: "calendar" },
        { href: "/portal/reposicao", rotulo: "Reposição", icone: "plus" },
        { href: "/portal/plano", rotulo: "Meu plano", curto: "Plano", icone: "cash" },
        { href: "/portal/anamnese", rotulo: "Anamnese", icone: "file" },
      ]}
      extras={
        <a className="link-lateral esconde-cel" target="_blank" rel="noopener"
          href={linkWhats(`Olá! Sou ${aluno.nome}, aluno(a) do studio.`)}><Icone nome="phone" tam={16} /> Falar com o studio</a>
      }>
      <AbrirAncora />
      {children}
    </Estrutura>
  );
}
