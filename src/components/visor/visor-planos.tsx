"use client";

import "./visor.css";
import { MapPin, Minus, Plus, Rotate3d, Scan, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PlanoVisor } from "@/lib/data/sitio";
import { registrar } from "@/lib/tracking/cliente";
import { CronometroVisible } from "@/lib/tracking/cronometro";
import { cn } from "@/lib/utils";
import { BarraVisor, botonVisor } from "./barra-visor";
import { usePanZoom } from "./use-pan-zoom";

type Props = { planos: PlanoVisor[]; titulo: string; slug: string; tieneTour: boolean; propertyId: string };

/** Tiempo visible en un plano: se registra al cambiar de plano, al salir o al ocultar la pestaña. */
function useTiempoPlano(propertyId: string, planId: string) {
  useEffect(() => {
    const crono = new CronometroVisible();
    const cerrar = () => {
      const ms = crono.tomar();
      if (ms > 500) registrar({ tipo: "plan_view", propertyId, planId, duracionMs: ms });
    };
    const alOcultar = () => document.visibilityState === "hidden" && cerrar();
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      cerrar();
      document.removeEventListener("visibilitychange", alOcultar);
      crono.detener();
    };
  }, [propertyId, planId]);
}

export function VisorPlanos({ planos, titulo, slug, tieneTour, propertyId }: Props) {
  const [indice, setIndice] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const plano = planos[indice];
  const punto = plano.puntos.find((p) => p.id === seleccionado);
  useTiempoPlano(propertyId, plano.id);

  function seleccionar(id: string | null) {
    setSeleccionado(id);
    const elegido = plano.puntos.find((p) => p.id === id);
    if (elegido) registrar({ tipo: "plan_point_click", propertyId, planId: plano.id, meta: { punto: elegido.texto } });
  }

  return (
    <div className="relative size-full bg-neutral-900">
      <LienzoPlano key={plano.id} plano={plano} seleccionado={seleccionado} onSeleccionar={seleccionar} />

      <BarraVisor titulo={titulo} subtitulo={plano.nombre} volverA={`/propiedad/${slug}`}>
        {tieneTour && (
          <Link href={`/propiedad/${slug}/tour`} className={cn(botonVisor, "w-auto gap-2 bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover")}>
            <Rotate3d aria-hidden /> <span className="hidden sm:inline">Tour 360°</span>
          </Link>
        )}
      </BarraVisor>

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {punto && (
          <div role="dialog" aria-label={punto.texto} className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white p-3 text-fg shadow-lg">
            <MapPin className="size-6 shrink-0 text-brand-ink" aria-hidden />
            <p className="min-w-0 flex-1 font-semibold">{punto.texto}</p>
            {punto.scene_id && tieneTour && (
              <Link href={`/propiedad/${slug}/tour?escena=${punto.scene_id}`} className={buttonStyles({ variant: "accent", className: "shrink-0" })}>
                <Rotate3d className="size-5" aria-hidden /> Ver en 360°
              </Link>
            )}
            <button type="button" onClick={() => setSeleccionado(null)} className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Cerrar">
              <X aria-hidden />
            </button>
          </div>
        )}
        {planos.length > 1 && (
          <nav aria-label="Planos">
            <ul className="flex justify-center gap-2 overflow-x-auto [scrollbar-width:none]">
              {planos.map((p, i) => (
                <li key={p.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIndice(i);
                      setSeleccionado(null);
                    }}
                    aria-current={i === indice || undefined}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold backdrop-blur transition",
                      i === indice ? "bg-accent text-accent-fg" : "bg-black/60 text-white hover:bg-black/80",
                    )}
                  >
                    {p.nombre}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

function LienzoPlano({
  plano,
  seleccionado,
  onSeleccionar,
}: {
  plano: PlanoVisor;
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
}) {
  const marcoRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ ancho: number; alto: number } | null>(null);
  const [error, setError] = useState(false);
  const { vista, base, handlers, zoomCentro, restablecer } = usePanZoom(marcoRef, natural);

  return (
    <>
      <div
        ref={marcoRef}
        {...handlers}
        tabIndex={0}
        role="application"
        aria-roledescription="plano"
        aria-label={`${plano.nombre}. Pellizcá o usá + y − para acercar; arrastrá para moverte.`}
        className="absolute inset-0 touch-none overflow-hidden select-none focus-visible:outline-none"
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: base?.ancho,
            height: base?.alto,
            transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})`,
            visibility: base ? "visible" : "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- plano ya optimizado al subirlo */}
          <img
            src={plano.url}
            alt={`Plano: ${plano.nombre}`}
            draggable={false}
            onLoad={(e) => setNatural({ ancho: e.currentTarget.naturalWidth, alto: e.currentTarget.naturalHeight })}
            onError={() => setError(true)}
            className="size-full bg-white"
          />
          {plano.puntos.map((p) => (
            <button
              key={p.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSeleccionar(p.id === seleccionado ? null : p.id)}
              aria-label={p.scene_id ? `${p.texto} (tiene vista 360°)` : p.texto}
              aria-pressed={p.id === seleccionado}
              className="absolute grid size-11 cursor-pointer place-items-center"
              style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%`, transform: `translate(-50%, -50%) scale(${1 / vista.escala})` }}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 border-white shadow-lg transition",
                  p.id === seleccionado ? "scale-125 bg-accent text-accent-fg" : "bg-brand text-brand-fg",
                )}
              >
                {p.scene_id ? <Rotate3d className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!natural && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-3 rounded-full bg-black/70 px-5 py-3 font-semibold" role="status">
            <Spinner className="size-5" /> Cargando plano…
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute inset-x-6 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-black/80 p-5 text-center">
          No pudimos cargar este plano. Revisá tu conexión y recargá la página.
        </p>
      )}

      <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col gap-2">
        <button type="button" className={botonVisor} onClick={() => zoomCentro(1.4)} aria-label="Acercar">
          <Plus aria-hidden />
        </button>
        <button type="button" className={botonVisor} onClick={() => zoomCentro(1 / 1.4)} aria-label="Alejar" disabled={vista.escala <= 1}>
          <Minus aria-hidden />
        </button>
        <button type="button" className={botonVisor} onClick={restablecer} aria-label="Ver el plano completo" disabled={vista.escala <= 1}>
          <Scan aria-hidden />
        </button>
      </div>
    </>
  );
}
