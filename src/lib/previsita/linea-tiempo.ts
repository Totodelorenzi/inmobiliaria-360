import type { Enums } from "@/types/database";

export type EventoHistorial = {
  tipo: Enums<"tipo_evento">;
  created_at: string;
  sesion_id: string | null;
  duracion_ms: number | null;
  propiedad: string | null;
  escena: string | null;
  plano: string | null;
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

function texto(e: EventoHistorial, repeticiones: number, ms: number) {
  const en = e.propiedad ? ` de “${e.propiedad}”` : "";
  const tiempo = ms > 0 ? ` (${duracion(ms / 1000)})` : "";
  const meta = (e.meta ?? {}) as Record<string, unknown>;
  switch (e.tipo) {
    case "view_property":
      return `Vio la ficha${en}`;
    case "photo_view":
      return repeticiones > 1 ? `Miró ${repeticiones} fotos` : meta.todas ? "Abrió todas las fotos" : "Miró una foto";
    case "tour_start":
      return `Empezó el tour 360°${en}`;
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
      return "Dejó una consulta";
    case "visit_request":
      return `Pidió visita presencial${en}`;
    case "share":
      return "Compartió la propiedad";
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
        const clave = `${e.tipo}:${e.escena ?? ""}:${e.plano ?? ""}`;
        const previo = items.at(-1);
        const agrupable = e.tipo === "photo_view" || e.tipo === "scene_view" || e.tipo === "plan_view";
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
