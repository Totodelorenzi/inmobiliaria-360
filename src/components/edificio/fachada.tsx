"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { centro, puntosSvg, rutaPiso, type Punto } from "@/lib/edificio";
import { plural } from "@/lib/format";

export type PisoFachada = {
  numero: number;
  nombre: string;
  poligono: Punto[];
  disponibles: number;
};

type Props = {
  slug: string;
  nombre: string;
  imagen: { url: string; ancho: number; alto: number };
  pisos: PisoFachada[];
};

/**
 * Fachada con los pisos tocables. Con mouse, pasar por encima ilumina el piso y un clic entra.
 * Con el dedo, el primer toque ilumina (y muestra el número) y el segundo entra.
 * En el celular la imagen se recorta al edificio (el contorno de los pisos): ocupa todo el ancho
 * y cada piso queda más alto para tocarlo. Desde md se ve la imagen entera.
 */
export function Fachada({ slug, nombre, imagen, pisos }: Props) {
  const router = useRouter();
  const [activo, setActivo] = useState<number | null>(null);
  const [tactil, setTactil] = useState(false);
  const puntero = useRef("mouse");
  // Piso que ya recibió su primer toque (aparte de `activo`, que también cambia con el foco y el mouse).
  const tocado = useRef<number | null>(null);
  const elegido = pisos.find((p) => p.numero === activo);
  const recorte = recorteDe(pisos);
  const proporcion = imagen.ancho / imagen.alto;
  // El cartel del piso elegido va arriba de su franja, salvo en el piso más alto (no taparía el encabezado).
  const arriba = elegido ? Math.min(...elegido.poligono.map(([, y]) => y)) : 0;
  const cartelAbajo = (arriba - recorte.y) / recorte.alto < 0.2;

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
    <div
      className="relative mx-auto aspect-(--recorte) w-full select-none md:aspect-(--imagen)"
      style={
        {
          maxWidth: `calc((100dvh - 9rem) * ${proporcion})`,
          "--imagen": proporcion,
          "--recorte": (recorte.ancho / recorte.alto) * proporcion,
          "--x": `${(-recorte.x / recorte.ancho) * 100}%`,
          "--y": `${(-recorte.y / recorte.alto) * 100}%`,
          "--w": `${(100 / recorte.ancho) * 100}%`,
          "--h": `${(100 / recorte.alto) * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className={CAPA}>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya optimizada; es el LCP y se precarga desde el <head> */}
          <img
            src={imagen.url}
            width={imagen.ancho}
            height={imagen.alto}
            alt={`Fachada de ${nombre}`}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            className="block size-full"
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
          {/* Número de cada piso siempre a la vista: invita a tocar y orienta antes del primer toque. */}
          {pisos.map((p) => {
            const xs = p.poligono.map(([x]) => x);
            return (
              <span
                key={p.numero}
                aria-hidden
                className={
                  "pointer-events-none absolute -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow transition-colors " +
                  (activo === p.numero ? "bg-(--accent)" : "bg-black/60")
                }
                style={{
                  left: `${Math.min(...xs) + 1}%`,
                  top: `${centro(p.poligono)[1]}%`,
                }}
              >
                {etiquetaPiso(p.numero)}
              </span>
            );
          })}
        </div>
      </div>
      {/* El cartel va en una capa sin recorte: en los pisos de abajo puede salir de la imagen. */}
      <div className={`pointer-events-none ${CAPA}`}>
        {elegido && (
          <div
            className={
              "absolute z-10 -translate-x-1/2 rounded-2xl bg-black/80 px-4 py-2 text-center text-white shadow-lg backdrop-blur-sm " +
              (cartelAbajo ? "translate-y-2" : "-translate-y-[calc(100%+0.5rem)]")
            }
            style={{
              left: `${centro(elegido.poligono)[0]}%`,
              top: `${cartelAbajo ? Math.max(...elegido.poligono.map(([, y]) => y)) : arriba}%`,
            }}
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
    </div>
  );
}

/** Imagen y capas: en el celular, desplazadas y agrandadas para que el recorte llene el contenedor. */
const CAPA = "absolute top-(--y) left-(--x) h-(--h) w-(--w) md:inset-0 md:size-full";

const etiquetaPiso = (numero: number) => (numero === 0 ? "PB" : numero > 0 ? `${numero}°` : `S${-numero}`);

/** Rectángulo (en %) que encierra todos los pisos, con un margen chico; sin pisos, la imagen entera. */
function recorteDe(pisos: PisoFachada[]) {
  const puntos = pisos.flatMap((p) => p.poligono);
  if (!puntos.length) return { x: 0, y: 0, ancho: 100, alto: 100 };
  const MARGEN = 1.5;
  const x = Math.max(0, Math.min(...puntos.map(([px]) => px)) - MARGEN);
  const y = Math.max(0, Math.min(...puntos.map(([, py]) => py)) - MARGEN);
  const ancho = Math.min(100, Math.max(...puntos.map(([px]) => px)) + MARGEN) - x;
  const alto = Math.min(100, Math.max(...puntos.map(([, py]) => py)) + MARGEN) - y;
  return { x, y, ancho, alto };
}
