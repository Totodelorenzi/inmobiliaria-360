import type { CSSProperties } from "react";

export const DEFAULT_BRAND = "#1f3a5f";
const DARK_TEXT = "#14161a";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normaliza a #rrggbb; devuelve null si no es un color hex válido. */
export function normalizeHex(value: string | null | undefined): string | null {
  const match = value?.trim().match(HEX);
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return `#${hex.toLowerCase()}`;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa WCAG 2.x. */
function luminance([r, g, b]: [number, number, number]) {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Oscurece el color hasta lograr contraste ≥ 4.5 sobre blanco (para textos y links). */
function inkOnWhite(hex: string) {
  let [r, g, b] = toRgb(hex);
  let color = hex;
  while (contrastRatio(color, "#ffffff") < 4.5) {
    [r, g, b] = [r, g, b].map((v) => Math.floor(v * 0.9)) as [number, number, number];
    color = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }
  return color;
}

/**
 * Variables CSS del color principal de la inmobiliaria. Garantizan contraste AA:
 * --brand-fg es blanco o casi negro según el fondo, --brand-ink sirve para texto sobre blanco.
 */
export function brandStyle(color: string | null | undefined): CSSProperties {
  let brand = normalizeHex(color) ?? DEFAULT_BRAND;
  // En tonos medios ni el blanco ni el negro llegan a 4.5: se oscurece el fondo lo mínimo necesario.
  if (Math.max(contrastRatio(brand, "#ffffff"), contrastRatio(brand, DARK_TEXT)) < 4.5) brand = inkOnWhite(brand);
  const fg = contrastRatio(brand, "#ffffff") >= contrastRatio(brand, DARK_TEXT) ? "#ffffff" : DARK_TEXT;
  return { "--brand": brand, "--brand-fg": fg, "--brand-ink": inkOnWhite(brand) } as CSSProperties;
}
