import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Encabezado de cada pantalla del panel. */
export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-muted">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/** Contenedor de página del panel. */
export function Pagina({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8", className)}>{children}</div>;
}

/** Bloque blanco con título opcional. */
export function Panel({ titulo, children, className, acciones }: { titulo?: string; children: ReactNode; className?: string; acciones?: ReactNode }) {
  return (
    <section className={cn("rounded-(--radius-card) border border-border bg-bg p-4 sm:p-5", className)}>
      {(titulo || acciones) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-bold">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

/** Mensaje de estado (éxito, aviso o error). */
export function Aviso({ tono = "info", children }: { tono?: "info" | "ok" | "error" | "alerta"; children: ReactNode }) {
  const tonos = {
    info: "bg-surface text-fg",
    ok: "bg-success-bg text-success",
    error: "bg-danger-bg text-danger",
    alerta: "bg-warning-bg text-warning",
  };
  return (
    <p role={tono === "error" ? "alert" : "status"} className={cn("rounded-xl p-3 text-sm font-medium", tonos[tono])}>
      {children}
    </p>
  );
}
