import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizarCodigo } from "@/lib/previsita/codigos";
import type { EventoHistorial } from "@/lib/previsita/linea-tiempo";
import type { DetallePuntaje } from "@/lib/scoring";
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

  const [publicadas, borradores, leadsSemana, demo, ultimos, calientes, pedidos] = await Promise.all([
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
    supabase
      .from("leads")
      .select("id, nombre, telefono, codigo_ref, score, score_detalle, nivel, estado, ultima_actividad, propiedad:properties(titulo)")
      .eq("agency_id", agencyId)
      .eq("nivel", "caliente")
      .gte("ultima_actividad", haceUnaSemana)
      .order("score", { ascending: false })
      .limit(6),
    supabase.from("visit_requests").select("id", { count: "exact", head: true }).gte("created_at", haceUnaSemana),
  ]);
  const error = publicadas.error ?? borradores.error ?? leadsSemana.error ?? demo.error ?? ultimos.error ?? calientes.error ?? pedidos.error;
  if (error) fallar("los datos del panel", error);
  return {
    publicadas: publicadas.count ?? 0,
    borradores: borradores.count ?? 0,
    leadsSemana: leadsSemana.count ?? 0,
    demo: demo.count ?? 0,
    ultimosLeads: ultimos.data ?? [],
    pedidosSemana: pedidos.count ?? 0,
    calientes: (calientes.data ?? []) as unknown as (Pick<LeadListado, "id" | "nombre" | "telefono" | "codigo_ref" | "score" | "nivel" | "estado" | "ultima_actividad" | "score_detalle"> & {
      propiedad: { titulo: string } | null;
    })[],
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

export type FiltrosLeads = {
  q?: string;
  nivel?: Enums<"nivel_lead">;
  estado?: Enums<"estado_lead">;
  propiedad?: string;
  pagina: number;
};

const CAMPOS_LEAD =
  "id, nombre, telefono, email, mensaje, origen, created_at, codigo_ref, score, score_detalle, nivel, estado, notas, ultima_actividad, visitor_id, propiedad:properties(id, titulo, slug)";

export type LeadListado = Pick<
  Tables<"leads">,
  | "id"
  | "nombre"
  | "telefono"
  | "email"
  | "mensaje"
  | "origen"
  | "created_at"
  | "codigo_ref"
  | "score"
  | "nivel"
  | "estado"
  | "notas"
  | "ultima_actividad"
  | "visitor_id"
> & { score_detalle: DetallePuntaje[]; propiedad: { id: string; titulo: string; slug: string } | null };

/** Leads ordenados por puntaje (y después por actividad), con filtros y búsqueda por código, nombre o teléfono. */
export async function getLeads(agencyId: string, f: FiltrosLeads) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(CAMPOS_LEAD, { count: "exact" })
    .eq("agency_id", agencyId)
    .order("score", { ascending: false })
    .order("ultima_actividad", { ascending: false });
  if (f.nivel) query = query.eq("nivel", f.nivel);
  if (f.estado) query = query.eq("estado", f.estado);
  if (f.propiedad) query = query.eq("property_id", f.propiedad);
  if (f.q) {
    const codigo = normalizarCodigo(f.q);
    const texto = f.q.replace(/[%_,()"]/g, " ").trim();
    query = codigo
      ? query.or(`codigo_ref.eq.${codigo},nombre.ilike.%${texto}%`)
      : query.or(`nombre.ilike.%${texto}%,telefono.ilike.%${texto}%,email.ilike.%${texto}%`);
  }
  const desde = (f.pagina - 1) * LEADS_POR_PAGINA;
  const { data, error, count } = await query.range(desde, desde + LEADS_POR_PAGINA - 1);
  if (error && error.code !== "PGRST103") fallar("los leads", error);
  return { leads: (data ?? []) as unknown as LeadListado[], total: count ?? 0 };
}

/** Propiedades de la agencia para filtros y para generar links (publicadas primero). */
export async function getOpcionesPropiedades(agencyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, titulo, slug, publicada, operacion")
    .eq("agency_id", agencyId)
    .order("publicada", { ascending: false })
    .order("titulo");
  if (error) fallar("las propiedades", error);
  return data;
}

export type LeadDetalle = LeadListado & {
  consentimiento_at: string | null;
  pedidos: Tables<"visit_requests">[];
  visitante: Pick<Tables<"visitors">, "first_seen" | "last_seen" | "utm_source" | "utm_medium" | "utm_campaign"> | null;
  link: (Pick<Tables<"tracked_links">, "codigo" | "created_at" | "nombre_prospecto"> & { abierto: boolean }) | null;
  eventos: EventoHistorial[];
};

/** Todo lo de un lead: datos, calificación, link personalizado e historial completo. */
export async function getLeadDetalle(agencyId: string, id: string): Promise<LeadDetalle | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select(`${CAMPOS_LEAD}, consentimiento_at`)
    .eq("agency_id", agencyId)
    .eq("id", id)
    .maybeSingle();
  if (error) fallar("el lead", error);
  if (!lead) return null;
  const base = lead as unknown as LeadListado & { consentimiento_at: string | null };

  const [pedidos, visitante, link, eventos] = await Promise.all([
    supabase.from("visit_requests").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    base.visitor_id
      ? supabase.from("visitors").select("first_seen, last_seen, utm_source, utm_medium, utm_campaign, tracked_link_id").eq("id", base.visitor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    base.visitor_id
      ? supabase.from("tracked_links").select("codigo, created_at, nombre_prospecto").eq("visitor_id", base.visitor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    base.visitor_id
      ? supabase
          .from("visitor_events")
          .select("tipo, created_at, sesion_id, duracion_ms, meta, propiedad:properties(titulo), escena:tour_scenes(nombre_ambiente), plano:property_plans(nombre)")
          .eq("visitor_id", base.visitor_id)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
  ]);

  type FilaEvento = {
    tipo: Enums<"tipo_evento">;
    created_at: string;
    sesion_id: string | null;
    duracion_ms: number | null;
    meta: unknown;
    propiedad: { titulo: string } | null;
    escena: { nombre_ambiente: string } | null;
    plano: { nombre: string } | null;
  };
  const v = visitante.data;
  return {
    ...base,
    pedidos: pedidos.data ?? [],
    visitante: v ? { first_seen: v.first_seen, last_seen: v.last_seen, utm_source: v.utm_source, utm_medium: v.utm_medium, utm_campaign: v.utm_campaign } : null,
    link: link.data ? { ...link.data, abierto: Boolean(v?.first_seen) } : null,
    eventos: ((eventos.data ?? []) as unknown as FilaEvento[]).map((e) => ({
      tipo: e.tipo,
      created_at: e.created_at,
      sesion_id: e.sesion_id,
      duracion_ms: e.duracion_ms,
      meta: e.meta,
      propiedad: e.propiedad?.titulo ?? null,
      escena: e.escena?.nombre_ambiente ?? null,
      plano: e.plano?.nombre ?? null,
    })),
  };
}

export type EstadisticaPropiedad = {
  id: string;
  titulo: string;
  slug: string;
  publicada: boolean;
  vistas: number;
  visitantes: number;
  toursIniciados: number;
  toursCompletos: number;
  segundosTour: number;
  vieronPlanos: number;
  pedidos: number;
  conversion: number;
};

/** Métricas por propiedad desde una fecha (agregadas en la base; RLS limita a la agencia). */
export async function getEstadisticas(agencyId: string, dias: number): Promise<EstadisticaPropiedad[]> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const [stats, propiedades] = await Promise.all([
    supabase.rpc("estadisticas_propiedades", { p_desde: desde }),
    supabase.from("properties").select("id, titulo, slug, publicada").eq("agency_id", agencyId),
  ]);
  if (stats.error) fallar("las estadísticas", stats.error);
  if (propiedades.error) fallar("las propiedades", propiedades.error);
  const porId = new Map(stats.data.map((s) => [s.property_id, s]));
  return propiedades.data
    .map((p) => {
      const s = porId.get(p.id);
      const visitantes = Number(s?.visitantes ?? 0);
      const pedidos = Number(s?.pedidos_visita ?? 0);
      return {
        ...p,
        vistas: Number(s?.vistas ?? 0),
        visitantes,
        toursIniciados: Number(s?.tours_iniciados ?? 0),
        toursCompletos: Number(s?.tours_completos ?? 0),
        segundosTour: Number(s?.segundos_tour_promedio ?? 0),
        vieronPlanos: Number(s?.vieron_planos ?? 0),
        pedidos,
        conversion: visitantes > 0 ? pedidos / visitantes : 0,
      };
    })
    .sort((a, b) => b.vistas - a.vistas || Number(b.publicada) - Number(a.publicada));
}

/** Links de pre-visita generados, con si se abrieron. */
export async function getLinks(agencyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracked_links")
    .select("id, codigo, nombre_prospecto, telefono_prospecto, created_at, visitor_id, propiedad:properties(titulo), visitante:visitors!tracked_links_visitor_id_fkey(first_seen)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) fallar("los links", error);
  return data;
}
