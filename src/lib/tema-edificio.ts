/**
 * Paleta de la landing del proyecto: pantalla oscura con el fondo liso de plantas y maquetas
 * (`projects.color_fondo`) y un único color de firma que sale de la marca, aclarado hasta llegar a
 * contraste AA sobre ese fondo. Puro: lo usan el layout del edificio, la experiencia y los tests.
 */
import { contrastRatio, normalizeHex } from "@/lib/color";

export const FONDO_EDIFICIO = "#0f1115";
const TINTA = "#f2efe9";
const TINTA_SUAVE = "#aaa69e";

const aRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const aHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
/** Mezcla `a` con `b` (t = 0 → a, t = 1 → b). */
export const mezclar = (a: string, b: string, t: number) => aHex(aRgb(a).map((v, i) => v + (aRgb(b)[i] - v) * t));

/** Color de firma sobre el fondo oscuro: la marca, aclarada lo mínimo para llegar a 4.5:1. */
export function firmaSobre(fondo: string, marca: string | null | undefined) {
  const base = normalizeHex(marca) ?? "#8fb8b0";
  for (let t = 0; t <= 1; t += 0.04) {
    const c = mezclar(base, "#ffffff", t);
    if (contrastRatio(c, fondo) >= 4.5) return c;
  }
  return "#ffffff";
}

/** Variables CSS del sistema base para la landing oscura (los componentes existentes se adaptan solos). */
export function variablesEdificio(colorFondo: string | null | undefined, marca: string | null | undefined): Record<string, string> {
  const fondo = normalizeHex(colorFondo) ?? FONDO_EDIFICIO;
  // Un fondo claro no sirve para esta pantalla: se usa el oscuro por defecto.
  const bg = contrastRatio(fondo, TINTA) >= 7 ? fondo : FONDO_EDIFICIO;
  const firma = firmaSobre(bg, marca);
  return {
    "--bg": bg,
    "--surface": mezclar(bg, "#ffffff", 0.06),
    "--fg": TINTA,
    "--muted": TINTA_SUAVE,
    "--border": mezclar(bg, "#ffffff", 0.16),
    "--focus": firma,
    "--brand": firma,
    "--brand-fg": bg,
    "--brand-ink": firma,
    "--accent": firma,
    "--accent-hover": mezclar(firma, "#ffffff", 0.15),
    "--accent-fg": bg,
    "--estado-disponible": "#5fbf8c",
    "--estado-reservada": "#e0aa52",
    "--estado-vendida": "#7d818a",
    "--success": "#86d6a7",
    "--success-bg": mezclar(bg, "#2f8f5b", 0.25),
    "--warning": "#f0c27a",
    "--warning-bg": mezclar(bg, "#b7791f", 0.22),
    "--danger": "#ff9b8f",
    "--danger-bg": mezclar(bg, "#b42318", 0.25),
    "--shadow-float": "0 -8px 32px rgb(0 0 0 / 0.45)",
  };
}
