"use server";

import { validarConsulta, type DatosConsulta, type ErroresConsulta } from "@/lib/consulta";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export type EstadoConsulta = {
  ok: boolean;
  errores?: ErroresConsulta;
  valores?: Partial<DatosConsulta>;
};

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
  };
  const errores = validarConsulta(datos);
  if (errores) return { ok: false, errores, valores: datos };

  if (!isSupabaseConfigured()) {
    return { ok: false, errores: { general: "El sitio todavía no está configurado para recibir consultas." }, valores: datos };
  }

  const { error } = await createPublicClient({ cache: false })
    .from("leads")
    .insert({
      agency_id: datos.agencyId,
      property_id: datos.propertyId,
      nombre: datos.nombre,
      telefono: datos.telefono || null,
      email: datos.email || null,
      mensaje: datos.mensaje || null,
      origen: "formulario",
    });

  if (error) {
    console.error("[consulta] no se pudo guardar el lead:", error.message);
    return {
      ok: false,
      errores: { general: "No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp." },
      valores: datos,
    };
  }
  return { ok: true };
}
