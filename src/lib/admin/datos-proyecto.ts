import "server-only";
import { aPoligono, type Punto } from "@/lib/edificio";
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

export type PisoAdmin = Pick<Tables<"project_floors">, "id" | "numero" | "nombre" | "planta_url"> & { poligono: Punto[] | null };
export type TipologiaAdmin = Pick<Tables<"unit_types">, "id" | "nombre" | "maqueta_url"> & {
  ambientes: Pick<Tables<"unit_type_rooms">, "id" | "nombre" | "render_url">[];
};
export type UnidadAdmin = Pick<Tables<"units">, "id" | "floor_id" | "unit_type_id" | "codigo" | "estado" | "precio" | "moneda" | "superficie_cubierta" | "superficie_total"> & {
  poligono: Punto[] | null;
};
export type ProyectoAdmin = Pick<Tables<"projects">, "id" | "agency_id" | "nombre" | "slug" | "publicado" | "fachada_url"> & {
  pisos: PisoAdmin[];
  tipologias: TipologiaAdmin[];
  unidades: UnidadAdmin[];
};

/** Un proyecto de la inmobiliaria activa con todo lo que edita el panel. */
export async function getProyectoAdmin(agencyId: string, id: string): Promise<ProyectoAdmin | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, agency_id, nombre, slug, publicado, fachada_url, " +
        "pisos:project_floors(id, numero, nombre, planta_url, poligono), " +
        "tipologias:unit_types(id, nombre, maqueta_url, orden, ambientes:unit_type_rooms(id, nombre, render_url, orden)), " +
        "unidades:units(id, floor_id, unit_type_id, codigo, estado, precio, moneda, superficie_cubierta, superficie_total, poligono)",
    )
    .eq("agency_id", agencyId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el proyecto: ${error.message}`);
  if (!data) return null;
  const fila = data as unknown as Omit<ProyectoAdmin, "pisos" | "tipologias" | "unidades"> & {
    pisos: (Omit<PisoAdmin, "poligono"> & { poligono: unknown })[];
    tipologias: (TipologiaAdmin & { orden: number; ambientes: (TipologiaAdmin["ambientes"][number] & { orden: number })[] })[];
    unidades: (Omit<UnidadAdmin, "poligono"> & { poligono: unknown })[];
  };
  return {
    ...fila,
    pisos: fila.pisos.map((p) => ({ ...p, poligono: aPoligono(p.poligono) })).sort((a, b) => b.numero - a.numero),
    tipologias: fila.tipologias.sort((a, b) => a.orden - b.orden).map((t) => ({ ...t, ambientes: [...t.ambientes].sort((a, b) => a.orden - b.orden) })),
    unidades: fila.unidades.map((u) => ({ ...u, poligono: aPoligono(u.poligono) })).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true })),
  };
}
