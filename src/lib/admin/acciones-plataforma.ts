"use server";

import { updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeHex } from "@/lib/color";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAG_AGENCIAS, tagSitio } from "@/lib/supabase/server";
import { entornoActual, esDominioValido, normalizarDominio, validarSubdominio } from "@/lib/tenancy";
import { sumarPorEmail } from "./invitaciones";
import { COOKIE_AGENCIA_ACTIVA, getEstadoSesion, mensajeError, sesionParaAccion } from "./sesion";
import { agregarDominio, quitarDominio, registrosRecomendados, vercelConfigurado } from "./vercel";

// ---------------------------------------------------------------------------
// Inmobiliaria activa en el panel
// ---------------------------------------------------------------------------

/** Cambia la inmobiliaria activa. Solo entre las membresías reales del usuario (leídas de la base). */
export async function cambiarAgencia(agencyId: string) {
  const sesion = await sesionParaAccion();
  if (!sesion) redirect("/admin/login");
  if (sesion.agencias.some((a) => a.id === agencyId)) {
    const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0].trim();
    (await cookies()).set(COOKIE_AGENCIA_ACTIVA, agencyId, {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: proto === "https",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// Superadmin: alta de inmobiliarias y dominios propios
// ---------------------------------------------------------------------------

async function esSuperadmin() {
  const estado = await getEstadoSesion();
  return estado.tipo === "ok" ? estado.sesion.superadmin : estado.tipo === "sin-agencia" && estado.superadmin;
}

const SOLO_SUPERADMIN = "Solo un superadmin de la plataforma puede hacer esto.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EstadoAlta = { ok?: boolean; mensaje?: string; aviso?: string; errores?: Record<string, string>; valores?: Record<string, string> };

export async function crearInmobiliaria(_prev: EstadoAlta, formData: FormData): Promise<EstadoAlta> {
  if (!(await esSuperadmin())) return { errores: { general: SOLO_SUPERADMIN } };
  const texto = (campo: string, max = 200) => String(formData.get(campo) ?? "").trim().slice(0, max);
  const valores = {
    nombre: texto("nombre", 120),
    subdominio: texto("subdominio", 40).toLowerCase(),
    color_primario: texto("color_primario", 7),
    whatsapp: texto("whatsapp", 30).replace(/\D/g, ""),
    email: texto("email").toLowerCase(),
  };
  const errores: Record<string, string> = {};
  if (!valores.nombre) errores.nombre = "Escribí el nombre de la inmobiliaria.";
  const errorSub = validarSubdominio(valores.subdominio);
  if (errorSub) errores.subdominio = errorSub;
  const color = normalizeHex(valores.color_primario);
  if (!color) errores.color_primario = "Elegí un color válido.";
  if (valores.whatsapp && !/^\d{8,15}$/.test(valores.whatsapp)) errores.whatsapp = "Con código de país, ej. 5491122334455.";
  if (!EMAIL.test(valores.email)) errores.email = "Escribí el email del dueño o responsable.";
  if (Object.keys(errores).length) return { errores, valores };

  // Verificado que es superadmin: el alta va con la clave secreta.
  const db = createAdminClient();
  const { data: agencia, error } = await db
    .from("agencies")
    .insert({ nombre: valores.nombre, subdominio: valores.subdominio, color_primario: color!, whatsapp: valores.whatsapp || null })
    .select("id")
    .single();
  if (error) {
    return error.code === "23505"
      ? { errores: { subdominio: "Ese subdominio ya lo usa otra inmobiliaria." }, valores }
      : { errores: { general: mensajeError(error, "No se pudo crear la inmobiliaria.") }, valores };
  }
  updateTag(TAG_AGENCIAS);

  const invitacion = await sumarPorEmail(valores.email, agencia.id, "admin");
  if (!invitacion.ok) {
    return { ok: true, mensaje: `Creada: ${valores.nombre}.`, aviso: `No se pudo invitar a ${valores.email}: ${invitacion.error}` };
  }
  return {
    ok: true,
    mensaje: invitacion.invitado
      ? `Creada: ${valores.nombre}. Le mandamos a ${valores.email} un mail para crear su contraseña y entrar como administrador.`
      : `Creada: ${valores.nombre}. ${valores.email} ya tenía cuenta: ahora también administra esta inmobiliaria.`,
  };
}

export type EstadoDominio = { ok?: boolean; mensaje?: string; error?: string; dominio?: string; dns?: { a: string; cname: string }; automatico?: boolean };

/** Guarda (o quita) el dominio propio. Con token de Vercel, también lo agrega o lo quita del proyecto. */
export async function guardarDominio(_prev: EstadoDominio, formData: FormData): Promise<EstadoDominio> {
  if (!(await esSuperadmin())) return { error: SOLO_SUPERADMIN };
  const agencyId = String(formData.get("agencyId") ?? "");
  const dominio = normalizarDominio(String(formData.get("dominio") ?? ""));
  const base = entornoActual().dominioBase?.replace(/:\d+$/, "");
  if (dominio && !esDominioValido(dominio)) return { error: "Escribí solo el dominio, por ejemplo umbralpropiedades.com.ar." };
  if (dominio && base && (dominio === base || dominio.endsWith(`.${base}`))) {
    return { error: "Ese es un dominio de la plataforma: la inmobiliaria ya lo tiene con su subdominio." };
  }

  const db = createAdminClient();
  const { data: actual } = await db.from("agencies").select("id, dominio_propio").eq("id", agencyId).maybeSingle();
  if (!actual) return { error: "No encontramos la inmobiliaria." };
  const { error } = await db.from("agencies").update({ dominio_propio: dominio || null }).eq("id", agencyId);
  if (error) return { error: error.code === "23505" ? "Ese dominio ya lo usa otra inmobiliaria." : mensajeError(error, "No se pudo guardar el dominio.") };
  updateTag(TAG_AGENCIAS);
  updateTag(tagSitio(agencyId));

  const automatico = vercelConfigurado();
  if (actual.dominio_propio && actual.dominio_propio !== dominio && automatico) await quitarDominio(actual.dominio_propio);
  if (!dominio) return { ok: true, mensaje: "Listo: la web vuelve a usar solo su subdominio." };
  if (automatico) {
    const r = await agregarDominio(dominio);
    if (!r.ok) return { ok: true, error: `Se guardó, pero Vercel no lo aceptó: ${r.error} Agregalo a mano (pasos abajo).`, dominio, dns: await registrosRecomendados(dominio) };
  }
  return {
    ok: true,
    dominio,
    automatico,
    mensaje: automatico ? "Guardado y agregado al proyecto de Vercel. Falta configurar el DNS (abajo)." : "Guardado. Falta agregarlo en Vercel y configurar el DNS (abajo).",
    dns: await registrosRecomendados(dominio),
  };
}
