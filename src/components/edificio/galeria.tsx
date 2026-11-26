"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagenGaleria } from "@/lib/data/proyecto";
import { MAX_DURACION_MS } from "@/lib/tracking/config";
import { registrar } from "@/lib/tracking/cliente";
import { cn } from "@/lib/utils";
import { precargar, useMenosMovimiento } from "./utiles";

type Rastreo = { tipo: "unidad"; projectId: string; unitId: string } | { tipo: "espacio"; projectId: string; floorId: string; spaceId: string };

type Props = {
  titulo: string;
  subtitulo?: string | null;
  imagenes: ImagenGaleria[];
  /** Unidad espejada: los renders de su tipología se muestran dados vuelta. */
  espejada?: boolean;
  rastreo: Rastreo;
  onCerrar: () => void;
  /** Llegó a la última imagen (y la miró un momento). */
  onTerminar?: (vistas: number) => void;
  /** Antes de cerrar: si devuelve true, el cierre se frena (por ejemplo, para mostrar el contacto). */
  antesDeCerrar?: (vistas: number) => boolean;
};

/** Galería a pantalla completa: se desliza con el dedo (scroll nativo con imán), con flechas o con el teclado. */
export function Galeria({ titulo, subtitulo, imagenes, espejada, rastreo, onCerrar, onTerminar, antesDeCerrar }: Props) {
  const pista = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const vistas = useRef(new Set<number>([0]));
  const terminada = useRef(false);
  const menos = useMenosMovimiento();
  const total = imagenes.length;
  const actual = imagenes[indice];

  // Apertura (una vez por galería de unidad).
  useEffect(() => {
    if (rastreo.tipo === "unidad") registrar({ tipo: "rooms_open", projectId: rastreo.projectId, unitId: rastreo.unitId });
  }, [rastreo]);

  // Tiempo visible en cada imagen (se corta al cambiar de imagen, al ocultar la pestaña o al cerrar).
  useEffect(() => {
    if (!actual) return;
    let desde: number | null = document.visibilityState === "visible" ? Date.now() : null;
    const cerrar = () => {
      if (desde === null) return;
      const duracionMs = Math.min(MAX_DURACION_MS, Date.now() - desde);
      desde = null;
      if (duracionMs < 400) return;
      if (rastreo.tipo === "unidad") registrar({ tipo: "room_view", projectId: rastreo.projectId, unitId: rastreo.unitId, roomId: actual.id, duracionMs });
      else registrar({ tipo: "space_view", projectId: rastreo.projectId, floorId: rastreo.floorId, spaceId: rastreo.spaceId, duracionMs, meta: { imagen: actual.nombre } });
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
  }, [actual, rastreo]);

  // La siguiente imagen ya se baja mientras se mira esta.
  useEffect(() => {
    if (indice + 1 < total) void precargar(imagenes[indice + 1].url);
  }, [indice, imagenes, total]);

  // Llegó al final: espera un momento sobre la última y avisa (para ofrecer el contacto).
  useEffect(() => {
    if (indice !== total - 1 || terminada.current || !onTerminar) return;
    const id = window.setTimeout(() => {
      terminada.current = true;
      onTerminar(vistas.current.size);
    }, total === 1 ? 2500 : 1600);
    return () => window.clearTimeout(id);
  }, [indice, total, onTerminar]);

  const ir = useCallback(
    (i: number) => {
      const el = pista.current;
      if (!el) return;
      const destino = Math.max(0, Math.min(total - 1, i));
      el.scrollTo({ left: destino * el.clientWidth, behavior: menos ? "auto" : "smooth" });
    },
    [total, menos],
  );

  const cerrar = useCallback(() => {
    if (antesDeCerrar?.(vistas.current.size)) return;
    onCerrar();
  }, [antesDeCerrar, onCerrar]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") ir(indice + 1);
      if (e.key === "ArrowLeft") ir(indice - 1);
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ir, indice, cerrar]);

  function alDeslizar() {
    const el = pista.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== indice && i >= 0 && i < total) {
      vistas.current.add(i);
      setIndice(i);
    }
  }

  const flecha = "grid size-12 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition-colors hover:border-white/60 disabled:cursor-default disabled:opacity-30";
  return (
    <m.div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-40 bg-[#07080a] text-white"
      initial={{ opacity: 0, scale: menos ? 1 : 0.985 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <div ref={pista} onScroll={alDeslizar} className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {imagenes.map((img, i) => (
          <figure key={img.id} className="relative size-full shrink-0 snap-center snap-always" aria-hidden={i !== indice}>
            {/* eslint-disable-next-line @next/next/no-img-element -- render de Storage ya optimizado */}
            <img
              src={img.url}
              alt={i === indice ? `${img.nombre} (imagen ilustrativa)` : ""}
              loading={i <= 1 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className={cn("absolute inset-0 size-full object-contain select-none", espejada && "-scale-x-100")}
            />
          </figure>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 bg-linear-to-b from-black/75 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/75">{titulo}</p>
          <h2 className="truncate font-display text-xl font-semibold [font-stretch:110%]" aria-live="polite">
            {actual?.nombre}
          </h2>
        </div>
        <p className="shrink-0 pt-1 text-sm text-white/80 tabular-nums">
          {indice + 1} / {total}
        </p>
        <button type="button" onClick={cerrar} className={cn(flecha, "pointer-events-auto")} aria-label="Cerrar las imágenes">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {total > 1 && (
        <>
          <button type="button" onClick={() => ir(indice - 1)} disabled={indice === 0} className={cn(flecha, "absolute top-1/2 left-4 hidden -translate-y-1/2 md:grid")} aria-label="Imagen anterior">
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <button type="button" onClick={() => ir(indice + 1)} disabled={indice === total - 1} className={cn(flecha, "absolute top-1/2 right-4 hidden -translate-y-1/2 md:grid")} aria-label="Imagen siguiente">
            <ChevronRight className="size-6" aria-hidden />
          </button>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-linear-to-t from-black/70 to-transparent px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {total > 1 && (
          <div className="pointer-events-auto flex items-center gap-3 md:hidden">
            <button type="button" onClick={() => ir(indice - 1)} disabled={indice === 0} className={flecha} aria-label="Imagen anterior">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <Puntos total={total} indice={indice} />
            <button type="button" onClick={() => ir(indice + 1)} disabled={indice === total - 1} className={flecha} aria-label="Imagen siguiente">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        )}
        {total > 1 && (
          <div className="hidden md:block">
            <Puntos total={total} indice={indice} />
          </div>
        )}
        {subtitulo && <p className="text-center text-sm text-white/80">{subtitulo}</p>}
        <p className="text-center text-xs text-white/60">Imágenes ilustrativas, no contractuales</p>
      </div>
    </m.div>
  );
}

function Puntos({ total, indice }: { total: number; indice: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === indice ? "w-5 bg-white" : "w-1.5 bg-white/40")} />
      ))}
    </span>
  );
}
