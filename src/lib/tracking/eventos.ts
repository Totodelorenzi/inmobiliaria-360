/**
 * Formato de los lotes de eventos que manda el navegador y su validación (pura: se usa en el
 * servidor y en los tests). Lo que no cumple se descarta sin romper el resto del lote.
 */
import { Constants, type Enums } from "@/types/database";
import { MAX_DURACION_MS, MAX_EVENTOS_POR_LOTE } from "./config";

export type TipoEvento = Enums<"tipo_evento">;

export type EventoCliente = {
  tipo: TipoEvento;
  propertyId?: string;
  sceneId?: string;
  planId?: string;
  duracionMs?: number;
  meta?: Record<string, string | number | boolean>;
  /** Momento del evento en el navegador (ms). */
  t: number;
  sesion: string;
};

export type Utm = { source?: string; medium?: string; campaign?: string };

export type Lote = { eventos: EventoCliente[]; utm?: Utm };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Eventos que siempre son sobre una propiedad. */
const REQUIERE_PROPIEDAD: TipoEvento[] = ["view_property", "photo_view", "tour_start", "scene_view", "tour_complete", "plan_view", "plan_point_click"];

function validarMeta(meta: unknown): EventoCliente["meta"] | null | undefined {
  if (meta === undefined) return undefined;
  if (!esObjeto(meta)) return null;
  const entradas = Object.entries(meta);
  if (entradas.length > 8) return null;
  const limpio: Record<string, string | number | boolean> = {};
  for (const [clave, valor] of entradas) {
    if (!/^[a-z_]{1,24}$/i.test(clave)) return null;
    if (typeof valor === "string") limpio[clave] = valor.slice(0, 100);
    else if ((typeof valor === "number" && Number.isFinite(valor)) || typeof valor === "boolean") limpio[clave] = valor;
    else return null;
  }
  return limpio;
}

function validarEvento(e: unknown, ahora: number): EventoCliente | null {
  if (!esObjeto(e)) return null;
  const tipo = e.tipo as TipoEvento;
  if (!Constants.public.Enums.tipo_evento.includes(tipo)) return null;
  if (!esUuid(e.sesion)) return null;
  if (e.propertyId !== undefined && !esUuid(e.propertyId)) return null;
  if (REQUIERE_PROPIEDAD.includes(tipo) && !e.propertyId) return null;
  if (e.sceneId !== undefined && !esUuid(e.sceneId)) return null;
  if (e.planId !== undefined && !esUuid(e.planId)) return null;
  if (tipo === "scene_view" && !e.sceneId) return null;
  if ((tipo === "plan_view" || tipo === "plan_point_click") && !e.planId) return null;
  if (e.duracionMs !== undefined && !(Number.isInteger(e.duracionMs) && (e.duracionMs as number) >= 0 && (e.duracionMs as number) <= MAX_DURACION_MS)) {
    return null;
  }
  const meta = validarMeta(e.meta);
  if (meta === null) return null;
  // Hora del navegador: si es absurda (más de 1 día atrás o en el futuro), se usa la del servidor.
  const t = typeof e.t === "number" && e.t > ahora - 86_400_000 && e.t <= ahora + 60_000 ? Math.min(e.t, ahora) : ahora;
  return {
    tipo,
    sesion: e.sesion as string,
    t,
    ...(e.propertyId ? { propertyId: e.propertyId as string } : {}),
    ...(e.sceneId ? { sceneId: e.sceneId as string } : {}),
    ...(e.planId ? { planId: e.planId as string } : {}),
    ...(e.duracionMs !== undefined ? { duracionMs: e.duracionMs as number } : {}),
    ...(meta ? { meta } : {}),
  };
}

function validarUtm(utm: unknown): Utm | undefined {
  if (!esObjeto(utm)) return undefined;
  const limpio: Utm = {};
  for (const clave of ["source", "medium", "campaign"] as const) {
    const v = utm[clave];
    if (typeof v === "string" && v.trim()) limpio[clave] = v.trim().slice(0, 100);
  }
  return Object.keys(limpio).length ? limpio : undefined;
}

/** Valida un lote. Devuelve los eventos válidos (como máximo MAX_EVENTOS_POR_LOTE) y cuántos se descartaron. */
export function validarLote(cuerpo: unknown, ahora = Date.now()): { lote: Lote; descartados: number } | null {
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.eventos)) return null;
  const crudos = cuerpo.eventos.slice(0, MAX_EVENTOS_POR_LOTE);
  const eventos = crudos.map((e) => validarEvento(e, ahora)).filter((e): e is EventoCliente => e !== null);
  return {
    lote: { eventos, utm: validarUtm(cuerpo.utm) },
    descartados: cuerpo.eventos.length - eventos.length,
  };
}
