import "server-only";
import { aPoligono, aPunto, type Punto } from "@/lib/edificio";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Proyectos de la inmobiliaria activa (publicados o no). */
export async function getProyectosAdmin(agencyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, nombre, slug, ciudad, publicado, fachada_url, unidades:units(estado)")
    .eq("agency_id", agencyId)
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar los proyectos: ${error.message}`);
  return data;
}

export type PisoAdmin = Pick<Tables<"project_floors">, "id" | "numero" | "nombre" | "planta_url"> & { poligono: Punto[] | null; poligono2: Punto[] | null };
export type TipologiaAdmin = Pick<Tables<"unit_types">, "id" | "nombre" | "maqueta_url"> & {
  ambientes: Pick<Tables<"unit_type_rooms">, "id" | "nombre" | "render_url">[];
};
export type UnidadAdmin = Pick<
  Tables<"units">,
  "id" | "floor_id" | "unit_type_id" | "codigo" | "estado" | "precio" | "moneda" | "superficie_cubierta" | "superficie_total" | "categoria" | "operacion"
> & {
  poligono: Punto[] | null;
};
export type EspacioAdmin = Pick<Tables<"project_spaces">, "id" | "floor_id" | "nombre"> & {
  punto: Punto | null;
  imagenes: Pick<Tables<"project_space_images">, "id" | "nombre" | "url">[];
};
export type ProyectoAdmin = Pick<
  Tables<"projects">,
  | "id"
  | "agency_id"
  | "nombre"
  | "slug"
  | "publicado"
  | "fachada_url"
  | "fachada2_url"
  | "sobre_titulo"
  | "sobre_texto"
  | "direccion"
  | "ciudad"
  | "descripcion"
  | "entrega"
  | "vista1_nombre"
  | "vista2_nombre"
  | "transicion"
> & {
  amenities: string[];
  tieneSecuencia: boolean;
  pisos: PisoAdmin[];
  tipologias: TipologiaAdmin[];
  unidades: UnidadAdmin[];
  espacios: EspacioAdmin[];
};

/** Un proyecto de la inmobiliaria activa con todo lo que edita el panel. */
export async function getProyectoAdmin(agencyId: string, id: string): Promise<ProyectoAdmin | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, agency_id, nombre, slug, publicado, fachada_url, fachada2_url, sobre_titulo, sobre_texto, direccion, ciudad, descripcion, entrega, vista1_nombre, vista2_nombre, transicion, amenities, secuencia, " +
        "pisos:project_floors(id, numero, nombre, planta_url, poligono, poligono2), " +
        "tipologias:unit_types(id, nombre, maqueta_url, orden, ambientes:unit_type_rooms(id, nombre, render_url, orden)), " +
        "unidades:units(id, floor_id, unit_type_id, codigo, estado, precio, moneda, superficie_cubierta, superficie_total, categoria, operacion, poligono), " +
        "espacios:project_spaces(id, floor_id, nombre, punto, orden, imagenes:project_space_images(id, nombre, url, orden))",
    )
    .eq("agency_id", agencyId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el proyecto: ${error.message}`);
  if (!data) return null;
  type ConOrden<T> = T & { orden: number };
  const fila = data as unknown as Omit<ProyectoAdmin, "pisos" | "tipologias" | "unidades" | "espacios" | "amenities" | "tieneSecuencia"> & {
    amenities: string[] | null;
    secuencia: unknown;
    pisos: (Omit<PisoAdmin, "poligono" | "poligono2"> & { poligono: unknown; poligono2: unknown })[];
    tipologias: ConOrden<TipologiaAdmin & { ambientes: ConOrden<TipologiaAdmin["ambientes"][number]>[] }>[];
    unidades: (Omit<UnidadAdmin, "poligono"> & { poligono: unknown })[];
    espacios: ConOrden<Omit<EspacioAdmin, "punto" | "imagenes"> & { punto: unknown; imagenes: ConOrden<EspacioAdmin["imagenes"][number]>[] }>[];
  };
  const { secuencia, ...resto } = fila;
  const enOrden = <T extends { orden: number }>(l: T[]) => [...l].sort((a, b) => a.orden - b.orden);
  return {
    ...resto,
    amenities: fila.amenities ?? [],
    tieneSecuencia: Boolean(secuencia),
    pisos: fila.pisos.map((p) => ({ ...p, poligono: aPoligono(p.poligono), poligono2: aPoligono(p.poligono2) })).sort((a, b) => b.numero - a.numero),
    tipologias: enOrden(fila.tipologias).map((t) => ({ ...t, ambientes: enOrden(t.ambientes) })),
    unidades: fila.unidades.map((u) => ({ ...u, poligono: aPoligono(u.poligono) })).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true })),
    espacios: enOrden(fila.espacios).map((e) => ({ ...e, punto: aPunto(e.punto), imagenes: enOrden(e.imagenes) })),
  };
}
