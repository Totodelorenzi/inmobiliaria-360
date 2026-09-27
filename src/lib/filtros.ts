import { Constants, type Enums } from "@/types/database";

export type Modo = "alquiler" | "venta" | "emprendimientos";
export type Orden = "recientes" | "precio_asc" | "precio_desc";

export type Filtros = {
  q?: string;
  tipo?: Enums<"tipo_propiedad">;
  desde?: number;
  hasta?: number;
  moneda: Enums<"moneda">;
  /** 1 a 3: exacto; 4: "4 o más". */
  ambientes?: number;
  barrio?: string;
  tour?: boolean;
  credito?: boolean;
  obra?: Enums<"estado_obra">;
  orden: Orden;
  pagina: number;
};

export const POR_PAGINA = 12;
export const ORDEN_LABEL: Record<Orden, string> = {
  recientes: "Más recientes",
  precio_asc: "Menor precio",
  precio_desc: "Mayor precio",
};

type SearchParams = Record<string, string | string[] | undefined>;

const uno = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

function entero(value: string | undefined, min: number, max: number) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

function deLista<T extends string>(value: string | undefined, lista: readonly T[]) {
  return lista.includes(value as T) ? (value as T) : undefined;
}

export const monedaPorDefecto = (modo: Modo): Enums<"moneda"> => (modo === "alquiler" ? "ARS" : "USD");

/** Lee los filtros de la URL ignorando valores inválidos (una URL rota nunca rompe la página). */
export function parseFiltros(sp: SearchParams, modo: Modo): Filtros {
  const obrasValidas = modo === "emprendimientos" ? (["en_pozo", "en_construccion"] as const) : Constants.public.Enums.estado_obra;
  return {
    q: uno(sp.q)?.slice(0, 80),
    tipo: deLista(uno(sp.tipo), Constants.public.Enums.tipo_propiedad),
    desde: entero(uno(sp.desde), 0, 1e12),
    hasta: entero(uno(sp.hasta), 0, 1e12),
    moneda: deLista(uno(sp.moneda), Constants.public.Enums.moneda) ?? monedaPorDefecto(modo),
    ambientes: entero(uno(sp.ambientes), 1, 4),
    barrio: uno(sp.barrio)?.slice(0, 80),
    tour: uno(sp.tour) === "1" || undefined,
    credito: uno(sp.credito) === "1" || undefined,
    obra: deLista(uno(sp.obra), obrasValidas),
    orden: deLista(uno(sp.orden), ["recientes", "precio_asc", "precio_desc"] as const) ?? "recientes",
    pagina: entero(uno(sp.pagina), 1, 1000) ?? 1,
  };
}

/** Filtros → query string sin valores por defecto (URLs cortas y compartibles). */
export function filtrosAQuery(f: Filtros, modo: Modo, cambios: Partial<Filtros> = {}) {
  const v = { ...f, ...cambios };
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== "" && value !== false) params.set(key, value === true ? "1" : String(value));
  };
  set("q", v.q);
  set("tipo", v.tipo);
  set("barrio", v.barrio);
  set("ambientes", v.ambientes);
  if (v.desde !== undefined || v.hasta !== undefined) {
    set("desde", v.desde);
    set("hasta", v.hasta);
    if (v.moneda !== monedaPorDefecto(modo)) set("moneda", v.moneda);
  }
  set("tour", v.tour);
  set("credito", v.credito);
  set("obra", v.obra);
  if (v.orden !== "recientes") set("orden", v.orden);
  if (v.pagina > 1) set("pagina", v.pagina);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Cantidad de filtros activos (sin contar orden ni página), para el botón "Filtros (n)". */
export function contarFiltros(f: Filtros) {
  return [f.q, f.tipo, f.desde ?? f.hasta, f.ambientes, f.barrio, f.tour, f.credito, f.obra].filter(
    (v) => v !== undefined,
  ).length;
}
