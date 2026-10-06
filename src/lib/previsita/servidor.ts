import "server-only";
import { cookies } from "next/headers";
import { calcularPuntaje, resumirEventos, type Calificacion } from "@/lib/scoring";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { EventoCliente, TipoEvento, Utm } from "@/lib/tracking/eventos";
import type { Enums, Tables } from "@/types/database";
import { codigoRef } from "./codigos";

/**
 * Lado servidor de la pre-visita: visitante (cookie first-party), eventos, lead y puntaje.
 * Todo con el cliente de la clave secreta: solo se llama desde route handlers y Server Actions
 * después de validar lo que llega.
 */

type Db = ReturnType<typeof createAdminClient>;

export const COOKIE_VISITANTE = "v360";
/** Legible desde el navegador: solo el código corto, para el "Ref." del mensaje de WhatsApp. */
export const COOKIE_REF = "v360_ref";
const UN_ANIO = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Visitante = Pick<Tables<"visitors">, "id" | "agency_id" | "codigo_ref" | "first_seen" | "tracked_link_id">;
const CAMPOS_VISITANTE = "id, agency_id, codigo_ref, first_seen, tracked_link_id";

function fallar(contexto: string, error: { message: string }): never {
  throw new Error(`${contexto}: ${error.message}`);
}

/** Deja las cookies del visitante (httpOnly el id; legible el código). */
export async function guardarCookies(v: Pick<Visitante, "id" | "codigo_ref">) {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(COOKIE_VISITANTE, v.id, { httpOnly: true, sameSite: "lax", secure, maxAge: UN_ANIO, path: "/" });
  jar.set(COOKIE_REF, v.codigo_ref, { httpOnly: false, sameSite: "lax", secure, maxAge: UN_ANIO, path: "/" });
}

export async function idDeCookie() {
  const id = (await cookies()).get(COOKIE_VISITANTE)?.value;
  return id && UUID.test(id) ? id : null;
}

/** Visitante de la cookie, si existe y es de esta inmobiliaria. */
export async function visitanteDeCookie(db: Db, agencyId: string): Promise<Visitante | null> {
  const id = await idDeCookie();
  if (!id) return null;
  const { data } = await db.from("visitors").select(CAMPOS_VISITANTE).eq("id", id).eq("agency_id", agencyId).maybeSingle();
  return data;
}

/** Crea un visitante con un código de referencia único en la inmobiliaria (reintenta si choca). */
export async function crearVisitante(
  db: Db,
  agencyId: string,
  extra: { utm?: Utm; trackedLinkId?: string; abierto?: boolean; esDemo?: boolean; fecha?: string } = {},
): Promise<Visitante> {
  const ahora = extra.fecha ?? new Date().toISOString();
  const abierto = extra.abierto ?? true;
  for (let intento = 0; intento < 6; intento++) {
    const { data, error } = await db
      .from("visitors")
      .insert({
        agency_id: agencyId,
        codigo_ref: codigoRef(intento < 4 ? 4 : 5),
        first_seen: abierto ? ahora : null,
        last_seen: abierto ? ahora : null,
        utm_source: extra.utm?.source ?? null,
        utm_medium: extra.utm?.medium ?? null,
        utm_campaign: extra.utm?.campaign ?? null,
        tracked_link_id: extra.trackedLinkId ?? null,
        es_demo: extra.esDemo ?? false,
        created_at: ahora,
      })
      .select(CAMPOS_VISITANTE)
      .single();
    if (!error) return data;
    if (error.code !== "23505") fallar("No se pudo registrar el visitante", error);
  }
  throw new Error("No se pudo generar un código de referencia único.");
}

/** El visitante de este navegador: lo crea si hace falta y deja las cookies al día. */
export async function asegurarVisitante(db: Db, agencyId: string, utm?: Utm) {
  const existente = await visitanteDeCookie(db, agencyId);
  if (existente) {
    const jar = await cookies();
    if (jar.get(COOKIE_REF)?.value !== existente.codigo_ref) await guardarCookies(existente);
    return { visitante: existente, nuevo: false };
  }
  const visitante = await crearVisitante(db, agencyId, { utm });
  await guardarCookies(visitante);
  return { visitante, nuevo: true };
}

