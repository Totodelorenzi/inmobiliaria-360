/** 32 caracteres sin ambiguos (sin 0/O ni 1/I): 256 es múltiplo de 32, así que no hay sesgo. */
const ALFABETO_REF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Para links: minúsculas sin i, l, o (32 caracteres). */
const ALFABETO_LINK = "abcdefghjkmnpqrstuvwxyz023456789";

function aleatorio(alfabeto: string, largo: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return [...bytes].map((b) => alfabeto[b % alfabeto.length]).join("");
}

/** Código de referencia del visitante y del lead (ej. "A7K2"). Con 4 caracteres hay ~1 millón por inmobiliaria. */
export const codigoRef = (largo = 4) => aleatorio(ALFABETO_REF, largo);

/** Código de link personalizado (/v/xxxxxxxx). */
export const codigoLink = () => aleatorio(ALFABETO_LINK, 8);

/** Normaliza lo que escribe alguien en el buscador del panel ("ref. a7k2" → "A7K2"). */
export function normalizarCodigo(texto: string) {
  const limpio = texto.toUpperCase().replace(/^REF\.?\s*/, "").replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{4,6}$/.test(limpio) ? limpio : null;
}
