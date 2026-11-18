/**
 * Actividad de ejemplo del Edificio Mirador (últimas 3 semanas): 10 leads con historial creíble
 * (qué pisos, unidades y ambientes miraron y cuánto tiempo) y visitantes anónimos. Todo es_demo.
 * Generación determinística (semilla fija); el puntaje sale de src/lib/scoring.ts como en la web.
 */
import { codigoRef } from "@/lib/previsita/codigos";
import { calcularPuntaje, resumirEventos, type DetallePuntaje } from "@/lib/scoring";
import type { Enums, TablesInsert } from "@/types/database";
import { azar } from "./actividad.ts";

export type EdificioCreado = {
  projectId: string;
  pisos: { id: string; numero: number }[];
  unidades: { id: string; codigo: string; floor_id: string; unit_type_id: string }[];
  /** Ambientes con render de cada tipología, en orden. */
  ambientes: Map<string, string[]>;
};

type Visita = {
  diasAtras: number;
  /** Unidades que abrió, en orden. */
  unidades: string[];
  /** Cuántos ambientes recorrió de cada unidad (0: no abrió los ambientes). */
  ambientes?: number;
  /** Segundos promedio en cada ambiente. */
  segundos?: number;
  whatsapp?: boolean;
};

type Persona = {
  nombre?: string;
  telefono?: string;
  email?: string;
  visitas: Visita[];
  /** Pidió información de esta unidad (queda como la última consultada). */
  consulta?: { unidad: string; mensaje: string };
  estado?: Enums<"estado_lead">;
  notas?: string;
  utm?: string;
};

// Teléfonos con prefijo 0000: no existen en Argentina, así nadie recibe mensajes de una demo.
const PERSONAS: Persona[] = [
  // ---- Calientes: varias visitas, recorren los ambientes y piden información
  {
    nombre: "Carolina Méndez",
    telefono: "2284 00-0101",
    email: "carolina.mendez@example.com",
    visitas: [
      { diasAtras: 11, unidades: ["2C", "3C"], ambientes: 5, segundos: 40 },
      { diasAtras: 5, unidades: ["3C", "3D"], ambientes: 5, segundos: 35 },
      { diasAtras: 1, unidades: ["3C"], ambientes: 3, segundos: 30 },
    ],
    consulta: { unidad: "3C", mensaje: "Hola, me interesa la 3C. ¿Qué plan de pagos tienen en pesos y cuál es el anticipo?" },
    estado: "contactado",
    notas: "Pareja con un hijo. Viene el sábado a ver el obrador.",
    utm: "instagram",
  },
  {
    nombre: "Ricardo Paz",
    telefono: "2284 00-0102",
    visitas: [
      { diasAtras: 8, unidades: ["1E", "2E"], ambientes: 5, segundos: 45 },
      { diasAtras: 2, unidades: ["2E", "3E"], ambientes: 5, segundos: 50, whatsapp: true },
    ],
    consulta: { unidad: "2E", mensaje: "¿Aceptan una camioneta como parte de pago? Busco la de 3 dormitorios en esquina." },
    utm: "google",
  },
  {
    nombre: "Julieta Ríos",
    telefono: "2284 00-0103",
    email: "julieta.rios@example.com",
    visitas: [
      { diasAtras: 14, unidades: ["1A", "1B"], ambientes: 4, segundos: 30 },
      { diasAtras: 9, unidades: ["2A", "2B"], ambientes: 4, segundos: 25 },
      { diasAtras: 3, unidades: ["2A"], ambientes: 2, segundos: 20 },
    ],
    consulta: { unidad: "2A", mensaje: "Compro para invertir. ¿Cuánto estiman que se alquila un 1 dormitorio en la zona?" },
    estado: "visita_agendada",
    notas: "Inversora, ya tiene otro departamento en pozo. Visita el martes 10 h.",
  },
  // ---- Tibios: una o dos visitas, miran algunas unidades y consultan
  {
    nombre: "Pablo Herrera",
    telefono: "2284 00-0104",
    visitas: [
      { diasAtras: 6, unidades: ["1C", "2C"], ambientes: 3, segundos: 30 },
      { diasAtras: 4, unidades: ["1C"] },
    ],
    consulta: { unidad: "1C", mensaje: "¿Tienen cochera para el 1C? ¿Se paga aparte?" },
  },
  {
    nombre: "Mariana Suárez",
    telefono: "2284 00-0105",
    email: "mariana.suarez@example.com",
    visitas: [{ diasAtras: 4, unidades: ["PB A", "PB B"], ambientes: 2, segundos: 35 }],
    consulta: { unidad: "PB A", mensaje: "¿La planta baja tiene patio propio? Tengo un perro." },
    utm: "instagram",
  },
  {
    nombre: "Gonzalo Ibáñez",
    telefono: "2284 00-0106",
    visitas: [{ diasAtras: 2, unidades: ["4B", "4D"], ambientes: 5, segundos: 40 }],
    consulta: { unidad: "4D", mensaje: "¿Cuál es el precio del 4D? En la web dice consultar." },
    estado: "contactado",
    notas: "Le pasé el precio por WhatsApp. Lo está pensando.",
  },
  // ---- Fríos: miran poco
  {
    nombre: "Lucía Benítez",
    email: "lucia.benitez@example.com",
    visitas: [{ diasAtras: 10, unidades: ["1A"] }],
    consulta: { unidad: "1A", mensaje: "¿Tienen financiación propia?" },
  },
  { visitas: [{ diasAtras: 1, unidades: ["1B"], whatsapp: true }], utm: "whatsapp" },
  { nombre: "Tomás Acosta", visitas: [{ diasAtras: 7, unidades: ["PB D", "2D"], whatsapp: true }] },
  {
    nombre: "Elena Vidal",
    telefono: "2284 00-0110",
    visitas: [{ diasAtras: 18, unidades: ["4C"] }],
    consulta: { unidad: "4C", mensaje: "¿Para cuándo es la entrega?" },
    estado: "descartado",
    notas: "Necesita mudarse este año; la entrega es en 2028.",
  },
];

