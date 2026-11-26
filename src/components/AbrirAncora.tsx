"use client";
import { useEffect } from "react";

/** Ao seguir um link #id que aponta para um <details>, abre o bloco (usado no "Desmarcar" do portal). */
export function AbrirAncora() {
  useEffect(() => {
    const abrir = () => {
      const el = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (el instanceof HTMLDetailsElement) { el.open = true; el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);
  return null;
}
