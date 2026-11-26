import "server-only";
import { cache } from "react";
import { aPoligono, aPunto, aSecuencia, esCategoria, type Categoria, type Punto, type Secuencia } from "@/lib/edificio";
import { createPublicClient, tagSitio } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Imagen = { url: string; ancho: number; alto: number };

/** Una vista de la fachada (vista de la calle 1 y de la calle 2). */
export type VistaFachada = Imagen & { nombre: string | null };

export type PisoProyecto = Pick<Tables<"project_floors">, "id" | "numero" | "nombre"> & {
  planta: Imagen | null;
  /** Zona del piso sobre cada vista de la fachada (mismo orden que `vistas`). */
  poligonos: (Punto[] | null)[];
};

export type ImagenGaleria = { id: string; nombre: string; url: string };

export type EspacioProyecto = Pick<Tables<"project_spaces">, "id" | "floor_id" | "nombre" | "slug" | "descripcion"> & {
  punto: Punto | null;
  /** Solo las imágenes cargadas, en orden. */
  imagenes: ImagenGaleria[];
};

export type TipologiaProyecto = Pick<Tables<"unit_types">, "id" | "nombre" | "ambientes" | "dormitorios" | "banos"> & {
  maqueta: Imagen | null;
  /** Solo los ambientes con render cargado, en orden. */
  renders: ImagenGaleria[];
};

export type UnidadProyecto = Pick<
  Tables<"units">,
  "id" | "floor_id" | "unit_type_id" | "codigo" | "superficie_cubierta" | "superficie_total" | "orientacion" | "precio" | "moneda" | "estado" | "espejada"
> & { categoria: Categoria; operacion: "venta" | "alquiler"; poligono: Punto[] | null };

export type Proyecto = Pick<
  Tables<"projects">,
  "id" | "slug" | "nombre" | "ciudad" | "direccion" | "descripcion" | "sobre_titulo" | "sobre_texto" | "entrega" | "color_fondo"
> & {
  amenities: string[];
  transicion: "fundido" | "secuencia";
  secuencia: Secuencia | null;
  /** 1 o 2 vistas de la fachada. */
  vistas: VistaFachada[];
  /** Del más alto al más bajo, como se ven en la fachada. */
  pisos: PisoProyecto[];
  tipologias: TipologiaProyecto[];
  unidades: UnidadProyecto[];
  espacios: EspacioProyecto[];
};

type Fila = Tables<"projects"> & {
  pisos: (Pick<Tables<"project_floors">, "id" | "numero" | "nombre" | "planta_url" | "planta_ancho" | "planta_alto" | "poligono" | "poligono2">)[];
  tipologias: (Pick<Tables<"unit_types">, "id" | "nombre" | "ambientes" | "dormitorios" | "banos" | "maqueta_url" | "maqueta_ancho" | "maqueta_alto" | "orden"> & {
    salas: Pick<Tables<"unit_type_rooms">, "id" | "nombre" | "render_url" | "orden">[];
  })[];
  unidades: (Omit<UnidadProyecto, "poligono" | "categoria" | "operacion"> & { categoria: string; operacion: string; poligono: unknown })[];
  espacios: (Pick<Tables<"project_spaces">, "id" | "floor_id" | "nombre" | "slug" | "descripcion" | "punto" | "orden"> & {
    imagenes: Pick<Tables<"project_space_images">, "id" | "nombre" | "url" | "orden">[];
  })[];
};

const imagen = (url: string | null, ancho: number | null, alto: number | null): Imagen | null => (url && ancho && alto ? { url, ancho, alto } : null);
const enOrden = <T extends { orden: number }>(lista: T[]) => [...lista].sort((a, b) => a.orden - b.orden);

/**
 * Un proyecto publicado con todo lo que muestra su landing (son pocas filas: una sola consulta,
 * cacheada con el tag del sitio; el panel la invalida al cambiar estados, imágenes, zonas o textos).
 */
