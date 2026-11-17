import "server-only";
import { cache } from "react";
import { aPoligono, type Punto } from "@/lib/edificio";
import { createPublicClient, tagSitio } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type PisoProyecto = Pick<Tables<"project_floors">, "id" | "numero" | "nombre" | "planta_url" | "planta_ancho" | "planta_alto"> & {
  poligono: Punto[] | null;
};

export type AmbienteTipologia = Pick<Tables<"unit_type_rooms">, "id" | "nombre"> & { render_url: string };

export type TipologiaProyecto = Pick<
  Tables<"unit_types">,
  "id" | "nombre" | "ambientes" | "dormitorios" | "banos" | "maqueta_url" | "maqueta_ancho" | "maqueta_alto"
> & {
  /** Solo los ambientes con render cargado, en orden. */
  renders: AmbienteTipologia[];
};

export type UnidadProyecto = Pick<
  Tables<"units">,
  "id" | "floor_id" | "unit_type_id" | "codigo" | "superficie_cubierta" | "superficie_total" | "orientacion" | "precio" | "moneda" | "estado" | "espejada"
> & { poligono: Punto[] | null };

export type Proyecto = Pick<
  Tables<"projects">,
  "id" | "slug" | "nombre" | "ciudad" | "direccion" | "descripcion" | "fachada_url" | "fachada_ancho" | "fachada_alto"
> & {
  /** Del más alto al más bajo, como se ven en la fachada. */
  pisos: PisoProyecto[];
  tipologias: TipologiaProyecto[];
  unidades: UnidadProyecto[];
};

type Fila = Omit<Proyecto, "pisos" | "tipologias" | "unidades"> & {
  pisos: (Omit<PisoProyecto, "poligono"> & { poligono: unknown })[];
  tipologias: (Omit<TipologiaProyecto, "renders"> & { orden: number; salas: { id: string; nombre: string; render_url: string | null; orden: number }[] })[];
  unidades: (Omit<UnidadProyecto, "poligono"> & { poligono: unknown })[];
};

/**
 * Un proyecto publicado con todo lo que muestran sus pantallas (son pocas filas: una sola consulta,
 * cacheada con el tag del sitio; el panel la invalida al cambiar estados, imágenes o zonas).
 */
export const getProyecto = cache(async (agencyId: string, slug: string): Promise<Proyecto | null> => {
  const { data, error } = await createPublicClient({ tags: [tagSitio(agencyId)] })
    .from("projects")
    .select(
      "id, slug, nombre, ciudad, direccion, descripcion, fachada_url, fachada_ancho, fachada_alto, " +
        "pisos:project_floors(id, numero, nombre, planta_url, planta_ancho, planta_alto, poligono), " +
        "tipologias:unit_types(id, nombre, ambientes, dormitorios, banos, maqueta_url, maqueta_ancho, maqueta_alto, orden, " +
        "salas:unit_type_rooms(id, nombre, render_url, orden)), " +
        "unidades:units(id, floor_id, unit_type_id, codigo, superficie_cubierta, superficie_total, orientacion, precio, moneda, estado, espejada, poligono)",
    )
    .eq("agency_id", agencyId)
    .eq("publicado", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el proyecto: ${error.message}`);
  if (!data) return null;
  const { pisos, tipologias, unidades, ...proyecto } = data as unknown as Fila;
  return {
    ...proyecto,
    pisos: pisos.map((p) => ({ ...p, poligono: aPoligono(p.poligono) })).sort((a, b) => b.numero - a.numero),
    tipologias: tipologias
      .sort((a, b) => a.orden - b.orden)
      .map(({ id, nombre, ambientes, dormitorios, banos, maqueta_url, maqueta_ancho, maqueta_alto, salas }) => ({
        id,
        nombre,
        ambientes,
        dormitorios,
        banos,
        maqueta_url,
        maqueta_ancho,
        maqueta_alto,
        renders: salas
          .filter((s): s is typeof s & { render_url: string } => Boolean(s.render_url))
          .sort((a, b) => a.orden - b.orden)
          .map((s) => ({ id: s.id, nombre: s.nombre, render_url: s.render_url })),
      })),
    unidades: unidades.map((u) => ({ ...u, poligono: aPoligono(u.poligono) })).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true })),
  };
});

/** Proyectos publicados de la inmobiliaria (inicio de una desarrolladora y sitemap). */
export async function getProyectos(agencyId: string) {
  const { data, error } = await createPublicClient({ tags: [tagSitio(agencyId)] })
    .from("projects")
    .select("slug, nombre, ciudad, fachada_url, updated_at")
    .eq("agency_id", agencyId)
    .eq("publicado", true)
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar los proyectos: ${error.message}`);
  return data;
}

/** La unidad pedida en la URL (el código no distingue mayúsculas) con su piso y su tipología. */
export function buscarUnidad(proyecto: Proyecto, codigo: string) {
  const unidad = proyecto.unidades.find((u) => u.codigo.toLowerCase() === codigo.toLowerCase());
  const piso = unidad && proyecto.pisos.find((p) => p.id === unidad.floor_id);
  const tipologia = unidad && proyecto.tipologias.find((t) => t.id === unidad.unit_type_id);
  return unidad && piso && tipologia ? { unidad, piso, tipologia } : null;
}
