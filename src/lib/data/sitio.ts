import "server-only";
import { cache } from "react";
import { getAgencyId, isSupabaseConfigured } from "@/lib/env";
import { normalizarBusqueda } from "@/lib/format";
import { POR_PAGINA, type Filtros, type Modo } from "@/lib/filtros";
import { createPublicClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Agencia = Tables<"agencies">;
type Propiedad = Tables<"properties">;

const CAMPOS_TARJETA =
  "id, slug, titulo, operacion, tipo, estado_obra, fecha_entrega, precio, moneda, expensas, direccion, " +
  "mostrar_direccion_exacta, barrio, ciudad, ambientes, dormitorios, banos, superficie_total, destacada, " +
  "fotos:property_photos(url, thumb_url), escenas:tour_scenes(count), planos:property_plans(count)";

export type PropiedadTarjeta = Pick<
  Propiedad,
  | "id"
  | "slug"
  | "titulo"
  | "operacion"
  | "tipo"
  | "estado_obra"
  | "fecha_entrega"
  | "precio"
  | "moneda"
  | "expensas"
  | "direccion"
  | "mostrar_direccion_exacta"
  | "barrio"
  | "ciudad"
  | "ambientes"
  | "dormitorios"
  | "banos"
  | "superficie_total"
  | "destacada"
> & { foto: { url: string; thumb_url: string | null } | null; tieneTour: boolean; tienePlanos: boolean };

type FilaTarjeta = Omit<PropiedadTarjeta, "foto" | "tieneTour" | "tienePlanos"> & {
  fotos: { url: string; thumb_url: string | null }[];
  escenas: { count: number }[];
  planos: { count: number }[];
};

function aTarjeta({ fotos, escenas, planos, ...p }: FilaTarjeta): PropiedadTarjeta {
  return { ...p, foto: fotos[0] ?? null, tieneTour: (escenas[0]?.count ?? 0) > 0, tienePlanos: (planos[0]?.count ?? 0) > 0 };
}

function fallar(contexto: string, error: { message: string }): never {
  throw new Error(`No se pudieron cargar ${contexto}: ${error.message}`);
}

/**
 * La inmobiliaria de este sitio: la de AGENCY_ID o, si no se fijó, la primera creada.
 * null si Supabase todavía no está configurado o no hay ninguna cargada.
 */
export const getAgencia = cache(async (): Promise<Agencia | null> => {
  if (!isSupabaseConfigured()) return null;
  const id = getAgencyId();
  const query = createPublicClient().from("agencies").select("*");
  const { data, error } = await (id ? query.eq("id", id) : query.order("created_at").limit(1)).maybeSingle();
  if (error) fallar("los datos de la inmobiliaria", error);
  return data;
});

/** Consulta base de tarjetas publicadas de la agencia, con la foto principal primero. */
function consultaTarjetas(agencyId: string, opciones: { contar?: boolean } = {}) {
  return createPublicClient()
    .from("properties")
    .select(CAMPOS_TARJETA, opciones.contar ? { count: "exact" } : undefined)
    .eq("agency_id", agencyId)
    .eq("publicada", true)
    .order("es_principal", { referencedTable: "fotos", ascending: false })
    .order("orden", { referencedTable: "fotos" })
    .limit(1, { referencedTable: "fotos" });
}

type Consulta = ReturnType<typeof consultaTarjetas>;

function aplicarModo(query: Consulta, modo: Modo) {
  if (modo === "emprendimientos") return query.neq("estado_obra", "terminada");
  return query.eq("operacion", modo);
}

async function contar(agencyId: string, modo: Modo) {
  let query = createPublicClient()
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("publicada", true);
  query = modo === "emprendimientos" ? query.neq("estado_obra", "terminada") : query.eq("operacion", modo);
  const { count, error } = await query;
  if (error) fallar("las propiedades", error);
  return count ?? 0;
}

async function ultimas(query: Consulta, cantidad: number) {
  const { data, error } = await query
    .order("destacada", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(cantidad);
  if (error) fallar("las propiedades", error);
  return (data as unknown as FilaTarjeta[]).map(aTarjeta);
}

/** Datos del inicio: secciones y contadores. */
export async function getInicio(agencyId: string) {
  const [alquiler, venta, emprendimientos, total] = await Promise.all([
    ultimas(aplicarModo(consultaTarjetas(agencyId), "alquiler"), 6),
    ultimas(aplicarModo(consultaTarjetas(agencyId), "venta").eq("estado_obra", "terminada"), 6),
    ultimas(aplicarModo(consultaTarjetas(agencyId), "emprendimientos"), 6),
    Promise.all([contar(agencyId, "alquiler"), contar(agencyId, "venta"), contar(agencyId, "emprendimientos")]),
  ]);
  return { alquiler, venta, emprendimientos, total: { alquiler: total[0], venta: total[1], emprendimientos: total[2] } };
}

/** Listado filtrado y paginado. */
export async function getListado(agencyId: string, modo: Modo, f: Filtros) {
  let query = aplicarModo(consultaTarjetas(agencyId, { contar: true }), modo);

  for (const palabra of normalizarBusqueda(f.q ?? "").split(" ").filter(Boolean)) {
    query = query.like("busqueda", `%${palabra}%`);
  }
  if (f.tipo) query = query.eq("tipo", f.tipo);
  if (f.barrio) query = query.eq("barrio", f.barrio);
  if (f.ambientes) query = f.ambientes >= 4 ? query.gte("ambientes", 4) : query.eq("ambientes", f.ambientes);
  if (f.desde !== undefined || f.hasta !== undefined) {
    query = query.eq("moneda", f.moneda);
    if (f.desde !== undefined) query = query.gte("precio", f.desde);
    if (f.hasta !== undefined) query = query.lte("precio", f.hasta);
  }
  if (f.credito) query = query.eq("apto_credito", true);
  if (f.obra) query = query.eq("estado_obra", f.obra);
  if (f.tour) {
    // Solo las que tienen al menos una escena: filtro por los ids con tour.
    const { data, error } = await createPublicClient().from("tour_scenes").select("property_id");
    if (error) fallar("los tours", error);
    query = query.in("id", [...new Set(data.map((e) => e.property_id))]);
  }

  query =
    f.orden === "recientes"
      ? query.order("destacada", { ascending: false }).order("created_at", { ascending: false })
      : query.order("precio", { ascending: f.orden === "precio_asc", nullsFirst: false });

  const desde = (f.pagina - 1) * POR_PAGINA;
  const { data, error, count } = await query.range(desde, desde + POR_PAGINA - 1);
  // Página fuera de rango: PostgREST responde 416; se muestra vacía en vez de romper.
  if (error && error.code !== "PGRST103") fallar("las propiedades", error);
  return { items: ((data ?? []) as unknown as FilaTarjeta[]).map(aTarjeta), total: count ?? 0 };
}

/** Barrios con propiedades publicadas en ese modo, para el filtro. */
export async function getBarrios(agencyId: string, modo: Modo) {
  let query = createPublicClient()
    .from("properties")
    .select("barrio")
    .eq("agency_id", agencyId)
    .eq("publicada", true)
    .not("barrio", "is", null);
  query = modo === "emprendimientos" ? query.neq("estado_obra", "terminada") : query.eq("operacion", modo);
  const { data, error } = await query;
  if (error) fallar("los barrios", error);
  return [...new Set(data.map((p) => p.barrio!))].sort((a, b) => a.localeCompare(b, "es"));
}

export type PropiedadCompleta = Propiedad & {
  fotos: Pick<Tables<"property_photos">, "id" | "url" | "thumb_url">[];
  cantidadEscenas: number;
  cantidadPlanos: number;
};

/** Ficha completa de una propiedad publicada de la agencia (null si no existe). */
export const getPropiedad = cache(async (agencyId: string, slug: string): Promise<PropiedadCompleta | null> => {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select("*, fotos:property_photos(id, url, thumb_url, es_principal, orden), escenas:tour_scenes(count), planos:property_plans(count)")
    .eq("agency_id", agencyId)
    .eq("publicada", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fallar("la propiedad", error);
  if (!data) return null;
  const { fotos, escenas, planos, ...propiedad } = data;
  return {
    ...propiedad,
    fotos: fotos
      .sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || a.orden - b.orden)
      .map(({ id, url, thumb_url }) => ({ id, url, thumb_url })),
    cantidadEscenas: escenas[0]?.count ?? 0,
    cantidadPlanos: planos[0]?.count ?? 0,
  };
});

/** Hasta 3 propiedades parecidas: misma operación, mismo barrio o tipo. */
export async function getRelacionadas(p: Pick<Propiedad, "id" | "agency_id" | "operacion" | "barrio" | "tipo">) {
  let query = consultaTarjetas(p.agency_id).eq("operacion", p.operacion).neq("id", p.id);
  query = p.barrio ? query.or(`barrio.eq."${p.barrio.replace(/"/g, "")}",tipo.eq.${p.tipo}`) : query.eq("tipo", p.tipo);
  return ultimas(query, 3);
}

/** Slugs publicados con fecha de modificación (sitemap y prerender). */
export async function getSlugs(agencyId: string) {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select("slug, updated_at")
    .eq("agency_id", agencyId)
    .eq("publicada", true);
  if (error) fallar("las propiedades", error);
  return data;
}

export type EscenaTour = Pick<
  Tables<"tour_scenes">,
  "id" | "nombre_ambiente" | "panorama_url" | "thumb_url" | "yaw_inicial" | "pitch_inicial"
> & { hotspots: Pick<Tables<"tour_hotspots">, "id" | "target_scene_id" | "yaw" | "pitch" | "texto">[] };

/** Tour 360° de una propiedad publicada: escenas ordenadas con sus hotspots. */
export const getTour = cache(async (agencyId: string, slug: string) => {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select(
      "id, slug, titulo, operacion, precio, moneda, planos:property_plans(count), " +
        "escenas:tour_scenes(id, nombre_ambiente, panorama_url, thumb_url, orden, yaw_inicial, pitch_inicial, " +
        "hotspots:tour_hotspots!tour_hotspots_scene_id_fkey(id, target_scene_id, yaw, pitch, texto))",
    )
    .eq("agency_id", agencyId)
    .eq("publicada", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fallar("el tour", error);
  if (!data) return null;
  const fila = data as unknown as Pick<Propiedad, "id" | "slug" | "titulo" | "operacion" | "precio" | "moneda"> & {
    planos: { count: number }[];
    escenas: (EscenaTour & { orden: number })[];
  };
  return {
    ...fila,
    tienePlanos: (fila.planos[0]?.count ?? 0) > 0,
    escenas: fila.escenas.sort((a, b) => a.orden - b.orden),
  };
});

export type PlanoVisor = Pick<Tables<"property_plans">, "id" | "nombre" | "url" | "thumb_url"> & {
  puntos: Pick<Tables<"plan_hotspots">, "id" | "x_pct" | "y_pct" | "texto" | "scene_id">[];
};

/** Planos de una propiedad publicada con sus puntos. */
export const getPlanos = cache(async (agencyId: string, slug: string) => {
  const { data, error } = await createPublicClient()
    .from("properties")
    .select(
      "id, slug, titulo, escenas:tour_scenes(count), " +
        "planos:property_plans(id, nombre, url, thumb_url, orden, puntos:plan_hotspots(id, x_pct, y_pct, texto, scene_id))",
    )
    .eq("agency_id", agencyId)
    .eq("publicada", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fallar("los planos", error);
  if (!data) return null;
  const fila = data as unknown as Pick<Propiedad, "id" | "slug" | "titulo"> & {
    escenas: { count: number }[];
    planos: (PlanoVisor & { orden: number })[];
  };
  return {
    ...fila,
    tieneTour: (fila.escenas[0]?.count ?? 0) > 0,
    planos: fila.planos.sort((a, b) => a.orden - b.orden),
  };
});
