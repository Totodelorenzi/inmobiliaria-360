"use server";

import { updateTag } from "next/cache";
import { normalizeHex } from "@/lib/color";
import { createClient, TAG_AGENCIAS, tagSitio } from "@/lib/supabase/server";
import type { Enums, TablesUpdate } from "@/types/database";
import { sumarPorEmail } from "./invitaciones";
import { MENSAJE_SESION_VENCIDA, mensajeError, SESION_VENCIDA, sesionParaAccion, type Resultado, type Sesion } from "./sesion";

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function eliminarLead(id: string): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  return error ? { ok: false, error: mensajeError(error, "No se pudo eliminar la consulta.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Configuración de la inmobiliaria
// ---------------------------------------------------------------------------

export type EstadoAgencia = { ok?: boolean; mensaje?: string; errores?: Record<string, string> };

const URL_VALIDA = /^https?:\/\/[^\s]+\.[^\s]+$/i;

export async function guardarAgencia(_prev: EstadoAgencia, formData: FormData): Promise<EstadoAgencia> {
  const sesion = await sesionParaAccion();
  if (!sesion) return { errores: { general: MENSAJE_SESION_VENCIDA } };
  if (sesion.rol !== "admin") return { errores: { general: "Solo un administrador puede cambiar la configuración." } };

  const texto = (campo: string, max: number) => {
    const v = String(formData.get(campo) ?? "").trim().slice(0, max);
    return v || null;
  };
  const errores: Record<string, string> = {};
  const cambios: TablesUpdate<"agencies"> = {};

  const nombre = texto("nombre", 120);
  if (!nombre) errores.nombre = "Escribí el nombre de la inmobiliaria.";
  else cambios.nombre = nombre;

  const color = normalizeHex(texto("color_primario", 7));
  if (!color) errores.color_primario = "Elegí un color válido.";
  else cambios.color_primario = color;

  const whatsapp = texto("whatsapp", 30)?.replace(/\D/g, "") ?? null;
  if (whatsapp && !/^\d{8,15}$/.test(whatsapp)) errores.whatsapp = "Escribí el número con código de país, ej. 5491122334455.";
  else cambios.whatsapp = whatsapp;

  const email = texto("email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errores.email = "Revisá el email.";
  else cambios.email = email;

  for (const red of ["instagram", "facebook"] as const) {
    const url = texto(red, 200);
    if (url && !URL_VALIDA.test(url)) errores[red] = "Pegá el link completo, empezando con https://";
    else cambios[red] = url;
  }
  cambios.telefono = texto("telefono", 40);
  cambios.direccion = texto("direccion", 200);
  const logo = texto("logo_url", 500);
  if (logo !== undefined) cambios.logo_url = logo;

  if (Object.keys(errores).length > 0) return { errores };
  const supabase = await createClient();
  const { error } = await supabase.from("agencies").update(cambios).eq("id", sesion.agencia.id);
  if (error) return { errores: { general: mensajeError(error, "No se pudo guardar la configuración.") } };
  updateTag(TAG_AGENCIAS);
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: "¡Guardado! Los cambios ya se ven en la web." };
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

async function sesionAdmin(): Promise<{ ok: true; sesion: Sesion } | { ok: false; error: Resultado }> {
  const sesion = await sesionParaAccion();
  if (!sesion) return { ok: false, error: SESION_VENCIDA };
  if (sesion.rol !== "admin") return { ok: false, error: { ok: false, error: "Solo un administrador puede gestionar usuarios." } };
  return { ok: true, sesion };
}

/** Invita por email: si la persona no tiene cuenta, le llega un mail para crear su contraseña. */
export async function invitarUsuario(_prev: Resultado | null, formData: FormData): Promise<Resultado> {
  const ctx = await sesionAdmin();
  if (!ctx.ok) return ctx.error;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = (formData.get("rol") === "admin" ? "admin" : "agente") as Enums<"rol_miembro">;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "Escribí un email válido." };

  const r = await sumarPorEmail(email, ctx.sesion.agencia.id, rol);
  if (!r.ok) return r;
  return { ok: true, mensaje: r.invitado ? `Listo: le mandamos a ${email} un mail para crear su contraseña.` : `${email} ya tenía cuenta: ahora también tiene acceso a esta inmobiliaria.` };
}

export async function cambiarRol(userId: string, rol: Enums<"rol_miembro">): Promise<Resultado> {
  const ctx = await sesionAdmin();
  if (!ctx.ok) return ctx.error;
  if (userId === ctx.sesion.userId) return { ok: false, error: "No podés cambiar tu propio rol." };
  const supabase = await createClient();
  const { error } = await supabase.from("agency_members").update({ rol }).eq("user_id", userId).eq("agency_id", ctx.sesion.agencia.id);
  return error ? { ok: false, error: mensajeError(error, "No se pudo cambiar el rol.") } : { ok: true };
}

export async function quitarUsuario(userId: string): Promise<Resultado> {
  const ctx = await sesionAdmin();
  if (!ctx.ok) return ctx.error;
  if (userId === ctx.sesion.userId) return { ok: false, error: "No podés quitarte a vos mismo." };
  const supabase = await createClient();
  const { error } = await supabase.from("agency_members").delete().eq("user_id", userId).eq("agency_id", ctx.sesion.agencia.id);
  return error ? { ok: false, error: mensajeError(error, "No se pudo quitar el usuario.") } : { ok: true, mensaje: "Usuario quitado." };
}
