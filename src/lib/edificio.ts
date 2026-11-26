/**
 * Módulo desarrolladora: tipos y funciones puras del edificio (zonas tocables, estados, precios,
 * rutas de cada paso, rótulos y encuadre de la fachada). Sin Next ni Supabase: lo usan el servidor,
 * los componentes cliente, el panel, el seed y los tests.
 */
import type { Enums, Tables } from "@/types/database";

/** Vértice de una zona tocable, en porcentajes de la imagen. */
export type Punto = [number, number];

export type EstadoUnidad = Enums<"estado_unidad">;
export type Categoria = "departamento" | "local" | "cochera";
export type Operacion = "venta" | "alquiler";

export const ESTADOS_UNIDAD: EstadoUnidad[] = ["disponible", "reservada", "vendida", "alquilada"];
/** Estados posibles según cómo se comercializa la unidad (el local se alquila). */
export const estadosPara = (operacion: string): EstadoUnidad[] => (operacion === "alquiler" ? ["disponible", "alquilada"] : ["disponible", "reservada", "vendida"]);

export const ESTADO_UNIDAD_LABEL: Record<EstadoUnidad, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  alquilada: "Alquilado",
};

/** Color de cada estado (variables del tema, las mismas de los badges). */
export const ESTADO_UNIDAD_COLOR: Record<EstadoUnidad, string> = {
  disponible: "var(--estado-disponible)",
  reservada: "var(--estado-reservada)",
  vendida: "var(--estado-vendida)",
  alquilada: "var(--estado-vendida)",
};

export const CATEGORIA_LABEL: Record<Categoria, string> = { departamento: "Departamento", local: "Comercial, alquiler", cochera: "Cochera" };
export const esCategoria = (v: string): v is Categoria => v === "departamento" || v === "local" || v === "cochera";

