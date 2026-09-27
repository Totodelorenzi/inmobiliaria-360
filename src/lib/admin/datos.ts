import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

function fallar(contexto: string, error: { message: string }): never {
  throw new Error(`No se pudieron cargar ${contexto}: ${error.message}`);
}

/** Números del dashboard. */
export async function getResumen(agencyId: string) {
  const supabase = await createClient();
  const haceUnaSemana = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const contar = (publicada: boolean) =>
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("agency_id", agencyId).eq("publicada", publicada);

  const [publicadas, borradores, leadsSemana, demo, ultimos] = await Promise.all([
    contar(true),
    contar(false),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId).gte("created_at", haceUnaSemana),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("agency_id", agencyId).eq("es_demo", true),
    supabase
      .from("leads")
      .select("id, nombre, telefono, email, origen, created_at, propiedad:properties(titulo, slug)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const error = publicadas.error ?? borradores.error ?? leadsSemana.error ?? demo.error ?? ultimos.error;
  if (error) fallar("los datos del panel", error);
  return {
    publicadas: publicadas.count ?? 0,
    borradores: borradores.count ?? 0,
    leadsSemana: leadsSemana.count ?? 0,
    demo: demo.count ?? 0,
    ultimosLeads: ultimos.data ?? [],
  };
}

export type FiltroEstado = "todas" | "publicadas" | "borradores" | "destacadas";

export type PropiedadListado = Pick<
  Tables<"properties">,
  "id" | "slug" | "titulo" | "operacion" | "tipo" | "precio" | "moneda" | "barrio" | "publicada" | "destacada" | "es_demo" | "updated_at"
> & { foto: string | null; escenas: number; planos: number };

/** Listado del panel con buscador y filtros. */
export async function getPropiedadesAdmin(
  agencyId: string,
  filtros: { q?: string; estado: FiltroEstado; operacion?: Enums<"operacion"> },
) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select(
      "id, slug, titulo, operacion, tipo, precio, moneda, barrio, publicada, destacada, es_demo, updated_at, " +
        "fotos:property_photos(thumb_url, url, es_principal, orden), escenas:tour_scenes(count), planos:property_plans(count)",
    )
    .eq("agency_id", agencyId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filtros.q) query = query.ilike("titulo", `%${filtros.q.replace(/[%_]/g, "")}%`);
  if (filtros.estado === "publicadas") query = query.eq("publicada", true);
  if (filtros.estado === "borradores") query = query.eq("publicada", false);
  if (filtros.estado === "destacadas") query = query.eq("destacada", true);
  if (filtros.operacion) query = query.eq("operacion", filtros.operacion);

  const { data, error } = await query;
  if (error) fallar("las propiedades", error);
  type Fila = Omit<PropiedadListado, "foto" | "escenas" | "planos"> & {
    fotos: { thumb_url: string | null; url: string; es_principal: boolean; orden: number }[];
    escenas: { count: number }[];
    planos: { count: number }[];
  };
  return (data as unknown as Fila[]).map(({ fotos, escenas, planos, ...p }): PropiedadListado => {
    const principal = [...fotos].sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || a.orden - b.orden)[0];
    return { ...p, foto: principal ? (principal.thumb_url ?? principal.url) : null, escenas: escenas[0]?.count ?? 0, planos: planos[0]?.count ?? 0 };
  });
}

export type Foto = Tables<"property_photos">;
export type Escena = Tables<"tour_scenes"> & { hotspots: Tables<"tour_hotspots">[] };
export type Plano = Tables<"property_plans"> & { puntos: Tables<"plan_hotspots">[] };
export type PropiedadEditor = Tables<"properties"> & { fotos: Foto[]; escenas: Escena[]; planos: Plano[] };

/** Todo lo necesario para el editor de una propiedad (RLS garantiza que sea de la agencia). */
export async function getPropiedadEditor(id: string): Promise<PropiedadEditor | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "*, fotos:property_photos(*), escenas:tour_scenes(*, hotspots:tour_hotspots!tour_hotspots_scene_id_fkey(*)), planos:property_plans(*, puntos:plan_hotspots(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fallar("la propiedad", error);
  if (!data) return null;
  const p = data as unknown as PropiedadEditor;
  const porOrden = <T extends { orden: number }>(a: T, b: T) => a.orden - b.orden;
  return { ...p, fotos: p.fotos.sort(porOrden), escenas: p.escenas.sort(porOrden), planos: p.planos.sort(porOrden) };
}

export const LEADS_POR_PAGINA = 30;

/** Consultas recibidas, las más nuevas primero. */
export async function getLeads(agencyId: string, filtros: { origen?: Enums<"origen_lead">; pagina: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, nombre, telefono, email, mensaje, origen, created_at, propiedad:properties(titulo, slug)", { count: "exact" })
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (filtros.origen) query = query.eq("origen", filtros.origen);
  const desde = (filtros.pagina - 1) * LEADS_POR_PAGINA;
  const { data, error, count } = await query.range(desde, desde + LEADS_POR_PAGINA - 1);
  if (error && error.code !== "PGRST103") fallar("las consultas", error);
  return { leads: data ?? [], total: count ?? 0 };
}
