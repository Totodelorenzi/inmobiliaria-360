"use server";

import { headers } from "next/headers";
import { validarConsulta, type DatosConsulta, type ErroresConsulta } from "@/lib/consulta";
import { getAgenciaDelPedido } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { Limitador } from "@/lib/previsita/limite";
import { asegurarVisitante, guardarLead, recalcularLead, registrarEventoServidor } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";

// Formularios por IP: 5 por minuto (por instancia del servidor).
const porIp = new Limitador(5, 60_000);
const ERROR_GENERAL = "No pudimos enviar tu pedido. Probá de nuevo en unos segundos.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoPedidoInfo = { ok: boolean; codigo?: string | null; errores?: ErroresConsulta; valores?: Partial<DatosConsulta> };

/**
 * "Pedir información" de una unidad: crea o actualiza el lead del visitante (uno por visitante),
 * le deja la última unidad consultada y registra el pedido en su historial.
 */
export async function pedirInformacion(_prev: EstadoPedidoInfo, formData: FormData): Promise<EstadoPedidoInfo> {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  // Trampa para bots: campo oculto que una persona nunca completa.
  if (texto("empresa")) return { ok: true };

  const datos: DatosConsulta = {
    agencyId: texto("agencyId"),
    propertyId: null,
    nombre: texto("nombre"),
    telefono: texto("telefono"),
    email: texto("email"),
    mensaje: texto("mensaje"),
    acepto: formData.get("acepto") === "on",
  };
  const unitId = texto("unitId");
  const errores = validarConsulta(datos);
  if (errores) return { ok: false, errores, valores: datos };
  const fallo = (general = ERROR_GENERAL): EstadoPedidoInfo => ({ ok: false, errores: { general }, valores: datos });
  if (!UUID.test(unitId) || !isSupabaseConfigured()) return fallo();

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!porIp.permitir(ip)) return fallo("Mandaste varios pedidos seguidos. Esperá un minuto y probá de nuevo.");

  try {
    const db = createAdminClient();
    // La unidad tiene que ser de un proyecto publicado de la inmobiliaria de este sitio.
    const [agencia, { data: unidad }] = await Promise.all([
      getAgenciaDelPedido(),
      db.from("units").select("id, project_id, proyecto:projects!inner(agency_id, publicado)").eq("id", unitId).maybeSingle(),
    ]);
    if (!agencia || agencia.id !== datos.agencyId || !unidad || unidad.proyecto.agency_id !== agencia.id || !unidad.proyecto.publicado) return fallo();

    const { visitante } = await asegurarVisitante(db, agencia.id);
    const lead = await guardarLead(db, {
      visitante,
      propertyId: null,
      unitId: unidad.id,
      origen: "formulario",
      datos: { nombre: datos.nombre, telefono: datos.telefono, email: datos.email, mensaje: datos.mensaje },
      consentimiento: true,
    });
    await registrarEventoServidor(db, visitante, "form_submit", null, { projectId: unidad.project_id, unitId: unidad.id });
    await recalcularLead(db, lead);
    return { ok: true, codigo: lead.codigo_ref };
  } catch (error) {
    console.error("[pedir información]", error instanceof Error ? error.message : error);
    return fallo();
  }
}
