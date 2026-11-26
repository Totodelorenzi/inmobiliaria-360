import type { Enums } from "@/types/database";

export type EventoHistorial = {
  tipo: Enums<"tipo_evento">;
  created_at: string;
  sesion_id: string | null;
  duracion_ms: number | null;
  propiedad: string | null;
  escena: string | null;
  plano: string | null;
  /** Módulo desarrolladora: piso, unidad (código) y ambiente del render. */
  piso?: string | null;
  unidad?: string | null;
  ambiente?: string | null;
  /** Espacio común (amenities, lobby) que miró. */
  espacio?: string | null;
  meta: unknown;
};

export type ItemTiempo = { hora: string; tipo: Enums<"tipo_evento">; texto: string; destacado: boolean };
export type Visita = { inicio: string; fin: string; segundos: number; items: ItemTiempo[] };

/** "45 s", "3 min", "1 h 5 min". */
export function duracion(segundos: number) {
  if (segundos < 60) return `${Math.max(1, Math.round(segundos))} s`;
  const min = Math.round(segundos / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

const DESTACADOS: Enums<"tipo_evento">[] = ["tour_complete", "visit_request", "form_submit", "whatsapp_click"];

/** "la unidad 3C", "la cochera C4" o "el local". */
const laUnidad = (codigo: string | null | undefined) => (!codigo ? "una unidad" : /^local/i.test(codigo) ? `el ${codigo.toLowerCase()}` : /^C\d+$/.test(codigo) ? `la cochera ${codigo}` : `la unidad ${codigo}`);

function texto(e: EventoHistorial, repeticiones: number, ms: number) {
  const en = e.propiedad ? ` de “${e.propiedad}”` : "";
  const tiempo = ms > 0 ? ` (${duracion(ms / 1000)})` : "";
  const meta = (e.meta ?? {}) as Record<string, unknown>;
  switch (e.tipo) {
    case "view_property":
      return `Vio la ficha${en}`;
    case "photo_view":
      if (repeticiones > 1) return `Miró ${repeticiones} fotos`;
      if (meta.todas) return "Abrió todas las fotos";
      return typeof meta.ambiente === "string" ? `Miró una foto de ${meta.ambiente.toLowerCase()}` : "Miró una foto";
    case "tour_start":
      return `Empezó el tour 360°${en}${meta.origen === "cartel" ? " desde el QR del cartel" : ""}`;
    case "scene_view":
      return `Recorrió ${e.escena ?? "un ambiente"}${tiempo}`;
    case "tour_complete":
      return `Terminó el tour 360°${en}`;
    case "plan_view":
      return `Miró el plano ${e.plano ?? ""}${tiempo}`.replace("plano  (", "plano (");
    case "plan_point_click":
      return `Tocó “${typeof meta.punto === "string" ? meta.punto : "un ambiente"}” en el plano`;
    case "whatsapp_click":
      return "Tocó “Consultar por WhatsApp”";
    case "form_submit":
      return e.unidad ? `Pidió información de ${laUnidad(e.unidad)}` : "Dejó una consulta";
    case "visit_request":
      return `Pidió visita presencial${en}`;
    case "share":
      return "Compartió la propiedad";
    case "floor_view":
      return `Entró a ${e.piso?.toLowerCase() ?? "un piso"}`;
    case "unit_view":
      return `Vio ${laUnidad(e.unidad)}`;
    case "rooms_open":
      return `Abrió las imágenes de ${laUnidad(e.unidad)}`;
    case "room_view":
      return `Miró el render de ${e.ambiente?.toLowerCase() ?? "un ambiente"}${tiempo}`;
    case "space_view":
      return `Miró ${e.espacio ?? "un espacio común"}${tiempo}`;
  }
}

/**
 * Agrupa el historial por visita (sesión del navegador) y junta eventos repetidos seguidos
 * (varias fotos, la misma escena en tramos) para que la línea de tiempo se lea de un vistazo.
 * Los eventos del servidor (sin sesión) se suman a la visita más cercana.
 */
export function lineaDeTiempo(eventos: EventoHistorial[]): Visita[] {
  const ordenados = [...eventos].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const visitas: { sesion: string | null; eventos: EventoHistorial[] }[] = [];
  for (const e of ordenados) {
    const ultima = visitas.at(-1);
    if (ultima && (e.sesion_id === null || e.sesion_id === ultima.sesion)) ultima.eventos.push(e);
    else visitas.push({ sesion: e.sesion_id, eventos: [e] });
  }

  return visitas
    .map(({ eventos: lista }) => {
      const items: (ItemTiempo & { clave: string; repeticiones: number; ms: number; base: EventoHistorial })[] = [];
      for (const e of lista) {
        const clave = `${e.tipo}:${e.escena ?? ""}:${e.plano ?? ""}:${e.unidad ?? ""}:${e.ambiente ?? ""}:${e.espacio ?? ""}`;
        const previo = items.at(-1);
        const agrupable = e.tipo === "photo_view" || e.tipo === "scene_view" || e.tipo === "plan_view" || e.tipo === "room_view" || e.tipo === "space_view";
        if (previo && agrupable && previo.clave === clave) {
          previo.repeticiones++;
          previo.ms += e.duracion_ms ?? 0;
          previo.texto = texto(previo.base, previo.repeticiones, previo.ms);
          continue;
        }
        const ms = e.duracion_ms ?? 0;
        items.push({ clave, repeticiones: 1, ms, base: e, hora: e.created_at, tipo: e.tipo, texto: texto(e, 1, ms), destacado: DESTACADOS.includes(e.tipo) });
      }
      const segundos = lista.reduce((total, e) => total + (e.duracion_ms ?? 0), 0) / 1000;
      return {
        inicio: lista[0].created_at,
        fin: lista.at(-1)!.created_at,
        segundos,
        items: items.map(({ hora, tipo, texto: t, destacado }) => ({ hora, tipo, texto: t, destacado })),
      };
    })
    .reverse();
}

const ORIGEN_TOUR: Record<string, string> = { cartel: "el QR del cartel", compartido: "un link compartido" };

/**
 * Resumen en una frase para el asesor, solo con lo registrado: "Recorrido: 7 ambientes en 6 min,
 * volvió 2 veces; donde más se quedó: cocina y patio. Abrió el plano. Llegó desde el QR del cartel."
 * `totalAmbientes` (si se conoce) permite decir "7 de 8".
 */
export function resumenParaAsesor(eventos: EventoHistorial[], opciones: { totalAmbientes?: number; origen?: string | null } = {}) {
  const frases: string[] = [];
  const escenas = new Map<string, number>();
  for (const e of eventos) if (e.tipo === "scene_view" && e.escena) escenas.set(e.escena, (escenas.get(e.escena) ?? 0) + (e.duracion_ms ?? 0));
  const sesiones = new Set(eventos.filter((e) => e.sesion_id).map((e) => e.sesion_id)).size;

  if (escenas.size > 0) {
    const ms = [...escenas.values()].reduce((a, b) => a + b, 0);
    const de = opciones.totalAmbientes ? ` de ${opciones.totalAmbientes}` : "";
    const masTiempo = [...escenas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([nombre]) => nombre.toLowerCase());
    const completo = eventos.some((e) => e.tipo === "tour_complete") ? " (completo)" : "";
    let frase = `Recorrido${completo}: ${escenas.size}${de} ${escenas.size === 1 ? "ambiente" : "ambientes"} en ${duracion(ms / 1000)}`;
    if (sesiones > 1) frase += `, volvió ${sesiones - 1} ${sesiones === 2 ? "vez" : "veces"}`;
    if (escenas.size > 1) frase += `; donde más se quedó: ${masTiempo.join(" y ")}`;
    frases.push(`${frase}.`);
  } else if (eventos.some((e) => e.tipo === "tour_start")) {
    frases.push("Abrió el recorrido, sin detalle por ambiente.");
  } else if (eventos.some((e) => e.tipo === "view_property")) {
    frases.push(sesiones > 1 ? `Vio la ficha en ${sesiones} visitas, sin hacer el recorrido.` : "Vio la ficha, sin hacer el recorrido.");
  }
  if (eventos.some((e) => e.tipo === "plan_view")) frases.push("Abrió el plano.");
  const origen = opciones.origen ?? eventos.map((e) => (e.meta as Record<string, unknown> | null)?.origen).find((o) => typeof o === "string");
  if (typeof origen === "string" && ORIGEN_TOUR[origen]) frases.push(`Llegó desde ${ORIGEN_TOUR[origen]}.`);
  return frases.join(" ");
}