/** Lo que guarda la base (jsonb) → lista de vértices, o null si no hay una zona válida. */
export function aPoligono(valor: unknown): Punto[] | null {
  if (!Array.isArray(valor) || valor.length < 3) return null;
  const puntos = valor.filter((p): p is Punto => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number");
  return puntos.length === valor.length ? puntos : null;
}

/** Lo que guarda la base (jsonb) → punto [x, y], o null. */
export function aPunto(valor: unknown): Punto | null {
  return Array.isArray(valor) && valor.length === 2 && valor.every((n) => typeof n === "number" && n >= 0 && n <= 100) ? (valor as Punto) : null;
}

/** Atributo `points` de un <polygon> dibujado en un viewBox de 100×100. */
export const puntosSvg = (poligono: Punto[]) => poligono.map(([x, y]) => `${x},${y}`).join(" ");

/** `clip-path` CSS que recorta la misma zona sobre la imagen (los dos van en porcentajes). */
export const recorteCss = (poligono: Punto[]) => `polygon(${poligono.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;

/** Centro de la zona (promedio de los vértices): ahí va el cartel con el número o el código. */
export function centro(poligono: Punto[]): Punto {
  const suma = poligono.reduce<Punto>(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
  return [suma[0] / poligono.length, suma[1] / poligono.length];
}

/** Centro de masa de la zona: cae dentro aunque la unidad sea en L (ahí va su código). */
export function centroide(poligono: Punto[]): Punto {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poligono.length; i++) {
    const [x1, y1] = poligono[i];
    const [x2, y2] = poligono[(i + 1) % poligono.length];
    const cruz = x1 * y2 - x2 * y1;
    area += cruz;
    cx += (x1 + x2) * cruz;
    cy += (y1 + y2) * cruz;
  }
  return Math.abs(area) < 1e-9 ? centro(poligono) : [cx / (3 * area), cy / (3 * area)];
}

/** Rectángulo en porcentajes de la imagen. */
export type Caja = { x: number; y: number; ancho: number; alto: number };

export function cajaDe(puntos: Punto[]): Caja {
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
}

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "USD 95.000" o "Consultar" (sin precio, o unidad que ya no está disponible). */
export function precioUnidad(u: Pick<Tables<"units">, "precio" | "moneda" | "estado">) {
  if (u.precio == null || u.estado === "vendida" || u.estado === "alquilada") return "Consultar";
  return `${u.moneda === "USD" ? "USD" : "$"} ${numero.format(u.precio)}`;
}

/** "78 m²" (totales si están cargados; si no, cubiertos). */
export function metrosUnidad(u: Pick<Tables<"units">, "superficie_cubierta" | "superficie_total">) {
  const m = u.superficie_total ?? u.superficie_cubierta;
  return m ? `${numero.format(m)} m²` : null;
}

/** "la unidad 3C", "la cochera C4", "el local 1" (para mensajes). */
export function conArticulo(u: { codigo: string; categoria?: string }) {
  if (u.categoria === "local") return `el ${u.codigo.toLowerCase()}`;
  if (u.categoria === "cochera") return `la cochera ${u.codigo}`;
  return `la unidad ${u.codigo}`;
}

/** Unidad de un lead como la devuelven las consultas del panel. */
export type UnidadLead = { codigo: string; categoria?: string; proyecto: { nombre: string } | null };

/** Por qué consultó un lead: la última unidad, la propiedad o "Consulta general". */
export function asuntoLead(lead: { propiedad?: { titulo: string } | null; unidad?: UnidadLead | null }) {
  if (lead.unidad) return `${nombreUnidad(lead.unidad)}${lead.unidad.proyecto ? ` · ${lead.unidad.proyecto.nombre}` : ""}`;
  return lead.propiedad?.titulo ?? "Consulta general";
}

/** "Unidad 3C", "Cochera C4" o "Local 1". */
export function nombreUnidad(u: { codigo: string; categoria?: string }) {
  if (u.categoria === "local") return u.codigo;
  if (u.categoria === "cochera") return `Cochera ${u.codigo}`;
  return `Unidad ${u.codigo}`;
}

// ---------------------------------------------------------------------------
// Pisos
// ---------------------------------------------------------------------------

/** "Planta baja", "Subsuelo", "Piso 3". */
export const nombrePiso = (n: number) => (n === 0 ? "Planta baja" : n === -1 ? "Subsuelo" : n < 0 ? `Subsuelo ${-n}` : `Piso ${n}`);
/** Número corto para la fachada y el selector: PB, S, 1°… */
export const etiquetaPiso = (n: number) => (n === 0 ? "PB" : n === -1 ? "S" : n < 0 ? `S${-n}` : `${n}°`);

type UnidadRotulo = { categoria: string; estado: EstadoUnidad };

/**
 * Lo que dice el cartel de cada piso en la fachada: "3 unidades · 2 disponibles",
 * "8 cocheras · 5 disponibles", "Lobby · Local en alquiler" o "Amenities".
 */
export function detallePiso(unidades: UnidadRotulo[], espacios: { nombre: string }[]) {
  const disponibles = (lista: UnidadRotulo[]) => {
    const d = lista.filter((u) => u.estado === "disponible").length;
    return d === 0 ? "sin disponibles" : d === 1 ? "1 disponible" : `${d} disponibles`;
  };
  const deptos = unidades.filter((u) => u.categoria === "departamento");
  if (deptos.length) return `${deptos.length === 1 ? "1 unidad" : `${deptos.length} unidades`} · ${disponibles(deptos)}`;
  const cocheras = unidades.filter((u) => u.categoria === "cochera");
  if (cocheras.length) return `${cocheras.length === 1 ? "1 cochera" : `${cocheras.length} cocheras`} · ${disponibles(cocheras)}`;
  const partes = [
    ...espacios.map((e) => e.nombre),
  ];
  const locales = unidades.filter((u) => u.categoria === "local");
  if (locales.length) {
    const libres = locales.filter((u) => u.estado === "disponible").length;
    partes.push(locales.length === 1 ? (libres ? "Local en alquiler" : "Local alquilado") : `${locales.length} locales${libres ? ` · ${libres === 1 ? "1 en alquiler" : `${libres} en alquiler`}` : " alquilados"}`);
  }
  if (!partes.length) return null;
  // Un piso solo de espacios comunes es el de amenities: el detalle los nombra en su planta.
  return unidades.length === 0 && espacios.length > 1 ? "Amenities" : partes.join(" · ");
}

// ---------------------------------------------------------------------------
// Datos del proyecto (vista 2): salen de las unidades cargadas, no se escriben a mano
// ---------------------------------------------------------------------------

type UnidadResumen = UnidadRotulo & { superficie_total: number | null; superficie_cubierta: number | null; dormitorios: number | null };

/** "20 departamentos", "monoambientes a 3 dormitorios", "37 a 112 m²", "8 cocheras", "1 local comercial". */
export function resumenUnidades(unidades: UnidadResumen[]) {
  const deptos = unidades.filter((u) => u.categoria === "departamento");
  const metros = deptos.map((u) => u.superficie_total ?? u.superficie_cubierta).filter((m): m is number => m != null && m > 0);
  const dorms = deptos.map((u) => u.dormitorios).filter((d): d is number => d != null);
  const ambientes = (d: number) => (d === 0 ? "monoambientes" : d === 1 ? "1 dormitorio" : `${d} dormitorios`);
  const min = Math.min(...dorms);
  const max = Math.max(...dorms);
  const cocheras = unidades.filter((u) => u.categoria === "cochera");
  const locales = unidades.filter((u) => u.categoria === "local");
  return {
    departamentos: deptos.length,
    disponibles: deptos.filter((u) => u.estado === "disponible").length,
    tipologias: dorms.length ? (min === max ? ambientes(min) : `${ambientes(min)} a ${ambientes(max)}`) : null,
    superficies: metros.length ? (Math.min(...metros) === Math.max(...metros) ? `${numero.format(metros[0])} m²` : `${numero.format(Math.min(...metros))} a ${numero.format(Math.max(...metros))} m²`) : null,
    metros: metros.length ? { min: Math.min(...metros), max: Math.max(...metros) } : null,
    cocheras: cocheras.length ? { total: cocheras.length, disponibles: cocheras.filter((u) => u.estado === "disponible").length } : null,
    locales: locales.length ? { total: locales.length, disponibles: locales.filter((u) => u.estado === "disponible").length } : null,
  };
}

// ---------------------------------------------------------------------------
// Rutas: cada paso tiene su URL (se comparte por WhatsApp y funciona el botón atrás)
// ---------------------------------------------------------------------------

/** Paso del recorrido que muestra la pantalla. */
export type Vista =
  | { tipo: "fachada" }
  | { tipo: "piso"; numero: number }
  | { tipo: "espacio"; numero: number; espacio: string }
  | { tipo: "unidad"; codigo: string }
  | { tipo: "imagenes"; codigo: string };

/** Código de unidad para la URL: "PB A" → "pb-a", "3C" → "3c". También normaliza lo que llega en la URL. */
export const slugUnidad = (codigo: string) => codigo.trim().toLowerCase().replace(/%20/g, " ").replace(/[\s-]+/g, "-");
/** Posición de la unidad en la planta (la letra): "3B" y "4B" son la misma unidad en pisos distintos. */
export const letraUnidad = (codigo: string) => codigo.match(/[A-Za-z]+$/)?.[0].toUpperCase() ?? codigo.toUpperCase();

/** Piso en la URL: "pb", "subsuelo", "3". */
export const segmentoPiso = (n: number) => (n === 0 ? "pb" : n === -1 ? "subsuelo" : n < 0 ? `subsuelo-${-n}` : String(n));

export function numeroDeSegmento(segmento: string): number | null {
  const s = segmento.toLowerCase();
  if (s === "pb" || s === "planta-baja") return 0;
  if (s === "subsuelo" || s === "s") return -1;
  const sub = s.match(/^subsuelo-(\d)$/);
  if (sub) return -Number(sub[1]);
  // Números (también los viejos "/piso/0" y "/piso/-1").
  return /^-?\d{1,3}$/.test(s) ? Number(s) : null;
}

export const rutaProyecto = (slug: string) => `/proyecto/${slug}`;

/** Segmentos de la URL (después de /proyecto/{slug}) → paso. null: no existe. */
export function leerVista(segmentos: string[]): Vista | null {
  const [a, b, c, ...resto] = segmentos.map((s) => decodeURIComponent(s));
  if (resto.length) return null;
  if (a === undefined) return { tipo: "fachada" };
  if (a === "piso" && b !== undefined) {
    const numero = numeroDeSegmento(b);
    if (numero === null) return null;
    if (c === undefined) return { tipo: "piso", numero };
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(c) ? { tipo: "espacio", numero, espacio: c } : null;
  }
  if (a === "unidad" && b !== undefined) {
    const codigo = slugUnidad(b);
    if (!/^[a-z0-9]+(-[a-z0-9]+)?$/.test(codigo)) return null;
    if (c === undefined) return { tipo: "unidad", codigo };
    // "ambientes": la dirección vieja de la galería sigue funcionando.
    return c === "imagenes" || c === "ambientes" ? { tipo: "imagenes", codigo } : null;
  }
  return null;
}

export function rutaVista(slug: string, v: Vista) {
  const base = rutaProyecto(slug);
  switch (v.tipo) {
    case "fachada":
      return base;
    case "piso":
      return `${base}/piso/${segmentoPiso(v.numero)}`;
    case "espacio":
      return `${base}/piso/${segmentoPiso(v.numero)}/${v.espacio}`;
    case "unidad":
      return `${base}/unidad/${slugUnidad(v.codigo)}`;
    case "imagenes":
      return `${base}/unidad/${slugUnidad(v.codigo)}/imagenes`;
  }
}

export const rutaPiso = (slug: string, n: number) => rutaVista(slug, { tipo: "piso", numero: n });
export const rutaUnidad = (slug: string, codigo: string) => rutaVista(slug, { tipo: "unidad", codigo });

/** Profundidad de cada paso: define si la animación va hacia adentro o vuelve. */
export const profundidad = (v: Vista) => ({ fachada: 0, piso: 1, unidad: 2, espacio: 2, imagenes: 3 })[v.tipo];

export const mismaVista = (a: Vista, b: Vista) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------
// Encuadre de la fachada
// ---------------------------------------------------------------------------

/**
 * Dónde y de qué tamaño va la imagen de la fachada en la pantalla (en px).
 * - "entera" (compu, pantallas apaisadas): la imagen completa, centrada.
 * - "foco" (celular): el edificio (`foco`, en % de la imagen) ocupa el ancho disponible sin perder
 *   ningún piso; queda arriba y el texto va debajo. Si sobra alto, el edificio se agranda hasta
 *   llenar el área.
 */
export function encuadre(
  pantalla: { ancho: number; alto: number },
  imagen: { ancho: number; alto: number },
  foco: Caja,
  area: { arriba: number; abajo: number; lados: number },
): { ancho: number; alto: number; x: number; y: number; modo: "entera" | "foco" } {
  const { ancho: W, alto: H } = pantalla;
  const prop = imagen.ancho / imagen.alto;
  if (W / H >= 1.15) {
    const escala = Math.min(W / imagen.ancho, H / imagen.alto);
    const ancho = imagen.ancho * escala;
    const alto = imagen.alto * escala;
    return { ancho, alto, x: (W - ancho) / 2, y: (H - alto) / 2, modo: "entera" };
  }
  // El edificio entra en el área libre (debajo de la barra y arriba del texto).
  const libreAncho = W - area.lados * 2;
  const libreAlto = H - area.arriba - area.abajo;
  const fw = (foco.ancho / 100) * imagen.ancho;
  const fh = (foco.alto / 100) * imagen.alto;
  const escala = Math.min(libreAncho / fw, libreAlto / fh);
  const ancho = imagen.ancho * escala;
  const alto = ancho / prop;
  // Centro del edificio en el centro del área libre.
  const cx = ((foco.x + foco.ancho / 2) / 100) * ancho;
  const cy = ((foco.y + foco.alto / 2) / 100) * alto;
  return { ancho, alto, x: W / 2 - cx, y: area.arriba + libreAlto / 2 - cy, modo: "foco" };
}

// ---------------------------------------------------------------------------
// Secuencia de cuadros (modo "secuencia")
// ---------------------------------------------------------------------------

export type Secuencia = { patron: string; cuadros: number; digitos: number; inicio: number; ancho: number; alto: number };

export function aSecuencia(valor: unknown): Secuencia | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  if (typeof v.patron !== "string" || !v.patron.includes("{n}") || !n(v.cuadros) || !n(v.ancho) || !n(v.alto)) return null;
  return { patron: v.patron, cuadros: Math.round(n(v.cuadros)!), digitos: n(v.digitos) ?? 4, inicio: n(v.inicio) ?? 1, ancho: n(v.ancho)!, alto: n(v.alto)! };
}

/** URL del cuadro i (0 … cuadros − 1). */
export const urlCuadro = (s: Secuencia, i: number) => s.patron.replace("{n}", String(s.inicio + i).padStart(s.digitos, "0"));

/** Cuadro que corresponde a un avance de 0 a 1 de la transición. */
export const cuadroDe = (s: Pick<Secuencia, "cuadros">, avance: number) => Math.min(s.cuadros - 1, Math.max(0, Math.round(avance * (s.cuadros - 1))));

// ---------------------------------------------------------------------------
// Búsquedas sobre los datos del proyecto (servidor y navegador)
// ---------------------------------------------------------------------------

/** La unidad pedida en la URL (el código no distingue mayúsculas) con su piso y su tipología. */
export function buscarUnidad<U extends { codigo: string; floor_id: string; unit_type_id: string }, P extends { id: string }, T extends { id: string }>(
  proyecto: { unidades: U[]; pisos: P[]; tipologias: T[] },
  codigo: string,
) {
  const buscado = slugUnidad(codigo);
  const unidad = proyecto.unidades.find((u) => slugUnidad(u.codigo) === buscado);
  const piso = unidad && proyecto.pisos.find((p) => p.id === unidad.floor_id);
  const tipologia = unidad && proyecto.tipologias.find((t) => t.id === unidad.unit_type_id);
  return unidad && piso && tipologia ? { unidad, piso, tipologia } : null;
}

/** El espacio común pedido en la URL, en su piso. */
export function buscarEspacio<E extends { floor_id: string; slug: string }, P extends { id: string; numero: number }>(
  proyecto: { espacios: E[]; pisos: P[] },
  numero: number,
  slug: string,
) {
  const piso = proyecto.pisos.find((p) => p.numero === numero);
  const espacio = piso && proyecto.espacios.find((e) => e.floor_id === piso.id && e.slug === slug);
  return piso && espacio ? { piso, espacio } : null;
}

/** ¿La vista pedida existe en este proyecto? (si no, la página responde 404). */
export function vistaExiste(
  proyecto: { unidades: { codigo: string; floor_id: string; unit_type_id: string }[]; pisos: { id: string; numero: number }[]; tipologias: { id: string }[]; espacios: { floor_id: string; slug: string }[] },
  v: Vista,
) {
  if (v.tipo === "fachada") return true;
  if (v.tipo === "piso") return proyecto.pisos.some((p) => p.numero === v.numero);
  if (v.tipo === "espacio") return Boolean(buscarEspacio(proyecto, v.numero, v.espacio));
  return Boolean(buscarUnidad(proyecto, v.codigo));
}
