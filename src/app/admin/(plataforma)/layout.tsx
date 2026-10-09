import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { cerrarSesion } from "@/app/admin/(acceso)/acciones";
import { buttonStyles } from "@/components/ui/button";
import { requerirSuperadmin } from "@/lib/admin/sesion";

/** Sección de la plataforma (superadmin): fuera del panel de una inmobiliaria. */
export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const estado = await requerirSuperadmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-4">
        {estado.tipo === "ok" && (
          <Link href="/admin" className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Volver al panel">
            <ArrowLeft aria-hidden />
          </Link>
        )}
        <p className="flex-1 truncate font-display text-lg font-bold">Plataforma</p>
        <form action={cerrarSesion}>
          <button type="submit" className={buttonStyles({ variant: "ghost" })}>
            <LogOut className="size-5" aria-hidden /> Salir
          </button>
        </form>
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
