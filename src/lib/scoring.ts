/**
 * Puntaje de los leads (0-100): reglas transparentes y pesos en un solo objeto.
 * Lo usan el servidor (con cada evento relevante) y el seed. Ver tests/unit/scoring.test.ts.
 */
import type { Enums } from "@/types/database";

export const PESOS = {
  tourIniciado: 6,
  tourCompleto: 20,
  /** Por cada minuto recorriendo tour y planos (con la pestaña visible), hasta el máximo. */
  porMinuto: 2,
  maxMinutos: 14,
  vioPlanos: 8,
  porPuntoPlano: 1,
  maxPuntosPlano: 4,
  /** Por cada visita extra a una misma propiedad (sesiones distintas). */
  porVisitaExtra: 6,
  maxVisitasExtra: 18,
  porFoto: 0.5,
  maxFotos: 4,
  pidioVisita: 22,
  dejoDatos: 8,
  whatsapp: 6,
  compartio: 3,
  linkAbierto: 4,
  formaPago: { contado: 10, credito_hipotecario: 8, financiacion: 7, no_sabe: 0 },
  plazo: { inmediato: 12, "1_3_meses": 9, "3_6_meses": 4, mas_6_meses: 0 },
  noNecesitaVender: 4,
} as const;

/** Desde cuántos puntos es tibio o caliente. */
export const UMBRALES = { tibio: 30, caliente: 60 } as const;

export type EventoPuntaje = {
  tipo: Enums<"tipo_evento">;
  property_id: string | null;
  plan_id: string | null;
  duracion_ms: number | null;
  sesion_id: string | null;
};

export type Calificacion = {
  forma_pago: Enums<"forma_pago"> | null;
  plazo: Enums<"plazo_compra"> | null;
  necesita_vender: boolean | null;
} | null;

export type Resumen = {
  propiedades: number;
  visitas: number;
  fotos: number;
  toursIniciados: number;
  toursCompletos: number;
  segundos: number;
  planos: number;
  puntosPlano: number;
  whatsapp: boolean;
  formulario: boolean;
  compartio: boolean;
  pidioVisita: boolean;
};

export type DetallePuntaje = { clave: string; texto: string; puntos: number };

export type Puntaje = { score: number; nivel: Enums<"nivel_lead">; detalle: DetallePuntaje[] };

/** Resume el historial de un visitante. Las visitas son sesiones distintas en una misma propiedad (la de más visitas). */
export function resumirEventos(eventos: EventoPuntaje[]): Resumen {
  const vistas = new Set<string>();
  const sesionesPorPropiedad = new Map<string, Set<string>>();
  const toursIniciados = new Set<string>();
  const toursCompletos = new Set<string>();
  const planos = new Set<string>();
  const r: Resumen = {
    propiedades: 0,
    visitas: 0,
    fotos: 0,
    toursIniciados: 0,
    toursCompletos: 0,
    segundos: 0,
    planos: 0,
    puntosPlano: 0,
    whatsapp: false,
    formulario: false,
    compartio: false,
    pidioVisita: false,
  };
  let ms = 0;
  for (const e of eventos) {
    if (e.property_id && e.sesion_id) {
      const set = sesionesPorPropiedad.get(e.property_id) ?? new Set<string>();
      set.add(e.sesion_id);
      sesionesPorPropiedad.set(e.property_id, set);
    }
    switch (e.tipo) {
      case "view_property":
        if (e.property_id) vistas.add(e.property_id);
        break;
      case "photo_view":
        r.fotos++;
        break;
      case "tour_start":
        toursIniciados.add(`${e.property_id}:${e.sesion_id}`);
        break;
      case "tour_complete":
        if (e.property_id) toursCompletos.add(e.property_id);
        break;
      case "scene_view":
      case "plan_view":
        ms += e.duracion_ms ?? 0;
        if (e.tipo === "plan_view" && e.plan_id) planos.add(e.plan_id);
        break;
      case "plan_point_click":
        r.puntosPlano++;
        break;
      case "whatsapp_click":
        r.whatsapp = true;
        break;
      case "form_submit":
        r.formulario = true;
        break;
      case "visit_request":
        r.pidioVisita = true;
        break;
      case "share":
        r.compartio = true;
        break;
    }
  }
  r.propiedades = vistas.size;
  r.visitas = Math.max(0, ...[...sesionesPorPropiedad.values()].map((s) => s.size));
  r.toursIniciados = toursIniciados.size;
  r.toursCompletos = toursCompletos.size;
  r.segundos = Math.round(ms / 1000);
  r.planos = planos.size;
  return r;
}

