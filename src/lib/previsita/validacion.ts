import { Constants, type Enums } from "@/types/database";

export const FRANJAS = { manana: "Mañana", tarde: "Tarde", fin_de_semana: "Fin de semana", cualquiera: "Me da igual" } as const;
export type Franja = keyof typeof FRANJAS;

export const FORMA_PAGO_LABEL: Record<Enums<"forma_pago">, string> = {
  contado: "Contado",
  credito_hipotecario: "Crédito hipotecario",
  financiacion: "Financiación",
  no_sabe: "Todavía no sé",
};

export const PLAZO_LABEL: Record<Enums<"plazo_compra">, string> = {
  inmediato: "Lo antes posible",
  "1_3_meses": "En 1 a 3 meses",
  "3_6_meses": "En 3 a 6 meses",
  mas_6_meses: "En más de 6 meses",
};

export type EntradaPedido = {
  nombre: string;
  telefono: string;
  formaPago?: string;
  plazo?: string;
  necesitaVender?: string;
  franja?: string;
  comentario?: string;
  acepto: boolean;
};

export type PedidoValido = {
  nombre: string;
  telefono: string;
  forma_pago: Enums<"forma_pago"> | null;
  plazo: Enums<"plazo_compra">;
  necesita_vender: boolean | null;
  franja_preferida: Franja;
  comentario: string | null;
};

export type ErroresPedido = Partial<Record<keyof EntradaPedido | "general", string>>;

/**
 * Valida el pedido de visita. En venta se pregunta forma de pago y si necesita vender;
 * en alquiler esas dos no aplican (ver DECISIONES.md).
 */
export function validarPedido(e: EntradaPedido, operacion: Enums<"operacion">): { pedido: PedidoValido | null; errores: ErroresPedido } {
  const errores: ErroresPedido = {};
  const nombre = e.nombre.trim().slice(0, 120);
  const telefono = e.telefono.trim().slice(0, 40);
  const digitos = telefono.replace(/\D/g, "").length;
  if (nombre.length < 2) errores.nombre = "Escribí tu nombre.";
  if (digitos < 6 || digitos > 15) errores.telefono = "Dejanos un teléfono para coordinar la visita (entre 6 y 15 números).";

  const plazo = Constants.public.Enums.plazo_compra.find((p) => p === e.plazo);
  if (!plazo) errores.plazo = operacion === "alquiler" ? "Contanos cuándo te mudarías." : "Contanos en qué plazo pensás comprar.";
  const franja = (Object.keys(FRANJAS) as Franja[]).find((f) => f === e.franja);
  if (!franja) errores.franja = "Elegí en qué momento te queda mejor la visita.";

  let formaPago: Enums<"forma_pago"> | null = null;
  let necesitaVender: boolean | null = null;
  if (operacion === "venta") {
    formaPago = Constants.public.Enums.forma_pago.find((f) => f === e.formaPago) ?? null;
    if (!formaPago) errores.formaPago = "Elegí cómo pensás pagar (si no sabés, marcá “Todavía no sé”).";
    if (e.necesitaVender === "si") necesitaVender = true;
    else if (e.necesitaVender === "no") necesitaVender = false;
    else errores.necesitaVender = "Contanos si necesitás vender otra propiedad para comprar.";
  }
  if (!e.acepto) errores.acepto = "Para coordinar la visita necesitamos que aceptes el uso de tus datos.";
  const comentario = e.comentario?.trim().slice(0, 1000) || null;

  if (Object.keys(errores).length > 0 || !plazo || !franja) return { pedido: null, errores };
  return {
    pedido: { nombre, telefono, forma_pago: formaPago, plazo, necesita_vender: necesitaVender, franja_preferida: franja, comentario },
    errores,
  };
}
