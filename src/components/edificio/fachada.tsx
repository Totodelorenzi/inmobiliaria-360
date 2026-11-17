"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { centro, puntosSvg, rutaPiso, type Punto } from "@/lib/edificio";
import { plural } from "@/lib/format";

export type PisoFachada = { numero: number; nombre: string; poligono: Punto[]; disponibles: number };

type Props = {
  slug: string;
  nombre: string;
  imagen: { url: string; ancho: number; alto: number };
  pisos: PisoFachada[];
};

/**
 * Fachada con los pisos tocables. Con mouse, pasar por encima ilumina el piso y un clic entra.
 * Con el dedo, el primer toque ilumina (y muestra el número) y el segundo entra.
 */
export function Fachada({ slug, nombre, imagen, pisos }: Props) {
  const router = useRouter();
  const [activo, setActivo] = useState<number | null>(null);
  const [tactil, setTactil] = useState(false);
  const puntero = useRef("mouse");
  // Piso que ya recibió su primer toque (aparte de `activo`, que también cambia con el foco y el mouse).
  const tocado = useRef<number | null>(null);
  const elegido = pisos.find((p) => p.numero === activo);

  function iluminar(numero: number) {
    setActivo(numero);
    // El piso iluminado se pide por adelantado: el toque o clic que entra es inmediato.
    router.prefetch(rutaPiso(slug, numero));
  }

  function tocar(numero: number) {
    const dedo = puntero.current !== "mouse";
    setTactil(dedo);
    if (dedo && tocado.current !== numero) {
      tocado.current = numero;
      iluminar(numero);
    } else router.push(rutaPiso(slug, numero));
  }

  return (
    // El ancho se limita para que la fachada entera entre en la pantalla de una compu.
    <div className="relative mx-auto w-full select-none" style={{ maxWidth: `calc((100dvh - 9rem) * ${imagen.ancho / imagen.alto})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya optimizada; es el LCP y se precarga desde el <head> */}
      <img
        src={imagen.url}
        width={imagen.ancho}
        height={imagen.alto}
        alt={`Fachada de ${nombre}`}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="block h-auto w-full"
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        role="group"
        aria-label="Pisos del edificio"
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          tocado.current = null;
          setActivo(null);
        }}
      >
        {pisos.map((p) => (
          <polygon
            key={p.numero}
            points={puntosSvg(p.poligono)}
            vectorEffect="non-scaling-stroke"
            role="link"
            tabIndex={0}
            aria-label={`${p.nombre}: ${plural(p.disponibles, "unidad disponible", "unidades disponibles")}`}
            className={
              "cursor-pointer outline-none transition-[fill,stroke] duration-200 focus-visible:stroke-white " +
              (activo === p.numero ? "fill-(--accent)/45 stroke-white stroke-2" : "fill-transparent stroke-white/40 stroke-1")
            }
            onPointerDown={(e) => (puntero.current = e.pointerType)}
            onPointerEnter={(e) => e.pointerType === "mouse" && iluminar(p.numero)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}
            onFocus={() => iluminar(p.numero)}
            onClick={() => tocar(p.numero)}
            onKeyDown={(e) => e.key === "Enter" && router.push(rutaPiso(slug, p.numero))}
          />
        ))}
      </svg>
      {elegido && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/80 px-4 py-2 text-center text-white shadow-lg backdrop-blur-sm"
          style={{ left: `${centro(elegido.poligono)[0]}%`, top: `${centro(elegido.poligono)[1]}%` }}
          aria-hidden
        >
          <p className="text-lg leading-tight font-bold whitespace-nowrap">{elegido.nombre}</p>
          <p className="text-xs whitespace-nowrap text-white/85">
            {elegido.disponibles > 0 ? `${plural(elegido.disponibles, "disponible", "disponibles")}` : "Sin unidades disponibles"}
          </p>
          {tactil && <p className="mt-0.5 text-xs font-semibold whitespace-nowrap text-(--accent)">Tocá de nuevo para entrar</p>}
        </div>
      )}
    </div>
  );
}
