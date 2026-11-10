"use server";

import { updateTag } from "next/cache";
import { telefonoWhatsapp } from "@/lib/format";
import { createClient, tagSitio } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";
import { MENSAJE_SESION_VENCIDA, mensajeError, SESION_VENCIDA, sesionParaAccion, type Resultado } from "./sesion";

export type EstadoAsesor = { ok?: boolean; mensaje?: string; errores?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Alta o edición de un asesor (con `id`, edita). Solo administradores (lo exige también la RLS). */
export async function guardarAsesor(_prev: EstadoAsesor, formData: FormData): Promise<EstadoAsesor> {
  const sesion = await sesionParaAccion();
  if (!sesion) return { errores: { general: MENSAJE_SESION_VENCIDA } };
  if (sesion.rol !== "admin") return { errores: { general: "Solo un administrador puede cargar asesores." } };

  const texto = (campo: string, max: number) => String(formData.get(campo) ?? "").trim().slice(0, max) || null;
  const errores: Record<string, string> = {};

  const nombre = texto("nombre", 120);
  if (!nombre) errores.nombre = "Escribí el nombre y apellido.";
  const crudo = texto("whatsapp", 30);
  const whatsapp = crudo ? telefonoWhatsapp(crudo) : null;
  if (whatsapp && !/^\d{8,15}$/.test(whatsapp)) errores.whatsapp = "Revisá el número: por ejemplo 221 456-7890 o 5492214567890.";
  const email = texto("email", 200);
  if (email && !EMAIL.test(email)) errores.email = "Revisá el email.";
  if (Object.keys(errores).length > 0) return { errores };

  const fila: Omit<TablesInsert<"advisors">, "agency_id"> = {
    nombre: nombre!,
    rol: texto("rol", 60),
    whatsapp,
    telefono: texto("telefono", 40),
    email,
    matricula: texto("matricula", 120),
    foto_url: texto("foto_url", 500),
    activo: formData.get("activo") === "on",
  };
  const id = texto("id", 36);
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("advisors").update(fila).eq("id", id).eq("agency_id", sesion.agencia.id)
    : await supabase.from("advisors").insert({ ...fila, agency_id: sesion.agencia.id });
  if (error) return { errores: { general: mensajeError(error, "No se pudo guardar el asesor.") } };
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: id ? "Cambios guardados." : `Listo: ${nombre} ya se puede asignar a propiedades.` };
}

/** Quita un asesor. Sus propiedades quedan sin asesor (las consultas van a la inmobiliaria). */
export async function eliminarAsesor(id: string): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  if (sesion.rol !== "admin") return { ok: false, error: "Solo un administrador puede quitar asesores." };
  const supabase = await createClient();
  const { error } = await supabase.from("advisors").delete().eq("id", id).eq("agency_id", sesion.agencia.id);
  if (error) return { ok: false, error: mensajeError(error, "No se pudo quitar el asesor.") };
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: "Asesor quitado." };
}
