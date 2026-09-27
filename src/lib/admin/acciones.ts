"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, TAG_SITIO } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";
import {
  requisitosPublicacion,
  slugDisponible,
  slugify,
  TITULO_BORRADOR,
  validarDatos,
  type ErroresDatos,
} from "./propiedad";
import { MENSAJE_SESION_VENCIDA, mensajeError, SESION_VENCIDA, sesionParaAccion, type Resultado } from "./sesion";
import { borrarArchivos, borrarCarpetaPropiedad, copiarArchivo } from "./storage";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Actualiza la web pública al instante si la propiedad está (o estuvo) publicada. */
async function refrescarSitioSi(supabase: Supa, propertyId: string, forzar = false) {
  if (forzar) return updateTag(TAG_SITIO);
  const { data } = await supabase.from("properties").select("publicada").eq("id", propertyId).maybeSingle();
  if (data?.publicada) updateTag(TAG_SITIO);
}

async function contexto() {
  const sesion = await sesionParaAccion();
  return sesion ? { sesion, supabase: await createClient() } : null;
}

const falla = (error: { message?: string; code?: string } | null, texto: string): Resultado<never> => ({
  ok: false,
  error: mensajeError(error, texto),
});

// ---------------------------------------------------------------------------
// Propiedades
// ---------------------------------------------------------------------------

export async function crearBorrador() {
  const ctx = await contexto();
  if (!ctx) redirect("/admin/login?error=sesion");
  const { data, error } = await ctx.supabase
    .from("properties")
    .insert({
      agency_id: ctx.sesion.agencia.id,
      titulo: TITULO_BORRADOR,
      slug: `borrador-${crypto.randomUUID().slice(0, 8)}`,
      operacion: "venta",
      tipo: "departamento",
    })
    .select("id")
    .single();
  if (error) throw new Error(mensajeError(error, "No se pudo crear la propiedad."));
  redirect(`/admin/propiedades/${data.id}`);
}

export type ResultadoDatos = { ok: boolean; errores?: ErroresDatos; error?: string; slug?: string };

/** Autoguardado del paso "Datos": recibe solo los campos que cambiaron. */
export async function guardarDatos(id: string, entrada: Record<string, string>): Promise<ResultadoDatos> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, error: MENSAJE_SESION_VENCIDA };
  const { cambios, errores } = validarDatos(entrada);
  const hayErrores = Object.keys(errores).length > 0;
  if (Object.keys(cambios).length === 0) return { ok: !hayErrores, errores };

  const { data: actual, error: errorLectura } = await ctx.supabase.from("properties").select("publicada, slug").eq("id", id).maybeSingle();
  if (errorLectura || !actual) return { ok: false, error: "No encontramos la propiedad. Recargá la página." };

  // El slug sigue al título mientras la propiedad no se publicó (después, los links no pueden cambiar).
  if (cambios.titulo && !actual.publicada) {
    const base = slugify(cambios.titulo);
    const { data: usados } = await ctx.supabase.from("properties").select("slug").like("slug", `${base}%`).neq("id", id);
    cambios.slug = slugDisponible(base, (usados ?? []).map((u) => u.slug));
  }

  let { error } = await ctx.supabase.from("properties").update(cambios).eq("id", id);
  if (error?.code === "23505" && cambios.slug) {
    // Chocó con un slug que no vemos (borrador de otra inmobiliaria): se agrega un sufijo al azar.
    cambios.slug = `${cambios.slug}-${crypto.randomUUID().slice(0, 4)}`;
    ({ error } = await ctx.supabase.from("properties").update(cambios).eq("id", id));
  }
  if (error) return { ok: false, errores, error: mensajeError(error, "No se pudieron guardar los cambios.") };
  if (actual.publicada) updateTag(TAG_SITIO);
  return { ok: !hayErrores, errores, slug: cambios.slug };
}

