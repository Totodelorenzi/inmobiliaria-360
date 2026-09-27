import { House } from "lucide-react";

/** Pantallas de acceso: tarjeta centrada, sin datos de la inmobiliaria (todavía no hay sesión). */
export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-(--radius-card) border border-border bg-bg p-6 shadow-(--shadow-card) sm:p-8">
        <div className="mb-6 flex items-center gap-2 text-brand-ink">
          <House className="size-6" aria-hidden />
          <span className="font-display text-lg font-bold">Panel de la inmobiliaria</span>
        </div>
        {children}
      </div>
    </main>
  );
}
