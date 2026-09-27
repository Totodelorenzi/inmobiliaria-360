import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Botón redondo translúcido de los visores (44 px mínimo). */
export const botonVisor =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur " +
  "transition hover:bg-black/80 disabled:opacity-50 aria-pressed:bg-accent aria-pressed:text-accent-fg [&_svg]:size-5";

/** Barra superior: título y acciones a la izquierda, cerrar a la derecha. */
export function BarraVisor({ titulo, subtitulo, volverA, children }: { titulo: string; subtitulo?: string; volverA: string; children?: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 bg-linear-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto min-w-0 flex-1 rounded-2xl bg-black/40 px-3 py-1.5 backdrop-blur">
        <h1 className="truncate text-sm font-semibold sm:text-base">{titulo}</h1>
        {subtitulo && (
          <p className="truncate text-xs text-white/80 sm:text-sm" aria-live="polite">
            {subtitulo}
          </p>
        )}
      </div>
      <div className="pointer-events-auto flex gap-2">
        {children}
        <Link href={volverA} className={botonVisor} aria-label="Cerrar y volver a la propiedad">
          <X aria-hidden />
        </Link>
      </div>
    </div>
  );
}
