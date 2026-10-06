/**
 * Actividad de ejemplo de las últimas 3 semanas: visitantes anónimos, ~15 leads con historiales
 * creíbles (calientes, tibios y fríos), pedidos de visita y 2 links de pre-visita. Todo es_demo.
 * La generación es pura y determinística (semilla fija); el puntaje sale de src/lib/scoring.ts.
 */
import { codigoLink, codigoRef } from "@/lib/previsita/codigos";
import { calcularPuntaje, resumirEventos, type Calificacion, type DetallePuntaje } from "@/lib/scoring";
import { tourCompleto } from "@/lib/tracking/config";
import type { Enums, TablesInsert } from "@/types/database";

export type PropiedadCreada = {
  id: string;
  titulo: string;
  operacion: Enums<"operacion">;
  fotos: number;
  escenas: { id: string; nombre: string }[];
  planos: { id: string; nombre: string; puntos: string[] }[];
};

type Visita = {
  diasAtras: number;
  hora?: number;
  fotos?: number;
  tour?: "completo" | "parcial";
  planos?: boolean;
  puntos?: number;
  whatsapp?: boolean;
  compartir?: boolean;
};

type Cierre =
  | { tipo: "visita"; forma_pago: Enums<"forma_pago"> | null; plazo: Enums<"plazo_compra">; necesita_vender: boolean | null; franja: "manana" | "tarde" | "fin_de_semana" | "cualquiera" }
  | { tipo: "formulario"; mensaje: string };

type Persona = {
  nombre?: string;
  telefono?: string;
  email?: string;
  propiedad: Rol;
  visitas: Visita[];
  cierre?: Cierre;
  link?: { abierto: boolean; diasAtras: number };
  estado?: Enums<"estado_lead">;
  notas?: string;
  utm?: { source: string; medium?: string; campaign?: string };
};

type Rol = "tourVenta" | "tourAlquiler" | "pozo" | "construccion" | "alquilerSimple" | "casaAlquiler";

