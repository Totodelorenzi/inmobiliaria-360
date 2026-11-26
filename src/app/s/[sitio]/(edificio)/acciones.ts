"use server";

import { headers } from "next/headers";
import { conArticulo } from "@/lib/edificio";
import { validarConsulta, type DatosConsulta, type ErroresConsulta } from "@/lib/consulta";
import { getAgenciaDelPedido } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { Limitador } from "@/lib/previsita/limite";
import { asegurarVisitante, guardarLead, recalcularLead, registrarEventoServidor } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Utm } from "@/lib/tracking/eventos";

// Formularios por IP: 5 por minuto (por instancia del servidor).
const porIp = new Limitador(5, 60_000);
const ERROR_GENERAL = "No pudimos enviar tus datos. Probá de nuevo en unos segundos o escribinos por WhatsApp.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** De dónde salió el pedido: al terminar la galería, al querer cerrarla o desde un botón. */
const ORIGENES = new Set(["galeria_fin", "galeria_cierre", "boton"]);

export type EstadoContacto = { ok: boolean; codigo?: string | null; errores?: ErroresConsulta; valores?: Partial<DatosConsulta> };

/**
 * Contacto de la landing: "Dejá tus datos y te escribimos por WhatsApp". Crea o actualiza el lead
 * del visitante (uno por visitante), con la unidad ya cargada, la campaña de la visita (UTM) y el
 * pedido en su historial.
 */
export async function pedirContacto(_prev: EstadoContacto, formData: FormData): Promise<EstadoContacto> {
  const texto = (campo: string, max = 200) => String(formData.get(campo) ?? "").trim().slice(0, max);
  // Trampa para bots: campo oculto que una persona nunca completa.
  if (texto("empresa")) return { ok: true };

  const unitId = texto("unitId");
  const datos: DatosConsulta = {
    agencyId: texto("agencyId"),
    propertyId: null,
    nombre: texto("nombre", 121),
    telefono: texto("telefono", 40),
    email: "",
    mensaje: "",
    acepto: formData.get("acepto") === "on",
  };
  const errores = validarConsulta(datos) ?? {};
  if (!datos.telefono) errores.contacto = "Dejanos tu WhatsApp para escribirte.";
  if (Object.keys(errores).length) return { ok: false, errores, valores: datos };
  const fallo = (general = ERROR_GENERAL): EstadoContacto => ({ ok: false, errores: { general }, valores: datos });
  if (!UUID.test(unitId) || !isSupabaseConfigured()) return fallo();

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!porIp.permitir(ip)) return fallo("Mandaste varios pedidos seguidos. Esperá un minuto y probá de nuevo.");

  const utm: Utm = {};
  for (const c of ["source", "medium", "campaign", "content", "term"] as const) {
    const v = texto(`utm_${c}`, 100);
    if (v) utm[c] = v;
  }
  const origen = ORIGENES.has(texto("origen")) ? texto("origen") : "boton";

  try {
    const db = createAdminClient();
    // La unidad tiene que ser de un proyecto publicado de la inmobiliaria de este sitio.
    const [agencia, { data: unidad }] = await Promise.all([
      getAgenciaDelPedido(),
      db.from("units").select("id, codigo, categoria, project_id, proyecto:projects!inner(nombre, agency_id, publicado)").eq("id", unitId).maybeSingle(),
    ]);
    if (!agencia || agencia.id !== datos.agencyId || !unidad || unidad.proyecto.agency_id !== agencia.id || !unidad.proyecto.publicado) return fallo();

    const { visitante } = await asegurarVisitante(db, agencia.id, utm);
    const lead = await guardarLead(db, {
      visitante,
      propertyId: null,
      unitId: unidad.id,
      origen: "formulario",
      datos: { nombre: datos.nombre, telefono: datos.telefono, mensaje: `Me interesa ${conArticulo(unidad)} de ${unidad.proyecto.nombre}. Prefiero que me escriban por WhatsApp.` },
      consentimiento: true,
      utm,
    });
    await registrarEventoServidor(db, visitante, "form_submit", null, { projectId: unidad.project_id, unitId: unidad.id, origen });
    await recalcularLead(db, lead);
    return { ok: true, codigo: lead.codigo_ref };
  } catch (error) {
    console.error("[contacto del proyecto]", error instanceof Error ? error.message : error);
    return fallo();
  }
}
