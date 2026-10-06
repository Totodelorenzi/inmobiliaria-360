"use server";

import { getSiteUrl } from "@/lib/env";
import { codigoLink } from "@/lib/previsita/codigos";
import { crearVisitante, guardarLead } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/types/database";
import { MENSAJE_SESION_VENCIDA, mensajeError, SESION_VENCIDA, sesionParaAccion, type Resultado } from "./sesion";

/** Estado y notas del lead (lo único que el equipo edita; el puntaje lo calcula el sistema). */
export async function actualizarLead(id: string, cambios: { estado?: Enums<"estado_lead">; notas?: string }): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  const datos: { estado?: Enums<"estado_lead">; notas?: string | null } = {};
  if (cambios.estado) {
    if (!Constants.public.Enums.estado_lead.includes(cambios.estado)) return { ok: false, error: "Estado inválido." };
    datos.estado = cambios.estado;
  }
  if (cambios.notas !== undefined) datos.notas = cambios.notas.trim().slice(0, 5000) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(datos).eq("id", id).eq("agency_id", sesion.agencia.id);
  if (error) return { ok: false, error: mensajeError(error, "No se pudo guardar el cambio.") };
  return { ok: true, mensaje: cambios.notas !== undefined ? "Notas guardadas." : undefined };
}

export type LinkGenerado = { url: string; nombre: string; telefono: string | null; titulo: string; leadId: string };
export type EstadoLink = { ok: boolean; error?: string; link?: LinkGenerado };

/**
 * Link de pre-visita para un prospecto: crea de antemano el visitante (todavía sin abrir), el link y
 * el lead. Cuando la persona abre /v/[codigo], su navegador adopta ese visitante y todo lo que
 * recorra queda en el lead.
 */
export async function crearLinkPrevisita(_prev: EstadoLink, formData: FormData): Promise<EstadoLink> {
  const sesion = await sesionParaAccion();
  if (!sesion) return { ok: false, error: MENSAJE_SESION_VENCIDA };
  const propertyId = String(formData.get("propertyId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const telefono = String(formData.get("telefono") ?? "").trim().slice(0, 40) || null;
  if (nombre.length < 2) return { ok: false, error: "Escribí el nombre del prospecto." };
  if (telefono && telefono.replace(/\D/g, "").length < 6) return { ok: false, error: "Revisá el teléfono." };

  const supabase = await createClient();
  const { data: propiedad } = await supabase
    .from("properties")
    .select("id, titulo, publicada")
    .eq("id", propertyId)
    .eq("agency_id", sesion.agencia.id)
    .maybeSingle();
  if (!propiedad) return { ok: false, error: "Elegí una propiedad." };
  if (!propiedad.publicada) return { ok: false, error: "La propiedad tiene que estar publicada para compartirla." };

  try {
    // Ya se verificó la sesión y que la propiedad es de la agencia: el alta va con la clave secreta.
    const db = createAdminClient();
    const visitante = await crearVisitante(db, sesion.agencia.id, { abierto: false });
    let codigo = "";
    let linkId = "";
    for (let intento = 0; intento < 5 && !linkId; intento++) {
      codigo = codigoLink();
      const { data, error } = await db
        .from("tracked_links")
        .insert({
          agency_id: sesion.agencia.id,
          property_id: propiedad.id,
          codigo,
          nombre_prospecto: nombre,
          telefono_prospecto: telefono,
          visitor_id: visitante.id,
          creado_por: sesion.userId,
        })
        .select("id")
        .single();
      if (data) linkId = data.id;
      else if (error?.code !== "23505") throw new Error(error?.message);
    }
    if (!linkId) throw new Error("No se pudo generar un código único.");
    await db.from("visitors").update({ tracked_link_id: linkId }).eq("id", visitante.id);
    const lead = await guardarLead(db, {
      visitante: { ...visitante, tracked_link_id: linkId },
      propertyId: propiedad.id,
      origen: "link_personalizado",
      datos: { nombre, telefono },
    });
    return { ok: true, link: { url: `${getSiteUrl()}/v/${codigo}`, nombre, telefono, titulo: propiedad.titulo, leadId: lead.id } };
  } catch (error) {
    console.error("[link pre-visita]", error instanceof Error ? error.message : error);
    return { ok: false, error: "No se pudo generar el link. Probá de nuevo." };
  }
}