/** Generador con semilla (mulberry32): mismos datos en cada corrida. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Teléfonos con prefijo 0000: no existen en Argentina, así nadie recibe mensajes de una demo.
const PERSONAS: Persona[] = [
  // ---- Calientes
  {
    nombre: "Laura Gómez",
    telefono: "11 0000-1201",
    email: "laura.gomez@example.com",
    propiedad: "tourVenta",
    visitas: [{ diasAtras: 12, tour: "completo", fotos: 6 }, { diasAtras: 5, tour: "completo" }, { diasAtras: 2, fotos: 3 }],
    cierre: { tipo: "visita", forma_pago: "credito_hipotecario", plazo: "1_3_meses", necesita_vender: false, franja: "tarde" },
    estado: "visita_agendada",
    notas: "Visita coordinada para el jueves a las 18. Viene con la pareja.",
    utm: { source: "instagram", medium: "social" },
  },
  {
    nombre: "Martín Fernández",
    telefono: "11 0000-1202",
    propiedad: "pozo",
    visitas: [{ diasAtras: 9, planos: true, puntos: 4, fotos: 1 }, { diasAtras: 3, planos: true, puntos: 3 }],
    cierre: { tipo: "visita", forma_pago: "financiacion", plazo: "3_6_meses", necesita_vender: false, franja: "manana" },
    estado: "contactado",
    notas: "Le interesa la unidad 4B con balcón aterrazado. Pidió el plan de cuotas.",
  },
  {
    nombre: "Sofía Rodríguez",
    telefono: "11 0000-1203",
    email: "sofia.r@example.com",
    propiedad: "tourAlquiler",
    visitas: [{ diasAtras: 6, tour: "completo", fotos: 4 }, { diasAtras: 1, tour: "completo" }],
    cierre: { tipo: "visita", forma_pago: null, plazo: "inmediato", necesita_vender: null, franja: "manana" },
    utm: { source: "zonaprop", medium: "portal" },
  },
  {
    nombre: "Diego López",
    telefono: "11 0000-1204",
    propiedad: "tourVenta",
    link: { abierto: true, diasAtras: 5 },
    visitas: [{ diasAtras: 4, tour: "completo", fotos: 8, compartir: true }],
    cierre: { tipo: "visita", forma_pago: "contado", plazo: "inmediato", necesita_vender: false, franja: "fin_de_semana" },
  },
  // ---- Tibios
  {
    nombre: "Valentina Martínez",
    telefono: "11 0000-1205",
    email: "vale.martinez@example.com",
    propiedad: "tourVenta",
    visitas: [{ diasAtras: 15, tour: "completo" }, { diasAtras: 8, fotos: 8 }],
    cierre: { tipo: "formulario", mensaje: "Hola, ¿aceptan permuta por un departamento de 2 ambientes en Florida?" },
    estado: "contactado",
  },
  {
    nombre: "Juan Pérez",
    telefono: "11 0000-1206",
    propiedad: "pozo",
    visitas: [{ diasAtras: 11, planos: true, puntos: 2 }, { diasAtras: 4, fotos: 1, whatsapp: true }],
    cierre: { tipo: "formulario", mensaje: "¿Cuál es el valor del anticipo y en cuántas cuotas se puede pagar?" },
  },
  {
    propiedad: "tourAlquiler",
    visitas: [{ diasAtras: 3, tour: "completo", whatsapp: true }],
    utm: { source: "whatsapp" },
  },
  {
    nombre: "Lucas Sánchez",
    telefono: "11 0000-1208",
    propiedad: "construccion",
    visitas: [{ diasAtras: 18, fotos: 3 }, { diasAtras: 10, fotos: 4 }, { diasAtras: 2, fotos: 3, whatsapp: true }],
    cierre: { tipo: "formulario", mensaje: "¿Para cuándo está prevista la entrega? ¿Tienen cochera disponible?" },
  },
  {
    nombre: "Florencia Romero",
    telefono: "11 0000-1209",
    propiedad: "tourVenta",
    visitas: [{ diasAtras: 7, tour: "parcial", fotos: 2 }, { diasAtras: 6, tour: "parcial" }],
    cierre: { tipo: "visita", forma_pago: "no_sabe", plazo: "mas_6_meses", necesita_vender: true, franja: "cualquiera" },
    notas: "Tiene que vender su PH primero.",
  },
  // ---- Fríos
  { propiedad: "alquilerSimple", visitas: [{ diasAtras: 1, fotos: 1, whatsapp: true }] },
  {
    nombre: "Agustina Torres",
    email: "agus.torres@example.com",
    propiedad: "alquilerSimple",
    visitas: [{ diasAtras: 13, fotos: 2 }],
    cierre: { tipo: "formulario", mensaje: "¿Se puede con garantía de seguro de caución?" },
  },
  { nombre: "Nicolás Álvarez", telefono: "11 0000-1212", propiedad: "pozo", link: { abierto: false, diasAtras: 1 }, visitas: [] },
  { propiedad: "casaAlquiler", visitas: [{ diasAtras: 16, fotos: 5, whatsapp: true }] },
  {
    nombre: "Federico Castro",
    telefono: "11 0000-1214",
    propiedad: "casaAlquiler",
    visitas: [{ diasAtras: 20, fotos: 2 }, { diasAtras: 19 }],
    cierre: { tipo: "formulario", mensaje: "¿El precio es negociable?" },
    estado: "descartado",
    notas: "Buscaba algo por debajo de $ 1.500.000.",
  },
  { propiedad: "tourAlquiler", visitas: [{ diasAtras: 9, tour: "parcial", whatsapp: true }] },
];

type Filas = {
  visitantes: TablesInsert<"visitors">[];
  eventos: TablesInsert<"visitor_events">[];
  leads: (TablesInsert<"leads"> & { id: string })[];
  pedidos: TablesInsert<"visit_requests">[];
  links: (TablesInsert<"tracked_links"> & { id: string })[];
};

export function generarActividad(agencyId: string, propiedades: PropiedadCreada[], ahora: number, codigosUsados = new Set<string>()): Filas {
  const rnd = azar(360_2026);
  const entre = (min: number, max: number) => Math.round(min + rnd() * (max - min));
  const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(rnd() * 16).toString(16));
  const codigoUnico = () => {
    let c = codigoRef();
    while (codigosUsados.has(c)) c = codigoRef();
    codigosUsados.add(c);
    return c;
  };

  const roles: Record<Rol, PropiedadCreada | undefined> = {
    tourVenta: propiedades.find((p) => p.operacion === "venta" && p.escenas.length > 0),
    tourAlquiler: propiedades.find((p) => p.operacion === "alquiler" && p.escenas.length > 0),
    pozo: propiedades.find((p) => p.planos.length > 0),
    construccion: propiedades.find((p) => p.planos.length === 0 && /construcci/i.test(p.titulo)),
    alquilerSimple: propiedades.find((p) => p.operacion === "alquiler" && p.escenas.length === 0),
    casaAlquiler: propiedades.filter((p) => p.operacion === "alquiler" && p.escenas.length === 0).at(-1),
  };
  const filas: Filas = { visitantes: [], eventos: [], leads: [], pedidos: [], links: [] };
  const iso = (ms: number) => new Date(ms).toISOString();

  /** Una sesión de navegación sobre una propiedad. Devuelve el momento en que terminó. */
  function sesion(visitanteId: string, p: PropiedadCreada, v: Visita): number {
    const sesionId = uuid();
    let t = ahora - v.diasAtras * 86_400_000 - (24 - (v.hora ?? entre(10, 22))) * 3_600_000 + entre(0, 50) * 60_000;
    const evento = (tipo: Enums<"tipo_evento">, extra: Partial<TablesInsert<"visitor_events">> = {}) => {
      filas.eventos.push({ visitor_id: visitanteId, agency_id: agencyId, property_id: p.id, tipo, sesion_id: sesionId, created_at: iso(t), meta: {}, ...extra });
      t += entre(4, 25) * 1000;
    };
    evento("view_property");
    for (let i = 0; i < Math.min(v.fotos ?? 0, p.fotos); i++) evento("photo_view", { meta: { indice: i + 1 } });
    if (v.tour && p.escenas.length) {
      evento("tour_start");
      const recorridas = v.tour === "completo" ? p.escenas : p.escenas.slice(0, Math.max(1, Math.floor(p.escenas.length / 2)));
      let segundos = 0;
      for (const escena of recorridas) {
        const s = entre(v.tour === "completo" ? 25 : 15, v.tour === "completo" ? 75 : 40);
        segundos += s;
        t += s * 1000;
        evento("scene_view", { scene_id: escena.id, duracion_ms: s * 1000 });
      }
      if (tourCompleto(recorridas.length, p.escenas.length, segundos)) evento("tour_complete", { meta: { escenas: recorridas.length, segundos } });
    }
    if (v.planos) {
      for (const plano of p.planos) {
        const s = entre(30, 110);
        t += s * 1000;
        evento("plan_view", { plan_id: plano.id, duracion_ms: s * 1000 });
        for (const punto of plano.puntos.slice(0, Math.min(v.puntos ?? 0, plano.puntos.length))) {
          evento("plan_point_click", { plan_id: plano.id, meta: { punto } });
        }
      }
    }
    if (v.compartir) evento("share");
    if (v.whatsapp) evento("whatsapp_click");
    return t;
  }

  function visitante(extra: Partial<TablesInsert<"visitors">> = {}) {
    const id = uuid();
    const fila: TablesInsert<"visitors"> = { id, agency_id: agencyId, codigo_ref: codigoUnico(), es_demo: true, ...extra };
    filas.visitantes.push(fila);
    return fila;
  }

  // Leads con historia
  for (const persona of PERSONAS) {
    const p = roles[persona.propiedad];
    if (!p) continue;
    const primera = persona.visitas.length ? Math.max(...persona.visitas.map((v) => v.diasAtras)) : persona.link?.diasAtras ?? 1;
    const v = visitante({
      utm_source: persona.utm?.source ?? (persona.link ? "link_previsita" : null),
      utm_medium: persona.utm?.medium ?? null,
      created_at: iso(ahora - primera * 86_400_000),
    });
    let ultimo = ahora - primera * 86_400_000;
    for (const visita of [...persona.visitas].sort((a, b) => b.diasAtras - a.diasAtras)) ultimo = sesion(v.id!, p, visita);
    v.first_seen = persona.visitas.length ? iso(ahora - primera * 86_400_000) : null;
    v.last_seen = persona.visitas.length ? iso(ultimo) : null;

    const leadId = uuid();
    if (persona.link) {
      const linkId = uuid();
      filas.links.push({
        id: linkId,
        agency_id: agencyId,
        property_id: p.id,
        codigo: codigoLink(),
        nombre_prospecto: persona.nombre ?? "Prospecto",
        telefono_prospecto: persona.telefono ?? null,
        visitor_id: v.id,
        es_demo: true,
        created_at: iso(ahora - persona.link.diasAtras * 86_400_000 - 3_600_000),
      });
      v.tracked_link_id = linkId;
    }
    if (persona.cierre?.tipo === "visita") {
      filas.eventos.push({ visitor_id: v.id!, agency_id: agencyId, property_id: p.id, tipo: "visit_request", created_at: iso(ultimo), meta: {} });
      filas.pedidos.push({
        lead_id: leadId,
        property_id: p.id,
        forma_pago: persona.cierre.forma_pago,
        plazo: persona.cierre.plazo,
        necesita_vender: persona.cierre.necesita_vender,
        franja_preferida: persona.cierre.franja,
        created_at: iso(ultimo),
      });
    } else if (persona.cierre?.tipo === "formulario") {
      filas.eventos.push({ visitor_id: v.id!, agency_id: agencyId, property_id: p.id, tipo: "form_submit", created_at: iso(ultimo), meta: {} });
    }

    const origen: Enums<"origen_lead"> =
      persona.cierre?.tipo === "visita" ? "pedido_visita" : persona.cierre?.tipo === "formulario" ? "formulario" : persona.link ? "link_personalizado" : "whatsapp_click";
    const calificacion: Calificacion =
      persona.cierre?.tipo === "visita" ? { forma_pago: persona.cierre.forma_pago, plazo: persona.cierre.plazo, necesita_vender: persona.cierre.necesita_vender } : null;
    const historial = filas.eventos.filter((e) => e.visitor_id === v.id).map((e) => ({
      tipo: e.tipo,
      property_id: e.property_id ?? null,
      plan_id: e.plan_id ?? null,
      duracion_ms: e.duracion_ms ?? null,
      sesion_id: e.sesion_id ?? null,
    }));
    const { score, nivel, detalle } = calcularPuntaje(resumirEventos(historial), calificacion, { linkAbierto: Boolean(persona.link?.abierto) });
    const contacto = Boolean(persona.cierre);
    filas.leads.push({
      id: leadId,
      agency_id: agencyId,
      visitor_id: v.id,
      codigo_ref: v.codigo_ref,
      property_id: p.id,
      origen,
      nombre: persona.nombre ?? null,
      telefono: persona.telefono ?? null,
      email: persona.email ?? null,
      mensaje: persona.cierre?.tipo === "formulario" ? persona.cierre.mensaje : null,
      estado: persona.estado ?? "nuevo",
      notas: persona.notas ?? null,
      consentimiento_at: contacto ? iso(ultimo) : null,
      ultima_actividad: iso(ultimo),
      created_at: iso(persona.link ? ahora - persona.link.diasAtras * 86_400_000 : ultimo),
      score,
      nivel,
      score_detalle: detalle as DetallePuntaje[],
      es_demo: true,
    });
  }

  // Visitantes anónimos: la mayoría mira la ficha y fotos; algunos recorren el tour o los planos.
  const fuentes = [null, null, "instagram", "zonaprop", "whatsapp", "google"];
  for (let i = 0; i < 45; i++) {
    const p = propiedades[entre(0, propiedades.length - 1)];
    const dias = entre(0, 20);
    const v = visitante({ utm_source: fuentes[entre(0, fuentes.length - 1)], created_at: iso(ahora - dias * 86_400_000) });
    const sesiones = rnd() < 0.25 ? 2 : 1;
    let ultimo = 0;
    for (let s = 0; s < sesiones; s++) {
      const r = rnd();
      ultimo = sesion(v.id!, p, {
        diasAtras: Math.max(0, dias - s * entre(1, 4)),
        fotos: entre(0, 6),
        tour: p.escenas.length ? (r < 0.12 ? "completo" : r < 0.4 ? "parcial" : undefined) : undefined,
        planos: p.planos.length > 0 && rnd() < 0.5,
        puntos: entre(0, 2),
      });
    }
    v.first_seen = iso(ahora - dias * 86_400_000);
    v.last_seen = iso(ultimo);
  }
  return filas;
}

