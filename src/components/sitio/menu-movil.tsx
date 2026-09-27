"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";

export const LINKS_SITIO = [
  { href: "/alquiler", label: "Alquiler" },
  { href: "/venta", label: "Venta" },
  { href: "/emprendimientos", label: "Emprendimientos" },
] as const;

export function MenuMovil() {
  const pathname = usePathname();
  // Se guarda la ruta donde se abrió: al navegar deja de coincidir y el menú se cierra solo.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname;
  const setAbierto = (valor: boolean | ((v: boolean) => boolean)) =>
    setAbiertoEn((typeof valor === "function" ? valor(abierto) : valor) ? pathname : null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setAbiertoEn(null);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierto]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="menu-movil"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        className={buttonStyles({ variant: "ghost", size: "icon" })}
      >
        {abierto ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      {abierto && (
        <nav
          id="menu-movil"
          aria-label="Principal"
          className="absolute inset-x-0 top-full border-b border-border bg-bg px-4 pb-4 shadow-(--shadow-card)"
        >
          <ul className="flex flex-col">
            {LINKS_SITIO.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="flex min-h-12 items-center border-b border-border text-lg font-semibold aria-[current=page]:text-brand-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
