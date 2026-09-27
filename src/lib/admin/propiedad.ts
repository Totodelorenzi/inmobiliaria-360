import { Constants, type Enums, type TablesUpdate } from "@/types/database";

/** "Depto 3 amb. en Núñez con balcón!" → "depto-3-amb-en-nunez-con-balcon". */
export function slugify(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "propiedad"
  );
}

/** Agrega -2, -3… hasta que el slug no esté en uso. */
export function slugDisponible(base: string, usados: Iterable<string>) {
  const set = new Set(usados);
  if (!set.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (!set.has(candidato)) return candidato;
  }
}

/** Campos editables en el paso "Datos" (lo que llega del formulario, como texto). */
export const CAMPOS_DATOS = [
  "titulo",
  "operacion",
  "tipo",
  "estado_obra",
  "fecha_entrega",
  "avance_obra_pct",
  "precio",
  "moneda",
  "expensas",
  "acepta_financiacion",
  "detalle_financiacion",
  "apto_credito",
  "direccion",
  "mostrar_direccion_exacta",
  "barrio",
  "ciudad",
  "lat",
  "lng",
  "ambientes",
  "dormitorios",
  "banos",
  "superficie_total",
  "superficie_cubierta",
  "cochera",
  "amenities",
  "descripcion",
] as const;

export type CampoDatos = (typeof CAMPOS_DATOS)[number];
export type ErroresDatos = Partial<Record<CampoDatos, string>>;
type Entrada = Partial<Record<CampoDatos, string>>;

const texto = (v: string | undefined, max: number) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

/** Número opcional: acepta "95.000", "95000", "1.234,5". Devuelve undefined si es inválido. */
export function numero(v: string | undefined): number | null | undefined {
  const t = (v ?? "").trim();
  if (!t) return null;
  const normal = t.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(normal);
  return Number.isFinite(n) ? n : undefined;
}

function enteroEn(v: string | undefined, min: number, max: number, campo: CampoDatos, errores: ErroresDatos, mensaje: string) {
  const n = numero(v);
  if (n === null) return null;
  if (n === undefined || !Number.isInteger(n) || n < min || n > max) {
    errores[campo] = mensaje;
    return undefined;
  }
  return n;
}

function decimalEn(v: string | undefined, min: number, max: number, campo: CampoDatos, errores: ErroresDatos, mensaje: string) {
  const n = numero(v);
  if (n === null) return null;
  if (n === undefined || n < min || n > max) {
    errores[campo] = mensaje;
    return undefined;
  }
  return n;
}

const enLista = <T extends string>(v: string | undefined, lista: readonly T[]) => (lista.includes(v as T) ? (v as T) : undefined);
const si = (v: string | undefined) => v === "true" || v === "on" || v === "1";

/**
 * Valida y convierte los datos del formulario. Solo procesa los campos presentes en `entrada`
 * (el autoguardado manda de a poco). Devuelve los cambios para la base y los errores por campo.
 */