type Db = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

/** Inserta la actividad de ejemplo (después de crear las propiedades). Devuelve un resumen. */
export async function cargarActividad(db: Db, agencyId: string, propiedades: PropiedadCreada[]) {
  const { data: existentes } = await db.from("visitors").select("codigo_ref").eq("agency_id", agencyId);
  const f = generarActividad(agencyId, propiedades, Date.now(), new Set((existentes ?? []).map((v) => v.codigo_ref)));
  const fallar = (que: string, error: { message: string } | null) => {
    if (error) throw new Error(`No se pudieron cargar ${que}: ${error.message}`);
  };

  // Visitantes primero sin link (los links apuntan a ellos y viceversa).
  fallar("los visitantes", (await db.from("visitors").insert(f.visitantes.map((v) => ({ ...v, tracked_link_id: null })))).error);
  fallar("los links", (await db.from("tracked_links").insert(f.links)).error);
  for (const v of f.visitantes.filter((x) => x.tracked_link_id)) {
    await db.from("visitors").update({ tracked_link_id: v.tracked_link_id }).eq("id", v.id!);
  }
  for (let i = 0; i < f.eventos.length; i += 500) {
    fallar("los eventos", (await db.from("visitor_events").insert(f.eventos.slice(i, i + 500))).error);
  }
  fallar("los leads", (await db.from("leads").insert(f.leads)).error);
  fallar("los pedidos de visita", (await db.from("visit_requests").insert(f.pedidos)).error);

  const niveles = { caliente: 0, tibio: 0, frio: 0 };
  for (const l of f.leads) niveles[l.nivel ?? "frio"]++;
  return { visitantes: f.visitantes.length, eventos: f.eventos.length, leads: f.leads.length, pedidos: f.pedidos.length, links: f.links.length, niveles };
}
