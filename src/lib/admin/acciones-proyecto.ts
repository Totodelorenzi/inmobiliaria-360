"use server";

import { updateTag } from "next/cache";
import { ESTADOS_UNIDAD, estadosPara, letraUnidad, type EstadoUnidad, type Punto } from "@/lib/edificio";
import { plural } from "@/lib/format";
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
  // El local en alquiler queda "alquilado"; departamentos y cocheras, reservados o vendidos.
  const { data: actual } = await supabase.from("units").select("operacion").eq("id", unitId).maybeSingle();
  if (!actual) return NO_ENCONTRADO;
  if (!estadosPara(actual.operacion).includes(estado)) return { ok: false, error: "Ese estado no corresponde a esta unidad." };
  const { data, error } = await supabase.from("units").update({ estado }).eq("id", unitId).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo cambiar el estado.") };
  if (data.length === 0) return NO_ENCONTRADO;
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true };
}

/** Zona tocable de un piso (sobre la fachada) o de una unidad (sobre la planta). `null` la borra. */
export async function guardarZona(tipo: "piso" | "piso2" | "unidad", id: string, puntos: Punto[] | null): Promise<Resultado> {
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
      : tipo === "piso2"
        ? await supabase.from("project_floors").update({ poligono2: poligono }).eq("id", id).select("id")
        : await supabase.from("units").update({ poligono }).eq("id", id).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo guardar la zona.") };
  if (data.length === 0) return NO_ENCONTRADO;
  const copias = tipo === "unidad" ? await copiarZonaAPisosIguales(supabase, id, poligono) : 0;
  updateTag(tagSitio(sesion.agencia.id));
  const base = poligono ? "Zona guardada" : "Zona borrada";
  return { ok: true, mensaje: copias ? `${base}, también en ${plural(copias, "unidad", "unidades")} de los otros pisos con la misma planta.` : `${base}.` };
}

/**
 * Los pisos con la misma imagen de planta comparten la distribución: la zona de una unidad se copia
 * a la unidad de la misma letra de esos pisos ("3B" → "1B", "2B", "4B"). Devuelve cuántas copió.
 */
async function copiarZonaAPisosIguales(supabase: Awaited<ReturnType<typeof createClient>>, unitId: string, poligono: Punto[] | null) {
  const { data: unidad } = await supabase.from("units").select("codigo, project_id, piso:project_floors(id, planta_url)").eq("id", unitId).maybeSingle();
  if (!unidad?.piso?.planta_url) return 0;
  const { data: pisos } = await supabase
    .from("project_floors")
    .select("id")
    .eq("project_id", unidad.project_id)
    .eq("planta_url", unidad.piso.planta_url)
    .neq("id", unidad.piso.id);
  if (!pisos?.length) return 0;
  const { data: vecinas } = await supabase.from("units").select("id, codigo").in("floor_id", pisos.map((p) => p.id));
  const letra = letraUnidad(unidad.codigo);
  const ids = (vecinas ?? []).filter((u) => letraUnidad(u.codigo) === letra).map((u) => u.id);
  if (!ids.length) return 0;
  const { data } = await supabase.from("units").update({ poligono }).in("id", ids).select("id");
  return data?.length ?? 0;
}

export type DestinoImagen = { tipo: "fachada" | "fachada2" | "planta" | "maqueta" | "render" | "espacio"; id: string };

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
      : destino.tipo === "fachada2"
        ? await supabase.from("projects").update({ fachada2_url: url, fachada2_ancho: ancho, fachada2_alto: alto }).eq("id", destino.id).select("id")
        : destino.tipo === "espacio"
          ? await supabase.from("project_space_images").update({ url }).eq("id", destino.id).select("id")
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

/** Punto de un espacio común (pileta, SUM, lobby) sobre la planta de su piso. `null` lo saca. */
export async function guardarPunto(spaceId: string, punto: Punto | null): Promise<Resultado> {
  const sesion = await sesionParaAccion();
  if (!sesion) return SESION_VENCIDA;
  if (!UUID.test(spaceId)) return NO_ENCONTRADO;
  if (punto && !(Array.isArray(punto) && punto.length === 2 && punto.every((n) => typeof n === "number" && n >= 0 && n <= 100))) {
    return { ok: false, error: "Tocá un lugar sobre la planta." };
  }
  const supabase = await createClient();
  const valor = punto ? [Math.round(punto[0] * 100) / 100, Math.round(punto[1] * 100) / 100] : null;
  const { data, error } = await supabase.from("project_spaces").update({ punto: valor }).eq("id", spaceId).select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudo guardar el punto.") };
  if (data.length === 0) return NO_ENCONTRADO;
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: punto ? "Punto guardado." : "Punto borrado." };
}

export type EstadoTextos = { ok: boolean; mensaje?: string; error?: string };

/**
 * Lo que la desarrolladora cuenta en la landing: quiénes son (vista 1) y los datos del proyecto
 * (vista 2). Unidades y superficies salen solas de las unidades cargadas.
 */
export async function guardarTextos(projectId: string, _prev: EstadoTextos, formData: FormData): Promise<EstadoTextos> {
  const sesion = await sesionParaAccion();
  if (!sesion) return { ok: false, error: "Tu sesión venció. Volvé a entrar al panel." };
  if (!UUID.test(projectId)) return { ok: false, error: "No encontramos ese proyecto en tu cuenta. Recargá la página." };
  const texto = (campo: string, max: number) => {
    const v = String(formData.get(campo) ?? "").trim();
    return v ? v.slice(0, max) : null;
  };
  const amenities = String(formData.get("amenities") ?? "")
    .split(/\r?\n/)
    .map((a) => a.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
  const transicion = formData.get("transicion") === "secuencia" ? "secuencia" : "fundido";
  const supabase = await createClient();
  if (transicion === "secuencia") {
    const { data } = await supabase.from("projects").select("secuencia, fachada2_url").eq("id", projectId).maybeSingle();
    if (!data?.secuencia || !data.fachada2_url) return { ok: false, error: "Para el giro hacen falta la vista 2 y los cuadros del video cargados. Por ahora queda el fundido." };
  }
  const { data, error } = await supabase
    .from("projects")
    .update({
      sobre_titulo: texto("sobre_titulo", 120),
      sobre_texto: texto("sobre_texto", 1200),
      direccion: texto("direccion", 200),
      ciudad: texto("ciudad", 80),
      entrega: texto("entrega", 80),
      descripcion: texto("descripcion", 2000),
      vista1_nombre: texto("vista1_nombre", 60),
      vista2_nombre: texto("vista2_nombre", 60),
      amenities,
      transicion,
    })
    .eq("id", projectId)
    .select("id");
  if (error) return { ok: false, error: mensajeError(error, "No se pudieron guardar los textos.") };
  if (data.length === 0) return { ok: false, error: "No encontramos ese proyecto en tu cuenta. Recargá la página." };
  updateTag(tagSitio(sesion.agencia.id));
  return { ok: true, mensaje: "Textos guardados: ya se ven en la web." };
}