type Filas = {
  visitantes: TablesInsert<"visitors">[];
  eventos: TablesInsert<"visitor_events">[];
  leads: TablesInsert<"leads">[];
};

export function generarActividadEdificio(agencyId: string, e: EdificioCreado, ahora: number): Filas {
  const codigosUsados = new Set<string>();
  const rnd = azar(2026_1117);
  const entre = (min: number, max: number) => Math.round(min + rnd() * (max - min));
  const uuid = () => "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(rnd() * 16).toString(16));
  const codigoUnico = () => {
    let c = codigoRef();
    while (codigosUsados.has(c)) c = codigoRef();
    codigosUsados.add(c);
    return c;
  };
  const iso = (ms: number) => new Date(ms).toISOString();
  const unidad = (codigo: string) => {
    const u = e.unidades.find((x) => x.codigo === codigo);
    if (!u) throw new Error(`La actividad de ejemplo usa la unidad ${codigo}, que no existe.`);
    return u;
  };
  const filas: Filas = { visitantes: [], eventos: [], leads: [] };

  /** Una sesión en la web del edificio. Devuelve el momento en que terminó. */
  function sesion(visitorId: string, v: Visita): number {
    const sesionId = uuid();
    let t = ahora - v.diasAtras * 86_400_000 - (24 - entre(9, 22)) * 3_600_000 + entre(0, 50) * 60_000;
    const evento = (tipo: Enums<"tipo_evento">, extra: Partial<TablesInsert<"visitor_events">> = {}) => {
      filas.eventos.push({ visitor_id: visitorId, agency_id: agencyId, project_id: e.projectId, tipo, sesion_id: sesionId, created_at: iso(t), meta: {}, ...extra });
      t += entre(6, 30) * 1000;
    };
    let pisoActual = "";
    for (const codigo of v.unidades) {
      const u = unidad(codigo);
      if (u.floor_id !== pisoActual) evento("floor_view", { floor_id: u.floor_id });
      pisoActual = u.floor_id;
      evento("unit_view", { floor_id: u.floor_id, unit_id: u.id });
      const ambientes = (e.ambientes.get(u.unit_type_id) ?? []).slice(0, v.ambientes ?? 0);
      if (!ambientes.length) continue;
      evento("rooms_open", { unit_id: u.id });
      for (const roomId of ambientes) {
        const s = entre(Math.round((v.segundos ?? 30) * 0.6), Math.round((v.segundos ?? 30) * 1.4));
        t += s * 1000;
        evento("room_view", { unit_id: u.id, room_id: roomId, duracion_ms: s * 1000 });
      }
    }
    if (v.whatsapp) evento("whatsapp_click");
    return t;
  }

  function visitante(extra: Partial<TablesInsert<"visitors">> = {}) {
    const fila: TablesInsert<"visitors"> = { id: uuid(), agency_id: agencyId, codigo_ref: codigoUnico(), es_demo: true, ...extra };
    filas.visitantes.push(fila);
    return fila;
  }

  for (const persona of PERSONAS) {
    const primera = Math.max(...persona.visitas.map((v) => v.diasAtras));
    const v = visitante({ utm_source: persona.utm ?? null, created_at: iso(ahora - primera * 86_400_000) });
    let ultimo = 0;
    for (const visita of [...persona.visitas].sort((a, b) => b.diasAtras - a.diasAtras)) ultimo = sesion(v.id!, visita);
    v.first_seen = iso(ahora - primera * 86_400_000);
    v.last_seen = iso(ultimo);

    const consultada = persona.consulta && unidad(persona.consulta.unidad);
    if (consultada) {
      filas.eventos.push({ visitor_id: v.id!, agency_id: agencyId, project_id: e.projectId, unit_id: consultada.id, tipo: "form_submit", created_at: iso(ultimo), meta: {} });
    }
    const historial = filas.eventos
      .filter((x) => x.visitor_id === v.id)
      .map((x) => ({
        tipo: x.tipo,
        property_id: null,
        plan_id: null,
        duracion_ms: x.duracion_ms ?? null,
        sesion_id: x.sesion_id ?? null,
        project_id: x.project_id ?? null,
        unit_id: x.unit_id ?? null,
        room_id: x.room_id ?? null,
      }));
    const { score, nivel, detalle } = calcularPuntaje(resumirEventos(historial));
    filas.leads.push({
      agency_id: agencyId,
      visitor_id: v.id,
      codigo_ref: v.codigo_ref,
      property_id: null,
      unit_id: consultada ? consultada.id : unidad(persona.visitas.at(-1)!.unidades.at(-1)!).id,
      origen: consultada ? "formulario" : "whatsapp_click",
      nombre: persona.nombre ?? null,
      telefono: persona.telefono ?? null,
      email: persona.email ?? null,
      mensaje: persona.consulta?.mensaje ?? null,
      estado: persona.estado ?? "nuevo",
      notas: persona.notas ?? null,
      consentimiento_at: consultada ? iso(ultimo) : null,
      ultima_actividad: iso(ultimo),
      created_at: iso(ultimo),
      score,
      nivel,
      score_detalle: detalle as DetallePuntaje[],
      es_demo: true,
    });
  }

  // Visitantes anónimos: miran la fachada, uno o dos pisos y alguna unidad.
  const fuentes = [null, null, "instagram", "google", "whatsapp"];
  for (let i = 0; i < 30; i++) {
    const dias = entre(0, 20);
    const v = visitante({ utm_source: fuentes[entre(0, fuentes.length - 1)], created_at: iso(ahora - dias * 86_400_000) });
    const vistas = Array.from({ length: entre(1, 3) }, () => e.unidades[entre(0, e.unidades.length - 1)].codigo);
    const fin = sesion(v.id!, { diasAtras: dias, unidades: vistas, ambientes: rnd() < 0.3 ? entre(1, 4) : 0, segundos: 20 });
    v.first_seen = iso(ahora - dias * 86_400_000);
    v.last_seen = iso(fin);
  }
  return filas;
}

