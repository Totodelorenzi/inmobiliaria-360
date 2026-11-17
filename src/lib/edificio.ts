/**
 * Módulo desarrolladora: tipos y funciones puras del edificio (zonas tocables, estados, precios).
 * Sin Next ni Supabase: lo usan el servidor, los componentes cliente y el panel.
 */
import type { Enums, Tables } from "@/types/database";

/** Vértice de una zona tocable, en porcentajes de la imagen. */
export type Punto = [number, number];

export type EstadoUnidad = Enums<"estado_unidad">;

export const ESTADOS_UNIDAD: EstadoUnidad[] = ["disponible", "reservada", "vendida"];

export const ESTADO_UNIDAD_LABEL: Record<EstadoUnidad, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
};

/** Color de cada estado (variables del tema, las mismas de los badges). */
export const ESTADO_UNIDAD_COLOR: Record<EstadoUnidad, string> = {
  disponible: "var(--estado-disponible)",
  reservada: "var(--estado-reservada)",
  vendida: "var(--estado-vendida)",
};

/** Lo que guarda la base (jsonb) → lista de vértices, o null si no hay una zona válida. */
export function aPoligono(valor: unknown): Punto[] | null {
  if (!Array.isArray(valor) || valor.length < 3) return null;
  const puntos = valor.filter((p): p is Punto => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number");
  return puntos.length === valor.length ? puntos : null;
}

/** Atributo `points` de un <polygon> dibujado en un viewBox de 100×100. */
export const puntosSvg = (poligono: Punto[]) => poligono.map(([x, y]) => `${x},${y}`).join(" ");

/** Centro de la zona (promedio de los vértices): ahí va el cartel con el número o el código. */
export function centro(poligono: Punto[]): Punto {
  const suma = poligono.reduce<Punto>(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
  return [suma[0] / poligono.length, suma[1] / poligono.length];
}

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "USD 95.000" o "Consultar" (sin precio, o unidad vendida). */
export function precioUnidad(u: Pick<Tables<"units">, "precio" | "moneda" | "estado">) {
  if (u.precio == null || u.estado === "vendida") return "Consultar";
  return `${u.moneda === "USD" ? "USD" : "$"} ${numero.format(u.precio)}`;
}

/** "78 m²" (cubiertos si están cargados; si no, totales). */
export function metrosUnidad(u: Pick<Tables<"units">, "superficie_cubierta" | "superficie_total">) {
  const m = u.superficie_cubierta ?? u.superficie_total;
  return m ? `${numero.format(m)} m²` : null;
}

export const rutaProyecto = (slug: string) => `/proyecto/${slug}`;
export const rutaPiso = (slug: string, numeroPiso: number) => `/proyecto/${slug}/piso/${numeroPiso}`;
export const rutaUnidad = (slug: string, codigo: string) => `/proyecto/${slug}/unidad/${codigo.toLowerCase()}`;
export const rutaAmbientes = (slug: string, codigo: string) => `${rutaUnidad(slug, codigo)}/ambientes`;
