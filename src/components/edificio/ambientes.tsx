"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { botonVisor } from "@/components/visor/barra-visor";
import { MAX_DURACION_MS } from "@/lib/tracking/config";
import { registrar } from "@/lib/tracking/cliente";
import { cn } from "@/lib/utils";

type Props = {
  titulo: string;
  volverA: string;
  ambientes: { id: string; nombre: string; render_url: string }[];
  /** Unidad espejada: los renders de su tipología se muestran espejados. */
  espejada: boolean;
  rastreo: { projectId: string; unitId: string };
};

/** Renders de cada ambiente a pantalla completa, con fundido suave entre uno y otro. */
export function Ambientes({ titulo, volverA, ambientes, espejada, rastreo }: Props) {
  const [indice, setIndice] = useState(0);
  const total = ambientes.length;
  const actual = ambientes[indice];
  const inicioToque = useRef<number | null>(null);
  const { projectId, unitId } = rastreo;

  const ir = useCallback((paso: number) => setIndice((i) => (i + paso + total) % total), [total]);

  // Apertura del recorrido (una vez) y tiempo visible en cada render.
  useEffect(() => {
    registrar({ tipo: "rooms_open", projectId, unitId });
  }, [projectId, unitId]);

  useEffect(() => {
    let desde = document.visibilityState === "visible" ? Date.now() : null;
    const cerrar = () => {
      if (desde === null) return;
      const duracionMs = Math.min(MAX_DURACION_MS, Date.now() - desde);
      desde = null;
      registrar({ tipo: "room_view", projectId, unitId, roomId: actual.id, duracionMs });
    };
    const alCambiar = () => {
      if (document.visibilityState === "hidden") cerrar();
      else desde = Date.now();
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => {
      document.removeEventListener("visibilitychange", alCambiar);
      cerrar();
    };
  }, [actual.id, projectId, unitId]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ir]);

  // El render siguiente se baja mientras se mira el actual: el fundido no espera a la red.
  useEffect(() => {
    if (total > 1) new Image().src = ambientes[(indice + 1) % total].render_url;
  }, [ambientes, indice, total]);

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-black text-white"
      onTouchStart={(e) => (inicioToque.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (inicioToque.current === null) return;
        const dx = e.changedTouches[0].clientX - inicioToque.current;
        inicioToque.current = null;
        if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
      }}
    >
      {ambientes.map((a, i) => (
        // Todos apilados: cambia la opacidad (fundido). Solo se cargan el actual y sus vecinos.
        // eslint-disable-next-line @next/next/no-img-element -- render de Storage ya optimizado
        <img
          key={a.id}
          src={i === indice || i === (indice + 1) % total || i === (indice - 1 + total) % total ? a.render_url : undefined}
          alt={i === indice ? `Render de ${a.nombre}` : ""}
          aria-hidden={i !== indice}
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-contain transition-opacity duration-500 ease-in-out landscape:object-cover",
            i === indice ? "opacity-100" : "opacity-0",
            espejada && "-scale-x-100",
          )}
        />
      ))}

      <div className="absolute inset-x-0 top-0 flex items-start gap-2 bg-linear-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 rounded-2xl bg-black/40 px-3 py-1.5 backdrop-blur">
          <p className="truncate text-xs text-white/80">{titulo}</p>
          <h1 className="truncate text-base font-semibold" aria-live="polite">
            {actual.nombre}
          </h1>
        </div>
        <Link href={volverA} className={botonVisor} aria-label="Cerrar y volver a la unidad">
          <X aria-hidden />
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-linear-to-t from-black/80 to-transparent p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {total > 1 && (
          <div className="flex w-full max-w-md items-center gap-2">
            <button type="button" onClick={() => ir(-1)} className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-black/60 px-4 font-semibold backdrop-blur hover:bg-black/80">
              <ChevronLeft className="size-5" aria-hidden /> Anterior
            </button>
            <span className="shrink-0 px-1 text-sm text-white/85 tabular-nums">
              {indice + 1} / {total}
            </span>
            <button type="button" onClick={() => ir(1)} className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-white px-4 font-semibold text-black hover:bg-white/90">
              Siguiente <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        )}
        <p className="text-center text-xs text-white/75">Imágenes ilustrativas, no contractuales</p>
      </div>
    </div>
  );
}