/** Publicar, despublicar o destacar. Publicar exige los requisitos obligatorios. */
export async function cambiarEstado(id: string, cambio: { publicada?: boolean; destacada?: boolean }): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  if (cambio.publicada) {
    const { data: p } = await ctx.supabase
      .from("properties")
      .select("titulo, precio, barrio, ciudad, descripcion, lat, estado_obra, fecha_entrega, fotos:property_photos(count), escenas:tour_scenes(count), planos:property_plans(count)")
      .eq("id", id)
      .maybeSingle();
    if (!p) return { ok: false, error: "No encontramos la propiedad." };
    const faltan = requisitosPublicacion({
      ...p,
      fotos: p.fotos[0]?.count ?? 0,
      escenas: p.escenas[0]?.count ?? 0,
      planos: p.planos[0]?.count ?? 0,
    }).filter((r) => r.obligatorio && !r.ok);
    if (faltan.length > 0) return { ok: false, error: `Para publicar falta: ${faltan.map((f) => f.texto.toLowerCase()).join(", ")}.` };
  }
  const { error } = await ctx.supabase.from("properties").update(cambio).eq("id", id);
  if (error) return falla(error, "No se pudo cambiar el estado.");
  await refrescarSitioSi(ctx.supabase, id, cambio.publicada !== undefined);
  return { ok: true, mensaje: cambio.publicada ? "¡Publicada! Ya se ve en la web." : cambio.publicada === false ? "Despublicada." : "Listo." };
}

/** Duplica la propiedad como borrador, copiando también sus archivos. */
export async function duplicarPropiedad(id: string) {
  const ctx = await contexto();
  if (!ctx) redirect("/admin/login?error=sesion");
  const { supabase } = ctx;
  const { data: p, error } = await supabase
    .from("properties")
    .select("*, fotos:property_photos(*), escenas:tour_scenes(*, hotspots:tour_hotspots!tour_hotspots_scene_id_fkey(*)), planos:property_plans(*, puntos:plan_hotspots(*))")
    .eq("id", id)
    .single();
  if (error) throw new Error(mensajeError(error, "No se pudo leer la propiedad a duplicar."));

  const { id: _original, fotos, escenas, planos, created_at, updated_at, busqueda, ...datos } = p;
  const nuevoId = crypto.randomUUID();
  const titulo = `${datos.titulo} (copia)`.slice(0, 160);
  const { error: errorAlta } = await supabase.from("properties").insert({
    ...datos,
    id: nuevoId,
    titulo,
    slug: `${slugify(titulo)}-${nuevoId.slice(0, 4)}`,
    publicada: false,
    destacada: false,
    es_demo: false,
  });
  if (errorAlta) throw new Error(mensajeError(errorAlta, "No se pudo duplicar la propiedad."));

  const copiar = (url: string | null) => copiarArchivo(supabase, url, nuevoId);
  const nuevasFotos = await Promise.all(
    fotos.map(async (f) => ({ property_id: nuevoId, url: (await copiar(f.url))!, thumb_url: await copiar(f.thumb_url), orden: f.orden, es_principal: f.es_principal })),
  );
  if (nuevasFotos.length) await supabase.from("property_photos").insert(nuevasFotos);

  const idEscena = new Map(escenas.map((e) => [e.id, crypto.randomUUID()]));
  const nuevasEscenas: TablesInsert<"tour_scenes">[] = await Promise.all(
    escenas.map(async (e) => ({
      id: idEscena.get(e.id),
      property_id: nuevoId,
      nombre_ambiente: e.nombre_ambiente,
      panorama_url: (await copiar(e.panorama_url))!,
      thumb_url: await copiar(e.thumb_url),
      orden: e.orden,
      yaw_inicial: e.yaw_inicial,
      pitch_inicial: e.pitch_inicial,
    })),
  );
  if (nuevasEscenas.length) await supabase.from("tour_scenes").insert(nuevasEscenas);
  const hotspots = escenas.flatMap((e) =>
    e.hotspots.map((h) => ({ scene_id: idEscena.get(h.scene_id)!, target_scene_id: idEscena.get(h.target_scene_id)!, yaw: h.yaw, pitch: h.pitch, texto: h.texto })),
  );
  if (hotspots.length) await supabase.from("tour_hotspots").insert(hotspots);

  for (const plano of planos) {
    const nuevoPlano = crypto.randomUUID();
    await supabase.from("property_plans").insert({
      id: nuevoPlano,
      property_id: nuevoId,
      nombre: plano.nombre,
      url: (await copiar(plano.url))!,
      thumb_url: await copiar(plano.thumb_url),
      orden: plano.orden,
      tipo_original: plano.tipo_original,
    });
    if (plano.puntos.length) {
      await supabase.from("plan_hotspots").insert(
        plano.puntos.map((pt) => ({ plan_id: nuevoPlano, x_pct: pt.x_pct, y_pct: pt.y_pct, texto: pt.texto, scene_id: pt.scene_id ? (idEscena.get(pt.scene_id) ?? null) : null })),
      );
    }
  }
  redirect(`/admin/propiedades/${nuevoId}?aviso=duplicada`);
}