export function validarDatos(entrada: Entrada) {
  const errores: ErroresDatos = {};
  const cambios: TablesUpdate<"properties"> = {};
  const hay = (campo: CampoDatos) => campo in entrada;
  const E = Constants.public.Enums;

  if (hay("titulo")) {
    const t = texto(entrada.titulo, 160);
    if (!t || t.length < 3) errores.titulo = "Escribí un título de al menos 3 letras (ej. “Depto 3 ambientes con balcón”).";
    else cambios.titulo = t;
  }
  if (hay("operacion")) {
    const v = enLista(entrada.operacion, E.operacion);
    if (!v) errores.operacion = "Elegí Alquiler o Venta.";
    else cambios.operacion = v;
  }
  if (hay("tipo")) {
    const v = enLista(entrada.tipo, E.tipo_propiedad);
    if (!v) errores.tipo = "Elegí el tipo de propiedad.";
    else cambios.tipo = v;
  }
  if (hay("estado_obra")) {
    const v = enLista(entrada.estado_obra, E.estado_obra);
    if (!v) errores.estado_obra = "Elegí el estado de obra.";
    else cambios.estado_obra = v;
  }
  if (hay("moneda")) {
    const v = enLista(entrada.moneda, E.moneda);
    if (!v) errores.moneda = "Elegí la moneda.";
    else cambios.moneda = v;
  }
  if (hay("fecha_entrega")) {
    const t = texto(entrada.fecha_entrega, 10);
    // <input type="month"> manda "2027-03"; se guarda el primer día del mes.
    const fecha = t && /^\d{4}-\d{2}$/.test(t) ? `${t}-01` : t;
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.fecha_entrega = "Elegí mes y año de entrega.";
    else cambios.fecha_entrega = fecha;
  }

  const enteros: [CampoDatos, number, number, string][] = [
    ["avance_obra_pct", 0, 100, "El avance va de 0 a 100 %."],
    ["ambientes", 0, 50, "Revisá la cantidad de ambientes."],
    ["dormitorios", 0, 50, "Revisá la cantidad de dormitorios."],
    ["banos", 0, 50, "Revisá la cantidad de baños."],
    ["cochera", 0, 20, "Revisá la cantidad de cocheras."],
  ];
  for (const [campo, min, max, mensaje] of enteros) {
    if (!hay(campo)) continue;
    const n = enteroEn(entrada[campo], min, max, campo, errores, mensaje);
    if (n !== undefined) Object.assign(cambios, { [campo]: campo === "cochera" ? (n ?? 0) : n });
  }

  const decimales: [CampoDatos, number, number, string][] = [
    ["precio", 0, 1e12, "Escribí el precio solo con números (ej. 95000). Dejalo vacío para “Consultar”."],
    ["expensas", 0, 1e10, "Escribí las expensas solo con números."],
    ["superficie_total", 0, 1e6, "Revisá la superficie total (en m²)."],
    ["superficie_cubierta", 0, 1e6, "Revisá la superficie cubierta (en m²)."],
    ["lat", -90, 90, "Latitud inválida."],
    ["lng", -180, 180, "Longitud inválida."],
  ];
  for (const [campo, min, max, mensaje] of decimales) {
    if (!hay(campo)) continue;
    const n = decimalEn(entrada[campo], min, max, campo, errores, mensaje);
    if (n !== undefined) Object.assign(cambios, { [campo]: n });
  }

  const textos: [CampoDatos, number][] = [
    ["detalle_financiacion", 1000],
    ["direccion", 200],
    ["barrio", 80],
    ["ciudad", 80],
    ["descripcion", 10000],
  ];
  for (const [campo, max] of textos) {
    if (hay(campo)) Object.assign(cambios, { [campo]: texto(entrada[campo], max) });
  }

  for (const campo of ["acepta_financiacion", "apto_credito", "mostrar_direccion_exacta"] as const) {
    if (hay(campo)) cambios[campo] = si(entrada[campo]);
  }

  if (hay("amenities")) {
    cambios.amenities = [
      ...new Set(
        (entrada.amenities ?? "")
          .split(/[,\n]/)
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a) => a.slice(0, 40)),
      ),
    ].slice(0, 30);
  }

  if (cambios.superficie_total != null && cambios.superficie_cubierta != null && cambios.superficie_cubierta > cambios.superficie_total) {
    errores.superficie_cubierta = "La superficie cubierta no puede ser mayor que la total.";
    delete cambios.superficie_cubierta;
  }

  return { cambios, errores };
}

export type RequisitoPublicacion = { ok: boolean; texto: string; obligatorio: boolean };

/** Checklist del paso "Revisar y publicar". */
export function requisitosPublicacion(p: {
  titulo: string;
  precio: number | null;
  barrio: string | null;
  ciudad: string | null;
  descripcion: string | null;
  lat: number | null;
  estado_obra: Enums<"estado_obra">;
  fecha_entrega: string | null;
  fotos: number;
  escenas: number;
  planos: number;
}): RequisitoPublicacion[] {
  return [
    { ok: p.titulo.trim().length >= 3 && p.titulo !== TITULO_BORRADOR, texto: "Título", obligatorio: true },
    { ok: Boolean(p.barrio || p.ciudad), texto: "Barrio o ciudad", obligatorio: true },
    { ok: p.fotos > 0, texto: "Al menos una foto", obligatorio: true },
    { ok: p.precio != null, texto: "Precio (si lo dejás vacío se muestra “Consultar precio”)", obligatorio: false },
    { ok: p.escenas > 0, texto: "Tour 360°", obligatorio: false },
    { ok: p.estado_obra === "terminada" || p.planos > 0, texto: "Planos (recomendado en pozo y en construcción)", obligatorio: false },
    { ok: p.estado_obra === "terminada" || Boolean(p.fecha_entrega), texto: "Fecha de entrega", obligatorio: false },
    { ok: Boolean(p.descripcion && p.descripcion.length >= 80), texto: "Descripción (al menos 2 o 3 líneas)", obligatorio: false },
    { ok: p.lat != null, texto: "Ubicación en el mapa", obligatorio: false },
  ];
}

export const TITULO_BORRADOR = "Propiedad sin título";

/** Relación de aspecto 2:1 de una panorámica equirectangular (tolerancia 2 %). */
export function esPanoramica(ancho: number, alto: number) {
  return alto > 0 && Math.abs(ancho / alto - 2) <= 0.04;
}
