/**
 * Tema de cada inmobiliaria (columna agencies.tema, con la forma de docs/clientes/{slug}/tema.json).
 * Se traduce a las variables CSS del sistema base; lo que falta o no cumple contraste AA se ignora
 * y queda el valor base. Funciones puras: las usan el layout del sitio, el script del tema y los tests.
 */
import type { CSSProperties } from "react";
import { brandStyle, contrastRatio, normalizeHex } from "@/lib/color";

/** Familias disponibles (deben coincidir con el catálogo de src/lib/fuentes.ts). */
export const FAMILIAS = [
  "Inter",
  "Bricolage Grotesque",
  "Fraunces",
  "Newsreader",
  "Instrument Serif",
  "Libre Caslon Text",
  "Figtree",
  "Source Sans 3",
  "Public Sans",
  "Outfit",
  "Plus Jakarta Sans",
  "Nunito Sans",
  "Rubik",
  "Schibsted Grotesk",
  "Archivo",
  "Sora",
  "Manrope",
  "Familjen Grotesk",
  "Instrument Sans",
  "IBM Plex Sans",
  "Atkinson Hyperlegible",
] as const;
export type Familia = (typeof FAMILIAS)[number];

const BLANCO = "#ffffff";
const NEGRO = "#14161a";

export type Tema = {
  color: {
    marca?: string;
    marcaContraste?: string;
    tinta?: string;
    tintaSuave?: string;
    fondo?: string;
    superficie?: string;
    borde?: string;
    foco?: string;
    /** Botones del recorrido y los planos (por defecto, el amarillo del sistema base). */
    acento?: string;
    acentoContraste?: string;
    estado: { disponible?: string; reservada?: string; vendida?: string };
  };
  tipografia: { display?: Familia; texto?: Familia };
  radios: { control?: number; medio?: number };
};

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const hex = (v: unknown) => (typeof v === "string" ? (normalizeHex(v) ?? undefined) : undefined);
const familia = (v: unknown): Familia | undefined => {
  const nombre = esObjeto(v) ? v.familia : v;
  return FAMILIAS.find((f) => f === nombre);
};
const radio = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 32 ? v : undefined);

/** Lee el JSON guardado y descarta lo inválido (nunca falla). */
export function leerTema(crudo: unknown): Tema {
  const t = esObjeto(crudo) ? crudo : {};
  const c = esObjeto(t.color) ? t.color : {};
  const e = esObjeto(c.estado) ? c.estado : {};
  const tipo = esObjeto(t.tipografia) ? t.tipografia : {};
  const r = esObjeto(t.radios) ? t.radios : {};
  return {
    color: {
      marca: hex(c.marca),
      marcaContraste: hex(c.marcaContraste),
      tinta: hex(c.tinta),
      tintaSuave: hex(c.tintaSuave),
      fondo: hex(c.fondo),
      superficie: hex(c.superficie),
      borde: hex(c.borde),
      foco: hex(c.foco),
      acento: hex(c.acento),
      acentoContraste: hex(c.acentoContraste),
      estado: { disponible: hex(e.disponible), reservada: hex(e.reservada), vendida: hex(e.vendida) },
    },
    tipografia: { display: familia(tipo.display), texto: familia(tipo.texto) },
    radios: { control: radio(r.control), medio: radio(r.medio) },
  };
}

const pasa = (a: string, b: string, minimo: number) => contrastRatio(a, b) >= minimo;
const mejorTexto = (fondo: string) => (contrastRatio(fondo, BLANCO) >= contrastRatio(fondo, NEGRO) ? BLANCO : NEGRO);

/**
 * Variables CSS del tema. `colorPrimario` es el color que elige el admin en el panel; el del tema,
 * si existe, manda. Cada par de texto se aplica solo si llega a 4.5:1 (3:1 en foco y bordes).
 */
export function variablesTema(colorPrimario: string | null | undefined, tema: Tema): Record<string, string> {
  const { color, radios } = tema;
  const vars: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(brandStyle(color.marca ?? colorPrimario) as Record<string, string>)) vars[clave] = valor;
  if (color.marcaContraste && pasa(color.marcaContraste, vars["--brand"], 4.5)) vars["--brand-fg"] = color.marcaContraste;

  const fondo = color.fondo && pasa(color.fondo, NEGRO, 4.5) ? color.fondo : BLANCO;
  if (fondo !== BLANCO) vars["--bg"] = fondo;
  if (color.superficie) vars["--surface"] = color.superficie;
  const superficie = color.superficie ?? "#f5f6f8";
  if (color.tinta && pasa(color.tinta, fondo, 4.5) && pasa(color.tinta, superficie, 4.5)) vars["--fg"] = color.tinta;
  if (color.tintaSuave && pasa(color.tintaSuave, fondo, 4.5) && pasa(color.tintaSuave, superficie, 4.5)) vars["--muted"] = color.tintaSuave;
  if (color.borde) vars["--border"] = color.borde;
  if (color.foco && pasa(color.foco, fondo, 3)) vars["--focus"] = color.foco;
  if (color.acento) {
    vars["--accent"] = color.acento;
    vars["--accent-hover"] = color.acento;
    vars["--accent-fg"] = color.acentoContraste && pasa(color.acentoContraste, color.acento, 4.5) ? color.acentoContraste : mejorTexto(color.acento);
  }
  // Los badges de estado llevan texto blanco.
  for (const [estado, valor] of Object.entries(color.estado)) {
    if (valor && pasa(BLANCO, valor, 4.5)) vars[`--estado-${estado}`] = valor;
  }
  if (radios.control !== undefined) vars["--radius-control"] = `${radios.control}px`;
  if (radios.medio !== undefined) vars["--radius-card"] = `${radios.medio}px`;
  return vars;
}

export const estiloTema = (colorPrimario: string | null | undefined, tema: Tema) => variablesTema(colorPrimario, tema) as CSSProperties;

/** Pares que no llegan al mínimo (para el script que carga el tema): mejor avisar que ignorar en silencio. */
export function problemasDeContraste(tema: Tema): string[] {
  const { color } = tema;
  const fondo = color.fondo ?? BLANCO;
  const superficie = color.superficie ?? "#f5f6f8";
  const pares: [string, string | undefined, string, number][] = [
    ["tinta sobre fondo", color.tinta, fondo, 4.5],
    ["tinta sobre superficie", color.tinta, superficie, 4.5],
    ["tintaSuave sobre fondo", color.tintaSuave, fondo, 4.5],
    ["tintaSuave sobre superficie", color.tintaSuave, superficie, 4.5],
    ["marcaContraste sobre marca", color.marcaContraste, color.marca ?? BLANCO, 4.5],
    ["foco sobre fondo", color.foco, fondo, 3],
    ["acentoContraste sobre acento", color.acentoContraste, color.acento ?? BLANCO, 4.5],
    ...Object.entries(color.estado).map(([e, v]) => [`texto blanco sobre estado.${e}`, BLANCO, v ?? NEGRO, 4.5] as [string, string, string, number]),
  ];
  return pares
    .filter(([, a, b, minimo]) => a && !pasa(a, b, minimo))
    .map(([nombre, a, b, minimo]) => `${nombre}: ${contrastRatio(a!, b).toFixed(2)}:1 (mínimo ${minimo}:1)`);
}
