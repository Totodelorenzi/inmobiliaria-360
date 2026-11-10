/**
 * Catálogo cerrado de tipografías para los temas de cada inmobiliaria (puntos de partida de la skill
 * web-inmobiliaria-cliente). next/font necesita declararlas en tiempo de compilación; ninguna se
 * precarga y el navegador descarga solo la que usa cada web. Inter y Bricolage (tema base) se cargan
 * en el layout raíz.
 */
import {
  Archivo,
  Atkinson_Hyperlegible,
  Familjen_Grotesk,
  Figtree,
  Fraunces,
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
  Libre_Caslon_Text,
  Manrope,
  Newsreader,
  Nunito_Sans,
  Outfit,
  Plus_Jakarta_Sans,
  Public_Sans,
  Rubik,
  Schibsted_Grotesk,
  Sora,
  Source_Sans_3,
} from "next/font/google";
import type { CSSProperties } from "react";
import { leerTema, variablesTema, type Familia } from "@/lib/tema";

// Opciones literales en cada llamada: next/font no acepta variables ni spread.
const fraunces = Fraunces({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-fraunces" });
const newsreader = Newsreader({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-newsreader" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], preload: false, display: "swap", weight: "400", variable: "--f-instrument-serif" });
const libreCaslon = Libre_Caslon_Text({ subsets: ["latin"], preload: false, display: "swap", weight: ["400", "700"], variable: "--f-libre-caslon" });
const figtree = Figtree({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-figtree" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-source-sans" });
const publicSans = Public_Sans({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-public-sans" });
const outfit = Outfit({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-outfit" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-plus-jakarta" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-nunito-sans" });
const rubik = Rubik({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-rubik" });
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-schibsted" });
const archivo = Archivo({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-archivo" });
const sora = Sora({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-sora" });
const manrope = Manrope({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-manrope" });
const familjen = Familjen_Grotesk({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-familjen" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], preload: false, display: "swap", variable: "--f-instrument-sans" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], preload: false, display: "swap", weight: ["400", "500", "600", "700"], variable: "--f-plex" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], preload: false, display: "swap", weight: ["400", "700"], variable: "--f-atkinson" });

type Fuente = { variable: string; nombre: string };

/** Variable CSS (y clase que la define) de cada familia. Inter y Bricolage ya están en el layout raíz. */
const CATALOGO: Record<Familia, Fuente> = {
  Inter: { variable: "", nombre: "--font-inter" },
  "Bricolage Grotesque": { variable: "", nombre: "--font-bricolage" },
  Fraunces: { variable: fraunces.variable, nombre: "--f-fraunces" },
  Newsreader: { variable: newsreader.variable, nombre: "--f-newsreader" },
  "Instrument Serif": { variable: instrumentSerif.variable, nombre: "--f-instrument-serif" },
  "Libre Caslon Text": { variable: libreCaslon.variable, nombre: "--f-libre-caslon" },
  Figtree: { variable: figtree.variable, nombre: "--f-figtree" },
  "Source Sans 3": { variable: sourceSans.variable, nombre: "--f-source-sans" },
  "Public Sans": { variable: publicSans.variable, nombre: "--f-public-sans" },
  Outfit: { variable: outfit.variable, nombre: "--f-outfit" },
  "Plus Jakarta Sans": { variable: plusJakarta.variable, nombre: "--f-plus-jakarta" },
  "Nunito Sans": { variable: nunitoSans.variable, nombre: "--f-nunito-sans" },
  Rubik: { variable: rubik.variable, nombre: "--f-rubik" },
  "Schibsted Grotesk": { variable: schibsted.variable, nombre: "--f-schibsted" },
  Archivo: { variable: archivo.variable, nombre: "--f-archivo" },
  Sora: { variable: sora.variable, nombre: "--f-sora" },
  Manrope: { variable: manrope.variable, nombre: "--f-manrope" },
  "Familjen Grotesk": { variable: familjen.variable, nombre: "--f-familjen" },
  "Instrument Sans": { variable: instrumentSans.variable, nombre: "--f-instrument-sans" },
  "IBM Plex Sans": { variable: plex.variable, nombre: "--f-plex" },
  "Atkinson Hyperlegible": { variable: atkinson.variable, nombre: "--f-atkinson" },
};

/** Clases y variables para el contenedor del sitio según las familias del tema. */
export function fuentesDelTema(tipografia: { display?: Familia; texto?: Familia }) {
  const clases: string[] = [];
  const vars: Record<string, string> = {};
  if (tipografia.texto) {
    const f = CATALOGO[tipografia.texto];
    clases.push(f.variable);
    vars["--font-texto"] = `var(${f.nombre})`;
    // Sin display propio, los títulos usan la misma familia del texto.
    if (!tipografia.display) vars["--font-titulos"] = `var(${f.nombre})`;
  }
  if (tipografia.display) {
    const f = CATALOGO[tipografia.display];
    clases.push(f.variable);
    vars["--font-titulos"] = `var(${f.nombre})`;
  }
  return { clases: clases.filter(Boolean).join(" "), vars };
}

/** Estilo y clases del contenedor de la web de una inmobiliaria: su tema sobre el sistema base. */
export function aparienciaSitio(agencia: { color_primario: string; tema: unknown }) {
  const tema = leerTema(agencia.tema);
  const fuentes = fuentesDelTema(tema.tipografia);
  return { style: { ...variablesTema(agencia.color_primario, tema), ...fuentes.vars } as CSSProperties, className: fuentes.clases };
}
