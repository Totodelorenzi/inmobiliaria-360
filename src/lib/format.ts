import type { Enums } from "@/types/database";

export const OPERACION_LABEL: Record<Enums<"operacion">, string> = { alquiler: "Alquiler", venta: "Venta" };

export const TIPO_LABEL: Record<Enums<"tipo_propiedad">, string> = {
  departamento: "Departamento",
  casa: "Casa",
  ph: "PH",
  local: "Local",
  terreno: "Terreno",
  oficina: "Oficina",
  cochera: "Cochera",
};

export const ESTADO_OBRA_LABEL: Record<Enums<"estado_obra">, string> = {
  terminada: "Terminada",
  en_construccion: "En construcción",
  en_pozo: "En pozo",
};

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const mesAnio = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "USD 95.000", "$ 450.000/mes" o "Consultar precio". */
export function formatPrecio(precio: number | null, moneda: Enums<"moneda">, operacion: Enums<"operacion">) {
  if (precio == null) return "Consultar precio";
  const monto = `${moneda === "USD" ? "USD" : "$"} ${numero.format(precio)}`;
  return operacion === "alquiler" ? `${monto}/mes` : monto;
}

/** "$ 80.000" (las expensas siempre son en pesos). */
export function formatExpensas(expensas: number | null) {
  return expensas ? `$ ${numero.format(expensas)}` : null;
}

export function formatM2(superficie: number | null) {
  return superficie ? `${numero.format(superficie)} m²` : null;
}

/** "marzo de 2027" a partir de una fecha ISO (YYYY-MM-DD). */
export function formatMesAnio(fecha: string | null) {
  return fecha ? mesAnio.format(new Date(`${fecha.slice(0, 10)}T00:00:00Z`)) : null;
}

/** Texto del badge de obra: "En pozo" o "En construcción, entrega marzo de 2027". */
export function badgeObra(estado: Enums<"estado_obra">, fechaEntrega: string | null) {
  if (estado === "terminada") return null;
  const entrega = formatMesAnio(fechaEntrega);
  return estado === "en_pozo" || !entrega ? ESTADO_OBRA_LABEL[estado] : `En construcción, entrega ${entrega}`;
}

/** Dirección a mostrar: la exacta o solo barrio y ciudad. */
export function formatUbicacion(p: {
  direccion: string | null;
  mostrar_direccion_exacta: boolean;
  barrio: string | null;
  ciudad: string | null;
}) {
  const zona = [p.barrio, p.ciudad].filter(Boolean).join(", ");
  return p.mostrar_direccion_exacta && p.direccion ? [p.direccion, zona].filter(Boolean).join(", ") : zona;
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Link de WhatsApp con mensaje precargado. `numero`: solo dígitos con código de país. */
export function whatsappLink(numero: string, mensaje: string) {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

/** Texto normalizado para buscar: minúsculas y sin tildes (igual que la columna `busqueda`). */
export function normalizarBusqueda(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
