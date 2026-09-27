"use client";

import { CircleHelp, ExternalLink, House, Inbox, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { cerrarSesion } from "@/app/admin/(acceso)/acciones";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { agencia: string; email: string; esAdmin: boolean };

const PRINCIPALES = [
  { href: "/admin", label: "Inicio", Icono: LayoutDashboard },
  { href: "/admin/propiedades", label: "Propiedades", Icono: House },
  { href: "/admin/leads", label: "Consultas", Icono: Inbox },
];

function secundarios(esAdmin: boolean) {
  return [
    ...(esAdmin
      ? [
          { href: "/admin/configuracion", label: "Configuración", Icono: Settings },
          { href: "/admin/usuarios", label: "Usuarios", Icono: Users },
        ]
      : []),
    { href: "/admin/ayuda", label: "Ayuda", Icono: CircleHelp },
  ];
}

const activo = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

function BotonSalir({ className }: { className?: string }) {
  return (
    <form action={cerrarSesion}>
      <button type="submit" className={cn("flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 font-medium hover:bg-surface", className)}>
        <LogOut className="size-5" aria-hidden /> Salir
      </button>
    </form>
  );
}

export function NavPanel({ agencia, email, esAdmin }: Props) {
  const pathname = usePathname();
  const masRef = useRef<HTMLDialogElement>(null);
  const todos = [...PRINCIPALES, ...secundarios(esAdmin)];

  const link = (item: (typeof todos)[number], extra?: string) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={activo(pathname, item.href) ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium hover:bg-surface aria-[current=page]:bg-brand aria-[current=page]:text-brand-fg",
        extra,
      )}
    >
      <item.Icono className="size-5" aria-hidden /> {item.label}
    </Link>
  );

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-border bg-bg p-4 lg:flex">
        <p className="mb-4 truncate px-3 font-display text-lg font-bold text-brand-ink">{agencia}</p>
        <nav aria-label="Panel" className="flex flex-col gap-1">
          {todos.map((item) => link(item))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
          <a href="/" target="_blank" className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium hover:bg-surface">
            <ExternalLink className="size-5" aria-hidden /> Ver el sitio
          </a>
          <p className="truncate px-3 text-xs text-muted">{email}</p>
          <BotonSalir />
        </div>
      </aside>

      {/* Celular: barra superior */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-4 lg:hidden">
        <p className="min-w-0 flex-1 truncate font-display font-bold text-brand-ink">{agencia}</p>
        <a href="/" target="_blank" className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Ver el sitio (se abre en otra pestaña)">
          <ExternalLink className="size-5" aria-hidden />
        </a>
      </header>

      {/* Celular: barra inferior de pestañas */}
      <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-4">
          {PRINCIPALES.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo(pathname, item.href) ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted aria-[current=page]:text-brand-ink"
              >
                <item.Icono className="size-6" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => masRef.current?.showModal()}
              aria-haspopup="dialog"
              className="flex min-h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted"
            >
              <Menu className="size-6" aria-hidden /> Más
            </button>
          </li>
        </ul>
      </nav>
      <dialog
        ref={masRef}
        aria-label="Más opciones"
        onClick={(e) => e.target === masRef.current && masRef.current?.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-fg backdrop:bg-black/50 lg:hidden"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="truncate text-sm text-muted">{email}</p>
          <button type="button" onClick={() => masRef.current?.close()} className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Cerrar">
            <X aria-hidden />
          </button>
        </div>
        <nav aria-label="Más opciones" className="flex flex-col gap-1" onClick={() => masRef.current?.close()}>
          {secundarios(esAdmin).map((item) => link(item, "text-lg"))}
        </nav>
        <div className="mt-2 border-t border-border pt-2">
          <BotonSalir className="text-lg" />
        </div>
      </dialog>
    </>
  );
}