export const getProyecto = cache(async (agencyId: string, slug: string): Promise<Proyecto | null> => {
  const { data, error } = await createPublicClient({ tags: [tagSitio(agencyId)] })
    .from("projects")
    .select(
      "*, " +
        "pisos:project_floors(id, numero, nombre, planta_url, planta_ancho, planta_alto, poligono, poligono2), " +
        "tipologias:unit_types(id, nombre, ambientes, dormitorios, banos, maqueta_url, maqueta_ancho, maqueta_alto, orden, " +
        "salas:unit_type_rooms(id, nombre, render_url, orden)), " +
        "unidades:units(id, floor_id, unit_type_id, codigo, categoria, operacion, superficie_cubierta, superficie_total, orientacion, precio, moneda, estado, espejada, poligono), " +
        "espacios:project_spaces(id, floor_id, nombre, slug, descripcion, punto, orden, imagenes:project_space_images(id, nombre, url, orden))",
    )
    .eq("agency_id", agencyId)
    .eq("publicado", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el proyecto: ${error.message}`);
  if (!data) return null;
  const p = data as unknown as Fila;

  const vistas: VistaFachada[] = [];
  const v1 = imagen(p.fachada_url, p.fachada_ancho, p.fachada_alto);
  const v2 = imagen(p.fachada2_url, p.fachada2_ancho, p.fachada2_alto);
  if (v1) vistas.push({ ...v1, nombre: p.vista1_nombre });
  if (v2) vistas.push({ ...v2, nombre: p.vista2_nombre });

  const conUrl = <T extends { url: string | null }>(x: T): x is T & { url: string } => Boolean(x.url);
  return {
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    ciudad: p.ciudad,
    direccion: p.direccion,
    descripcion: p.descripcion,
    sobre_titulo: p.sobre_titulo,
    sobre_texto: p.sobre_texto,
    entrega: p.entrega,
    color_fondo: p.color_fondo,
    amenities: p.amenities ?? [],
    transicion: p.transicion === "secuencia" && aSecuencia(p.secuencia) && v2 ? "secuencia" : "fundido",
    secuencia: aSecuencia(p.secuencia),
    vistas,
    pisos: p.pisos
      .map((f) => ({
        id: f.id,
        numero: f.numero,
        nombre: f.nombre,
        planta: imagen(f.planta_url, f.planta_ancho, f.planta_alto),
        // La zona de la vista 2 solo cuenta si la vista existe.
        poligonos: [aPoligono(f.poligono), ...(v1 && v2 ? [aPoligono(f.poligono2)] : [])],
      }))
      .sort((a, b) => b.numero - a.numero),
    tipologias: enOrden(p.tipologias).map((t) => ({
      id: t.id,
      nombre: t.nombre,
      ambientes: t.ambientes,
      dormitorios: t.dormitorios,
      banos: t.banos,
      maqueta: imagen(t.maqueta_url, t.maqueta_ancho, t.maqueta_alto),
      renders: enOrden(t.salas)
        .map((s) => ({ id: s.id, nombre: s.nombre, url: s.render_url }))
        .filter(conUrl),
    })),
    unidades: p.unidades
      .map((u) => ({
        ...u,
        categoria: esCategoria(u.categoria) ? u.categoria : "departamento",
        operacion: u.operacion === "alquiler" ? ("alquiler" as const) : ("venta" as const),
        poligono: aPoligono(u.poligono),
      }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true })),
    espacios: enOrden(p.espacios).map((e) => ({
      id: e.id,
      floor_id: e.floor_id,
      nombre: e.nombre,
      slug: e.slug,
      descripcion: e.descripcion,
      punto: aPunto(e.punto),
      imagenes: enOrden(e.imagenes)
        .map((i) => ({ id: i.id, nombre: i.nombre ?? e.nombre, url: i.url }))
        .filter(conUrl),
    })),
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
