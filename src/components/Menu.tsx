"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";

export type ItemMenu = { href: string; rotulo: string; icone: string; secao?: string; curto?: string };

export function Menu({ itens }: { itens: ItemMenu[] }) {
  const atual = usePathname();
  // O item ativo é o de caminho mais longo que combina com a página (assim /admin não acende em /admin/alunos).
  const ativo = itens.filter(i => atual === i.href || atual.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  let secao: string | undefined;
  return (
    <nav className="menu" aria-label="Menu principal">
      {itens.map(i => {
        const titulo = i.secao && i.secao !== secao ? i.secao : null;
        secao = i.secao ?? secao;
        return (
          <span key={i.href} className="menu-grupo">
            {titulo && <span className="menu-secao">{titulo}</span>}
            <Link href={i.href} className={i.href === ativo ? "ativo" : ""} aria-current={i.href === ativo ? "page" : undefined}>
              <Icone nome={i.icone} tam={18} />
              <span className="menu-longo">{i.rotulo}</span>
              <span className="menu-curto">{i.curto ?? i.rotulo}</span>
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
