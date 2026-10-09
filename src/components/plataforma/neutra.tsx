import { Rotate3d } from "lucide-react";
import type { ReactNode } from "react";

/** Marco de las páginas de la plataforma (sin la marca de ninguna inmobiliaria). */
export function PaginaNeutra({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-surface p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-(--radius-card) border border-border bg-bg p-8 text-center">
        <Rotate3d className="size-10 text-muted" aria-hidden />
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
