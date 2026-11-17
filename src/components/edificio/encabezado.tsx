import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  titulo: string;
  detalle?: string | null;
  /** Paso anterior del recorrido (en la fachada no hay). */
  volver?: { href: string; texto: string };
};

/** Barra de cada paso del recorrido del edificio: botón para volver al anterior y dónde estoy. */
export function Encabezado({ titulo, detalle, volver }: Props) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-border bg-bg/95 px-3 py-2 backdrop-blur">
      {volver && (
        <Link href={volver.href} className="-ml-1 flex min-h-11 shrink-0 items-center gap-0.5 rounded-full pr-3 pl-1 text-sm font-semibold text-brand-ink hover:bg-surface">
          <ChevronLeft className="size-5" aria-hidden /> {volver.texto}
        </Link>
      )}
      <div className={volver ? "min-w-0 flex-1 text-right" : "min-w-0 flex-1"}>
        <h1 className="truncate text-base leading-tight font-bold">{titulo}</h1>
        {detalle && <p className="truncate text-xs text-muted">{detalle}</p>}
      </div>
    </header>
  );
}