/** Elimina la propiedad y todos sus archivos. */
export async function eliminarPropiedad(id: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: p } = await ctx.supabase.from("properties").select("agency_id, publicada").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "La propiedad ya no existe." };
  await borrarCarpetaPropiedad(ctx.supabase, p.agency_id, id);
  const { error } = await ctx.supabase.from("properties").delete().eq("id", id);
  if (error) return falla(error, "No se pudo eliminar la propiedad.");
  if (p.publicada) updateTag(TAG_SITIO);
  return { ok: true, mensaje: "Propiedad eliminada." };
}

/** Borra todas las propiedades marcadas como datos de ejemplo (solo administradores). */
export async function borrarDatosDeEjemplo(): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  if (ctx.sesion.rol !== "admin") return { ok: false, error: "Solo un administrador puede borrar los datos de ejemplo." };
  const { data: demo, error } = await ctx.supabase.from("properties").select("id").eq("agency_id", ctx.sesion.agencia.id).eq("es_demo", true);
  if (error) return falla(error, "No se pudieron buscar los datos de ejemplo.");
  for (const { id } of demo) await borrarCarpetaPropiedad(ctx.supabase, ctx.sesion.agencia.id, id);
  const { error: errorBorrado } = await ctx.supabase.from("properties").delete().eq("agency_id", ctx.sesion.agencia.id).eq("es_demo", true);
  if (errorBorrado) return falla(errorBorrado, "No se pudieron borrar los datos de ejemplo.");
  updateTag(TAG_SITIO);
  return { ok: true, mensaje: `Listo: se borraron ${demo.length} propiedades de ejemplo.` };
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------

