"use server";

import { headers } from "next/headers";
import { validarConsulta, type DatosConsulta, type ErroresConsulta } from "@/lib/consulta";
import { getAgenciaDelPedido } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { Limitador } from "@/lib/previsita/limite";
import { asegurarVisitante, guardarLead, recalcularLead, registrarEventoServidor } from "@/lib/previsita/servidor";
import { validarPedido, type EntradaPedido, type ErroresPedido } from "@/lib/previsita/validacion";
import { createAdminClient } from "@/lib/supabase/admin";

// Formularios por IP: 5 por minuto (por instancia del servidor).
const porIp = new Limitador(5, 60_000);
const ERROR_GENERAL = "No pudimos enviar tu pedido. Probá de nuevo o escribinos por WhatsApp.";

async function ipActual() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** La propiedad tiene que estar publicada y ser de la inmobiliaria de este sitio. */
async function propiedadDelSitio(db: ReturnType<typeof createAdminClient>, propertyId: string | null) {
  const agencia = await getAgenciaDelPedido();
  if (!agencia) return null;
  if (!propertyId) return { agencia, propiedad: null };
  const { data } = await db
    .from("properties")
    .select("id, operacion")
    .eq("id", propertyId)
    .eq("agency_id", agencia.id)
    .eq("publicada", true)
    .maybeSingle();
  return data ? { agencia, propiedad: data } : null;
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

export type EstadoConsulta = { ok: boolean; codigo?: string | null; errores?: ErroresConsulta; valores?: Partial<DatosConsulta> };

export async function enviarConsulta(_prev: EstadoConsulta, formData: FormData): Promise<EstadoConsulta> {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  // Trampa para bots: campo oculto que una persona nunca completa.
  if (texto("empresa")) return { ok: true };

  const datos: DatosConsulta = {
    agencyId: texto("agencyId"),
    propertyId: texto("propertyId") || null,
    nombre: texto("nombre"),
    telefono: texto("telefono"),
    email: texto("email"),
    mensaje: texto("mensaje"),
    acepto: formData.get("acepto") === "on",
  };
  const errores = validarConsulta(datos);
  if (errores) return { ok: false, errores, valores: datos };
  if (!isSupabaseConfigured()) {
    return { ok: false, errores: { general: "El sitio todavía no está configurado para recibir consultas." }, valores: datos };
  }
  if (!porIp.permitir(await ipActual())) {
    return { ok: false, errores: { general: "Mandaste varias consultas seguidas. Esperá un minuto y probá de nuevo." }, valores: datos };
  }

  try {
    const db = createAdminClient();
    const sitio = await propiedadDelSitio(db, datos.propertyId);
    if (!sitio || sitio.agencia.id !== datos.agencyId) return { ok: false, errores: { general: ERROR_GENERAL }, valores: datos };
    const { visitante } = await asegurarVisitante(db, sitio.agencia.id);
    const lead = await guardarLead(db, {
      visitante,
      propertyId: datos.propertyId,
      origen: "formulario",
      datos: { nombre: datos.nombre, telefono: datos.telefono, email: datos.email, mensaje: datos.mensaje },
      consentimiento: true,
    });
    await registrarEventoServidor(db, visitante, "form_submit", datos.propertyId);
    await recalcularLead(db, lead);
    return { ok: true, codigo: lead.codigo_ref };
  } catch (error) {
    console.error("[consulta]", error instanceof Error ? error.message : error);
    return { ok: false, errores: { general: ERROR_GENERAL }, valores: datos };
  }
}

// ---------------------------------------------------------------------------
// Pedido de visita presencial
// ---------------------------------------------------------------------------

export type EstadoPedido = { ok: boolean; codigo?: string | null; errores?: ErroresPedido; valores?: Partial<EntradaPedido> };

export async function pedirVisita(_prev: EstadoPedido, formData: FormData): Promise<EstadoPedido> {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  if (texto("empresa")) return { ok: true };

  const entrada: EntradaPedido = {
    nombre: texto("nombre"),
    telefono: texto("telefono"),
    formaPago: texto("formaPago") || undefined,
    plazo: texto("plazo") || undefined,
    necesitaVender: texto("necesitaVender") || undefined,
    franja: texto("franja") || undefined,
    comentario: texto("comentario") || undefined,
    acepto: formData.get("acepto") === "on",
  };
  if (!isSupabaseConfigured()) {
    return { ok: false, errores: { general: "El sitio todavía no está configurado para recibir pedidos." }, valores: entrada };
  }

  try {
    const db = createAdminClient();
    const sitio = await propiedadDelSitio(db, texto("propertyId") || null);
    if (!sitio?.propiedad) return { ok: false, errores: { general: ERROR_GENERAL }, valores: entrada };
    const { pedido, errores } = validarPedido(entrada, sitio.propiedad.operacion);
    if (!pedido) return { ok: false, errores, valores: entrada };
    if (!porIp.permitir(await ipActual())) {
      return { ok: false, errores: { general: "Mandaste varios pedidos seguidos. Esperá un minuto y probá de nuevo." }, valores: entrada };
    }

    const { visitante } = await asegurarVisitante(db, sitio.agencia.id);
    const lead = await guardarLead(db, {
      visitante,
      propertyId: sitio.propiedad.id,
      origen: "pedido_visita",
      datos: { nombre: pedido.nombre, telefono: pedido.telefono, mensaje: pedido.comentario },
      consentimiento: true,
    });
    const { error } = await db.from("visit_requests").insert({
      lead_id: lead.id,
      property_id: sitio.propiedad.id,
      forma_pago: pedido.forma_pago,
      plazo: pedido.plazo,
      necesita_vender: pedido.necesita_vender,
      franja_preferida: pedido.franja_preferida,
      comentario: pedido.comentario,
    });
    if (error) throw new Error(error.message);
    await registrarEventoServidor(db, visitante, "visit_request", sitio.propiedad.id);
    await recalcularLead(db, lead);
    return { ok: true, codigo: lead.codigo_ref };
  } catch (error) {
    console.error("[pedido de visita]", error instanceof Error ? error.message : error);
    return { ok: false, errores: { general: ERROR_GENERAL }, valores: entrada };
  }
}
