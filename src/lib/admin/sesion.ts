import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

export type Sesion = {
  userId: string;
  email: string;
  rol: Enums<"rol_miembro">;
  agencia: Tables<"agencies">;
};

type Estado = { tipo: "sin-sesion" } | { tipo: "sin-agencia"; email: string } | { tipo: "ok"; sesion: Sesion };

/** Usuario logueado y su inmobiliaria (una consulta por request gracias a cache()). */
export const getEstadoSesion = cache(async (): Promise<Estado> => {
  if (!isSupabaseConfigured()) return { tipo: "sin-sesion" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { tipo: "sin-sesion" };
  const email = typeof claims.email === "string" ? claims.email : "";

  const { data: miembro } = await supabase
    .from("agency_members")
    .select("rol, agencia:agencies(*)")
    .eq("user_id", claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!miembro?.agencia) return { tipo: "sin-agencia", email };
  return { tipo: "ok", sesion: { userId: claims.sub, email, rol: miembro.rol, agencia: miembro.agencia } };
});

/** Para páginas del panel: redirige al login si no hay sesión. */
export async function requerirSesion(): Promise<Sesion> {
  const estado = await getEstadoSesion();
  if (estado.tipo !== "ok") redirect("/admin/login");
  return estado.sesion;
}

/** Para páginas solo de administradores (configuración, usuarios). */
export async function requerirAdmin(): Promise<Sesion> {
  const sesion = await requerirSesion();
  if (sesion.rol !== "admin") redirect("/admin?aviso=solo-admin");
  return sesion;
}

export type Resultado<T = undefined> = { ok: true; datos?: T; mensaje?: string } | { ok: false; error: string };

export const MENSAJE_SESION_VENCIDA = "Tu sesión venció. Volvé a entrar al panel.";
export const SESION_VENCIDA: Resultado<never> = { ok: false, error: MENSAJE_SESION_VENCIDA };

/** Para Server Actions: la sesión o null (la acción responde con un error claro en vez de redirigir). */
export async function sesionParaAccion() {
  const estado = await getEstadoSesion();
  return estado.tipo === "ok" ? estado.sesion : null;
}

/** Traduce errores de Supabase a mensajes que entiende cualquiera. */
export function mensajeError(error: { message?: string; code?: string } | null | undefined, porDefecto: string) {
  const m = error?.message ?? "";
  if (error?.code === "23505" || /duplicate key/i.test(m)) return "Ya existe un registro con esos datos.";
  if (error?.code === "42501" || /row-level security|permission denied/i.test(m)) return "No tenés permiso para hacer esto.";
  if (/check constraint/i.test(m)) return "Algún dato no es válido. Revisá el formulario.";
  if (/fetch failed|network/i.test(m)) return "No hay conexión con el servidor. Probá de nuevo en unos segundos.";
  return porDefecto;
}