export async function registrarFoto(propertyId: string, foto: { url: string; thumb_url: string }): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: existentes } = await ctx.supabase.from("property_photos").select("orden, es_principal").eq("property_id", propertyId);
  const orden = Math.max(-1, ...(existentes ?? []).map((f) => f.orden)) + 1;
  const { error } = await ctx.supabase.from("property_photos").insert({
    property_id: propertyId,
    ...foto,
    orden,
    es_principal: !(existentes ?? []).some((f) => f.es_principal),
  });
  if (error) return falla(error, "La foto se subió pero no se pudo guardar. Probá de nuevo.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

/** Guarda un nuevo orden (lista de ids) para fotos, escenas o planos. */
export async function reordenar(tabla: "property_photos" | "tour_scenes" | "property_plans", propertyId: string, ids: string[]): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const resultados = await Promise.all(ids.map((id, orden) => ctx.supabase.from(tabla).update({ orden }).eq("id", id).eq("property_id", propertyId)));
  const error = resultados.find((r) => r.error)?.error ?? null;
  if (error) return falla(error, "No se pudo guardar el orden.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function marcarPrincipal(fotoId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { error } = await ctx.supabase.from("property_photos").update({ es_principal: true }).eq("id", fotoId);
  if (error) return falla(error, "No se pudo marcar como principal.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function eliminarFoto(fotoId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: foto } = await ctx.supabase.from("property_photos").select("url, thumb_url, es_principal").eq("id", fotoId).maybeSingle();
  if (!foto) return { ok: true };
  const { error } = await ctx.supabase.from("property_photos").delete().eq("id", fotoId);
  if (error) return falla(error, "No se pudo eliminar la foto.");
  await borrarArchivos(ctx.supabase, [foto.url, foto.thumb_url]);
  if (foto.es_principal) {
    const { data: siguiente } = await ctx.supabase.from("property_photos").select("id").eq("property_id", propertyId).order("orden").limit(1).maybeSingle();
    if (siguiente) await ctx.supabase.from("property_photos").update({ es_principal: true }).eq("id", siguiente.id);
  }
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tour 360°
// ---------------------------------------------------------------------------

export async function registrarEscena(
  propertyId: string,
  escena: { nombre_ambiente: string; panorama_url: string; thumb_url: string },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: existentes } = await ctx.supabase.from("tour_scenes").select("orden").eq("property_id", propertyId);
  const { error } = await ctx.supabase.from("tour_scenes").insert({
    property_id: propertyId,
    ...escena,
    nombre_ambiente: escena.nombre_ambiente.trim().slice(0, 60) || "Ambiente",
    orden: Math.max(-1, ...(existentes ?? []).map((e) => e.orden)) + 1,
  });
  if (error) return falla(error, "La panorámica se subió pero no se pudo guardar. Probá de nuevo.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function actualizarEscena(
  escenaId: string,
  propertyId: string,
  cambios: { nombre_ambiente?: string; yaw_inicial?: number; pitch_inicial?: number },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  if (cambios.nombre_ambiente !== undefined) {
    cambios.nombre_ambiente = cambios.nombre_ambiente.trim().slice(0, 60);
    if (!cambios.nombre_ambiente) return { ok: false, error: "Poné un nombre al ambiente (ej. Living)." };
  }
  const { error } = await ctx.supabase.from("tour_scenes").update(cambios).eq("id", escenaId);
  if (error) return falla(error, "No se pudo guardar el ambiente.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true, mensaje: cambios.yaw_inicial !== undefined ? "Vista inicial guardada." : undefined };
}

export async function eliminarEscena(escenaId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: escena } = await ctx.supabase.from("tour_scenes").select("panorama_url, thumb_url").eq("id", escenaId).maybeSingle();
  if (!escena) return { ok: true };
  const { error } = await ctx.supabase.from("tour_scenes").delete().eq("id", escenaId);
  if (error) return falla(error, "No se pudo eliminar el ambiente.");
  await borrarArchivos(ctx.supabase, [escena.panorama_url, escena.thumb_url]);
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function crearHotspot(
  propertyId: string,
  hotspot: { scene_id: string; target_scene_id: string; yaw: number; pitch: number; texto: string | null },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { error } = await ctx.supabase.from("tour_hotspots").insert({
    ...hotspot,
    yaw: Math.max(-180, Math.min(180, hotspot.yaw)),
    pitch: Math.max(-90, Math.min(90, hotspot.pitch)),
    texto: hotspot.texto?.trim().slice(0, 60) || null,
  });
  if (error) return falla(error, "No se pudo guardar el punto de paso.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function eliminarHotspot(hotspotId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { error } = await ctx.supabase.from("tour_hotspots").delete().eq("id", hotspotId);
  if (error) return falla(error, "No se pudo eliminar el punto de paso.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

export async function registrarPlano(
  propertyId: string,
  plano: { nombre: string; url: string; thumb_url: string; tipo_original: "imagen" | "pdf" },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: existentes } = await ctx.supabase.from("property_plans").select("orden").eq("property_id", propertyId);
  const { error } = await ctx.supabase.from("property_plans").insert({
    property_id: propertyId,
    ...plano,
    nombre: plano.nombre.trim().slice(0, 60) || "Plano",
    orden: Math.max(-1, ...(existentes ?? []).map((p) => p.orden)) + 1,
  });
  if (error) return falla(error, "El plano se subió pero no se pudo guardar. Probá de nuevo.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function renombrarPlano(planoId: string, propertyId: string, nombre: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const limpio = nombre.trim().slice(0, 60);
  if (!limpio) return { ok: false, error: "Poné un nombre al plano (ej. Planta baja)." };
  const { error } = await ctx.supabase.from("property_plans").update({ nombre: limpio }).eq("id", planoId);
  if (error) return falla(error, "No se pudo renombrar el plano.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function eliminarPlano(planoId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { data: plano } = await ctx.supabase.from("property_plans").select("url, thumb_url").eq("id", planoId).maybeSingle();
  if (!plano) return { ok: true };
  const { error } = await ctx.supabase.from("property_plans").delete().eq("id", planoId);
  if (error) return falla(error, "No se pudo eliminar el plano.");
  await borrarArchivos(ctx.supabase, [plano.url, plano.thumb_url]);
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function guardarPunto(
  propertyId: string,
  punto: { id?: string; plan_id: string; x_pct: number; y_pct: number; texto: string; scene_id: string | null },
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const texto = punto.texto.trim().slice(0, 60);
  if (!texto) return { ok: false, error: "Poné un nombre al punto (ej. Cocina)." };
  const datos = {
    plan_id: punto.plan_id,
    x_pct: Math.max(0, Math.min(100, punto.x_pct)),
    y_pct: Math.max(0, Math.min(100, punto.y_pct)),
    texto,
    scene_id: punto.scene_id || null,
  };
  const { error } = punto.id
    ? await ctx.supabase.from("plan_hotspots").update(datos).eq("id", punto.id)
    : await ctx.supabase.from("plan_hotspots").insert(datos);
  if (error) return falla(error, "No se pudo guardar el punto.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}

export async function eliminarPunto(puntoId: string, propertyId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return SESION_VENCIDA;
  const { error } = await ctx.supabase.from("plan_hotspots").delete().eq("id", puntoId);
  if (error) return falla(error, "No se pudo eliminar el punto.");
  await refrescarSitioSi(ctx.supabase, propertyId);
  return { ok: true };
}