const PAGO_TEXTO: Record<Enums<"forma_pago">, string> = {
  contado: "Pago contado",
  credito_hipotecario: "Crédito hipotecario",
  financiacion: "Con financiación",
  no_sabe: "Forma de pago sin definir",
};

const PLAZO_TEXTO: Record<Enums<"plazo_compra">, string> = {
  inmediato: "Plazo inmediato",
  "1_3_meses": "Plazo de 1 a 3 meses",
  "3_6_meses": "Plazo de 3 a 6 meses",
  mas_6_meses: "Plazo de más de 6 meses",
};

/** Puntaje, nivel y desglose ("por qué") a partir del resumen y de las respuestas del pedido de visita. */
export function calcularPuntaje(r: Resumen, calificacion: Calificacion = null, extra: { linkAbierto?: boolean } = {}): Puntaje {
  const P = PESOS;
  const detalle: DetallePuntaje[] = [];
  const sumar = (clave: string, texto: string, puntos: number) => {
    if (puntos !== 0) detalle.push({ clave, texto, puntos: Math.round(puntos * 10) / 10 });
  };

  if (r.toursCompletos > 0) sumar("tour", "Terminó el tour 360°", P.tourIniciado + P.tourCompleto);
  else if (r.toursIniciados > 0) sumar("tour", "Empezó el tour 360°", P.tourIniciado);
  const minutos = Math.floor(r.segundos / 60);
  if (minutos > 0) sumar("tiempo", `${minutos} min recorriendo`, Math.min(P.maxMinutos, minutos * P.porMinuto));
  if (r.planos > 0) sumar("planos", r.planos === 1 ? "Vio el plano" : `Vio ${r.planos} planos`, P.vioPlanos);
  if (r.puntosPlano > 0) sumar("puntos", `Tocó ${r.puntosPlano} ambientes del plano`, Math.min(P.maxPuntosPlano, r.puntosPlano * P.porPuntoPlano));
  if (r.visitas > 1) sumar("visitas", `${r.visitas} visitas`, Math.min(P.maxVisitasExtra, (r.visitas - 1) * P.porVisitaExtra));
  if (r.fotos > 0) sumar("fotos", r.fotos === 1 ? "Vio 1 foto" : `Vio ${r.fotos} fotos`, Math.min(P.maxFotos, r.fotos * P.porFoto));
  if (r.pidioVisita) sumar("visita", "Pidió visita presencial", P.pidioVisita);
  if (r.formulario) sumar("datos", "Dejó sus datos", P.dejoDatos);
  if (r.whatsapp) sumar("whatsapp", "Escribió por WhatsApp", P.whatsapp);
  if (r.compartio) sumar("compartio", "Compartió la propiedad", P.compartio);
  if (extra.linkAbierto) sumar("link", "Abrió el link de pre-visita", P.linkAbierto);
  if (calificacion?.forma_pago) sumar("pago", PAGO_TEXTO[calificacion.forma_pago], P.formaPago[calificacion.forma_pago]);
  if (calificacion?.plazo) sumar("plazo", PLAZO_TEXTO[calificacion.plazo], P.plazo[calificacion.plazo]);
  if (calificacion?.necesita_vender === false) sumar("vender", "No necesita vender para comprar", P.noNecesitaVender);

  const score = Math.max(0, Math.min(100, Math.round(detalle.reduce((total, d) => total + d.puntos, 0))));
  const nivel = score >= UMBRALES.caliente ? "caliente" : score >= UMBRALES.tibio ? "tibio" : "frio";
  return { score, nivel, detalle: detalle.sort((a, b) => b.puntos - a.puntos) };
}

/** "Terminó el tour 360°, 2 visitas, Crédito hipotecario, Plazo de 1 a 3 meses". */
export function resumenPuntaje(detalle: DetallePuntaje[], maximo = 4) {
  return detalle
    .filter((d) => d.puntos > 0)
    .slice(0, maximo)
    .map((d) => d.texto)
    .join(", ");
}
