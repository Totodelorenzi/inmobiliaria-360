"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { centro, ESTADO_UNIDAD_COLOR, ESTADO_UNIDAD_LABEL, letraUnidad, puntosSvg, rutaUnidad, type EstadoUnidad, type Punto } from "@/lib/edificio";

export type UnidadPlanta = { codigo: string; estado: EstadoUnidad; poligono: Punto[] };

type Props = {
  slug: string;
  nombre: string;
  imagen: { url: string; ancho: number; alto: number };
  unidades: UnidadPlanta[];
};

/** Planta del piso vista desde arriba: cada unidad coloreada según su estado, con su código. */
export function Planta({ slug, nombre, imagen, unidades }: Props) {
  const router = useRouter();
  return (
    <div className="relative mx-auto w-full select-none" style={{ maxWidth: `calc((100dvh - 14rem) * ${imagen.ancho / imagen.alto})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya optimizada, con su lugar reservado */}
      <img src={imagen.url} width={imagen.ancho} height={imagen.alto} alt={`Planta de ${nombre}`} fetchPriority="high" decoding="async" draggable={false} className="block h-auto w-full" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {unidades.map((u) => (
          <polygon
            key={u.codigo}
            points={puntosSvg(u.poligono)}
            vectorEffect="non-scaling-stroke"
            style={{ fill: ESTADO_UNIDAD_COLOR[u.estado], stroke: ESTADO_UNIDAD_COLOR[u.estado] }}
            className="cursor-pointer stroke-2 opacity-45 transition-opacity duration-150 hover:opacity-70"
            onClick={() => router.push(rutaUnidad(slug, u.codigo))}
          />
        ))}
      </svg>
      {unidades.map((u) => {
        const [x, y] = centro(u.poligono);
        return (
          <Link
            key={u.codigo}
            href={rutaUnidad(slug, u.codigo)}
            aria-label={`Unidad ${u.codigo}, ${ESTADO_UNIDAD_LABEL[u.estado].toLowerCase()}`}
            className="absolute grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full px-3 text-base font-bold text-white shadow-md ring-2 ring-white/80"
            style={{ left: `${x}%`, top: `${y}%`, background: ESTADO_UNIDAD_COLOR[u.estado] }}
          >
            {letraUnidad(u.codigo)}
          </Link>
        );
      })}
    </div>
  );
}