export async function marcarActividad(db: Db, v: Visitante) {
  const ahora = new Date().toISOString();
  await db.from("visitors").update({ last_seen: ahora, ...(v.first_seen ? {} : { first_seen: ahora }) }).eq("id", v.id);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

type Destinos = Map<string, { escenas: Set<string>; planos: Set<string> }>;
const cacheDestinos = new Map<string, { vence: number; destinos: Destinos }>();

/** Propiedades publicadas de la inmobiliaria con sus escenas y planos (60 s en memoria). */
async function destinosValidos(db: Db, agencyId: string): Promise<Destinos> {
  const enCache = cacheDestinos.get(agencyId);
  if (enCache && enCache.vence > Date.now()) return enCache.destinos;
  const { data, error } = await db
    .from("properties")
    .select("id, escenas:tour_scenes(id), planos:property_plans(id)")
    .eq("agency_id", agencyId)
    .eq("publicada", true);
  if (error) fallar("No se pudieron validar los eventos", error);
  const destinos: Destinos = new Map(
    data.map((p) => [p.id, { escenas: new Set(p.escenas.map((e) => e.id)), planos: new Set(p.planos.map((x) => x.id)) }]),
  );
  cacheDestinos.set(agencyId, { vence: Date.now() + 60_000, destinos });
  return destinos;
}

/** Inserta los eventos que apuntan a propiedades, escenas y planos reales de la inmobiliaria. */
export async function registrarEventos(db: Db, v: Visitante, eventos: EventoCliente[]) {
  const destinos = await destinosValidos(db, v.agency_id);
  const filas = eventos
    .filter((e) => {
      if (!e.propertyId) return true;
      const d = destinos.get(e.propertyId);
      return Boolean(d) && (!e.sceneId || d!.escenas.has(e.sceneId)) && (!e.planId || d!.planos.has(e.planId));
    })
    .map((e) => ({
      visitor_id: v.id,
      agency_id: v.agency_id,
      property_id: e.propertyId ?? null,
      tipo: e.tipo,
      scene_id: e.sceneId ?? null,
      plan_id: e.planId ?? null,
      duracion_ms: e.duracionMs ?? null,
      sesion_id: e.sesion,
      meta: e.meta ?? {},
      created_at: new Date(e.t).toISOString(),
    }));
  if (filas.length > 0) {
    const { error } = await db.from("visitor_events").insert(filas);
    if (error) fallar("No se pudieron guardar los eventos", error);
  }
  return filas.length;
}

/** Evento generado por el servidor (formulario, pedido de visita): sin sesión del navegador. */
export async function registrarEventoServidor(db: Db, v: Visitante, tipo: TipoEvento, propertyId: string | null) {
  await db.from("visitor_events").insert({ visitor_id: v.id, agency_id: v.agency_id, property_id: propertyId, tipo });
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/** Si el lead ya existe se "asciende" el origen al de mayor intención. */
const PRIORIDAD_ORIGEN: Enums<"origen_lead">[] = ["whatsapp_click", "link_personalizado", "formulario", "pedido_visita"];

export type DatosContacto = { nombre?: string | null; telefono?: string | null; email?: string | null; mensaje?: string | null };

/** Crea o actualiza el lead del visitante (uno por visitante e inmobiliaria). Todo su historial queda asociado. */
export async function guardarLead(
  db: Db,
  opciones: { visitante: Visitante; propertyId: string | null; origen: Enums<"origen_lead">; datos?: DatosContacto; consentimiento?: boolean },
): Promise<Tables<"leads">> {
  const { visitante: v, propertyId, origen, datos = {}, consentimiento } = opciones;
  const ahora = new Date().toISOString();
  const contacto = Object.fromEntries(Object.entries(datos).filter(([, valor]) => typeof valor === "string" && valor.trim() !== "")) as DatosContacto;

  for (let intento = 0; intento < 2; intento++) {
    const { data: existente } = await db.from("leads").select("*").eq("agency_id", v.agency_id).eq("visitor_id", v.id).maybeSingle();
    if (existente) {
      const origenFinal = PRIORIDAD_ORIGEN.indexOf(origen) > PRIORIDAD_ORIGEN.indexOf(existente.origen) ? origen : existente.origen;
      const { data, error } = await db
        .from("leads")
        .update({
          ...contacto,
          origen: origenFinal,
          property_id: propertyId ?? existente.property_id,
          ultima_actividad: ahora,
          ...(consentimiento ? { consentimiento_at: ahora } : {}),
        })
        .eq("id", existente.id)
        .select("*")
        .single();
      if (error) fallar("No se pudo actualizar la consulta", error);
      return data;
    }
    const { data, error } = await db
      .from("leads")
      .insert({
        agency_id: v.agency_id,
        visitor_id: v.id,
        codigo_ref: v.codigo_ref,
        property_id: propertyId,
        origen,
        ...contacto,
        ultima_actividad: ahora,
        consentimiento_at: consentimiento ? ahora : null,
      })
      .select("*")
      .single();
    if (!error) return data;
    // Carrera con otro pedido del mismo visitante: se vuelve a leer y se actualiza.
    if (error.code !== "23505") fallar("No se pudo guardar la consulta", error);
  }
  throw new Error("No se pudo guardar la consulta.");
}

/** Recalcula puntaje, nivel y desglose del lead a partir de todo el historial del visitante. */
export async function recalcularLead(db: Db, lead: Pick<Tables<"leads">, "id" | "visitor_id">) {
  const [eventos, pedido, visitante] = await Promise.all([
    lead.visitor_id
      ? db
          .from("visitor_events")
          .select("tipo, property_id, plan_id, duracion_ms, sesion_id")
          .eq("visitor_id", lead.visitor_id)
          .order("created_at")
          .limit(5000)
      : Promise.resolve({ data: [] }),
    db.from("visit_requests").select("forma_pago, plazo, necesita_vender").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    lead.visitor_id ? db.from("visitors").select("tracked_link_id, first_seen").eq("id", lead.visitor_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const calificacion: Calificacion = pedido.data ?? null;
  const linkAbierto = Boolean(visitante.data?.tracked_link_id && visitante.data.first_seen);
  const { score, nivel, detalle } = calcularPuntaje(resumirEventos(eventos.data ?? []), calificacion, { linkAbierto });
  await db.from("leads").update({ score, nivel, score_detalle: detalle }).eq("id", lead.id);
  return { score, nivel, detalle };
}

/** Si el visitante ya es un lead: actualiza la última actividad y el puntaje. */
export async function actualizarLeadDelVisitante(db: Db, v: Visitante) {
  const { data: lead } = await db.from("leads").select("id, visitor_id").eq("agency_id", v.agency_id).eq("visitor_id", v.id).maybeSingle();
  if (!lead) return null;
  await db.from("leads").update({ ultima_actividad: new Date().toISOString() }).eq("id", lead.id);
  return recalcularLead(db, lead);
}