type Db = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

/** Borra los leads y visitantes del tenant demo y carga la actividad de ejemplo. Devuelve un resumen. */
export async function cargarActividadEdificio(db: Db, agencyId: string, edificio: EdificioCreado) {
  const fallar = (que: string, error: { message: string } | null) => {
    if (error) throw new Error(`No se pudieron ${que}: ${error.message}`);
  };
  // Los eventos y pedidos se borran en cascada con visitantes y leads.
  fallar("borrar los leads anteriores", (await db.from("leads").delete().eq("agency_id", agencyId)).error);
  fallar("borrar los visitantes anteriores", (await db.from("visitors").delete().eq("agency_id", agencyId)).error);

  // Los códigos de referencia son únicos por inmobiliaria y la del demo quedó vacía.
  const f = generarActividadEdificio(agencyId, edificio, Date.now());
  fallar("cargar los visitantes", (await db.from("visitors").insert(f.visitantes)).error);
  for (let i = 0; i < f.eventos.length; i += 500) fallar("cargar los eventos", (await db.from("visitor_events").insert(f.eventos.slice(i, i + 500))).error);
  fallar("cargar los leads", (await db.from("leads").insert(f.leads)).error);

  const niveles = { caliente: 0, tibio: 0, frio: 0 };
  for (const l of f.leads) niveles[l.nivel ?? "frio"]++;
  return { visitantes: f.visitantes.length, eventos: f.eventos.length, leads: f.leads.length, niveles };
}
