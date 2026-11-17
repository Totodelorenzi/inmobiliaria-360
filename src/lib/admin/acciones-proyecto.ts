"use server";

import { updateTag } from "next/cache";
import { ESTADOS_UNIDAD, type EstadoUnidad, type Punto } from "@/lib/edificio";
import { createClient, tagSitio } from "@/lib/supabase/server";
import { mensajeError, SESION_VENCIDA, sesionParaAccion, type Resultado } from "./sesion";
import { rutaDeUrl } from "./storage";

/**
 * Panel del módulo desarrolladora. Todas las escrituras van con la sesión del usuario: la RLS
 * garantiza que cada inmobiliaria solo toque lo suyo (una fila ajena no se actualiza: 0 filas).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, error: "No encontramos ese dato en tu cuenta. Recargá la página." };

/** Cambia el estado comercial de una unidad (un toque en la lista). */
export async function cambiarEstadoUnidad(unitId: string, estado: EstadoUnidad): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  if (!UUID.test(unitId) || !ESTADOS_UNIDAD.includes(estado)) return NO_ENCONTRADO;
  const supabase = await createClient();
  const { data, error } = await supabase.from("units").update({ estado }).eq("id", unitId).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo cambiar el estado.") };
  if (data.length === 0) return NO_ENCONTRADO;
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true };
}

/** Zona tocable de un piso (sobre la fachada) o de una unidad (sobre la planta). `null` la borra. */
export async function guardarZona(tipo: "piso" | "unidad", id: string, puntos: Punto[] | null): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  if (!UUID.test(id)) return NO_ENCONTRADO;
  let poligono: Punto[] | null = null;
  if (puntos) {
    const validos =
      Array.isArray(puntos) &&
      puntos.length >= 3 &&
      puntos.length <= 60 &&
      puntos.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && n >= 0 && n <= 100));
    if (!validos) return { ok: false, error: "Marcá al menos 3 puntos sobre la imagen." };
    poligono = puntos.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  }
  const supabase = await createClient();
  const { data, error } =
    tipo === "piso"
      ? await supabase.from("project_floors").update({ poligono }).eq("id", id).select("id")
      : await supabase.from("units").update({ poligono }).eq("id", id).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo guardar la zona.") };
  if (data.length === 0) return NO_ENCONTRADO;
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: poligono ? "Zona guardada." : "Zona borrada." };
}

export type DestinoImagen = { tipo: "fachada" | "planta" | "maqueta" | "render"; id: string };

/**
 * Reemplaza una imagen del proyecto por una ya subida a Storage (carpeta de la inmobiliaria).
 * El archivo anterior no se borra: varias filas pueden compartirlo (plantas iguales, mismos renders).
 */
export async function reemplazarImagen(destino: DestinoImagen, imagen: { url: string; ancho: number; alto: number }): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  if (!UUID.test(destino.id)) return NO_ENCONTRADO;
  const ruta = rutaDeUrl(imagen.url);
  const medidas = [imagen.ancho, imagen.alto].every((n) => Number.isInteger(n) && n > 0 && n <= 20000);
  if (!ruta || ruta.bucket !== "fotos" || !ruta.ruta.startsWith(`${sesion.agencia.id}/`) || imagen.url.length > 500 || !medidas) {
    return { ok: false, error: "La imagen no se subió bien. Probá de nuevo." };
  }
  const { url, ancho, alto } = imagen;
  const supabase = await createClient();
  const { data, error } =
    destino.tipo === "fachada"
      ? await supabase.from("projects").update({ fachada_url: url, fachada_ancho: ancho, fachada_alto: alto }).eq("id", destino.id).select("id")
      : destino.tipo === "planta"
        ? await supabase.from("project_floors").update({ planta_url: url, planta_ancho: ancho, planta_alto: alto }).eq("id", destino.id).select("id")
        : destino.tipo === "maqueta"
          ? await supabase.from("unit_types").update({ maqueta_url: url, maqueta_ancho: ancho, maqueta_alto: alto }).eq("id", destino.id).select("id")
          : await supabase.from("unit_type_rooms").update({ render_url: url }).eq("id", destino.id).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo guardar la imagen.") };
  if (data.length === 0) return NO_ENCONTRADO;
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: "Imagen reemplazada." };
}
