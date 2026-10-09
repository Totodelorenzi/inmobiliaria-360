/**
 * Plataforma multi-inmobiliaria: qué web corresponde a cada host y cómo se arman las direcciones.
 *
 * - Web pública: <subdominio>.<DOMINIO_BASE> o el dominio propio de la inmobiliaria.
 * - Panel central: app.<DOMINIO_BASE> (sin DOMINIO_BASE, la URL del deploy).
 * - Hosts de prueba (localhost y *.vercel.app mientras no haya dominio real en producción):
 *   la inmobiliaria se elige con ?agencia=<subdominio>, que queda en una cookie.
 *
 * Funciones puras (sin Next ni Supabase): las usan el proxy, el servidor y los tests.
 */
import { getSiteUrl } from "@/lib/env";

export const PARAM_PRUEBA = "agencia";
export const COOKIE_PRUEBA = "sitio_prueba";

export const SUBDOMINIOS_RESERVADOS = ["app", "www", "admin", "api", "panel", "mail", "smtp", "ftp", "static", "assets", "cdn", "s"];

const SUBDOMINIO = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const DOMINIO = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Mensaje de error, o null si el subdominio sirve (mismas reglas que la base). */
export function validarSubdominio(valor: string): string | null {
  if (!SUBDOMINIO.test(valor) || valor.includes("--")) {
    return "De 3 a 40 letras minúsculas, números o guiones (sin tildes, sin espacios y sin guion al principio o al final).";
  }
  if (SUBDOMINIOS_RESERVADOS.includes(valor)) return "Ese nombre está reservado para la plataforma. Elegí otro.";
  return null;
}

/** "https://WWW.Inmo.com.ar/algo" → "inmo.com.ar" (como se guarda en la base). */
export function normalizarDominio(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export const esDominioValido = (dominio: string) => dominio.length <= 253 && DOMINIO.test(dominio);

/** Clave de un sitio en las rutas internas (/s/<clave>): un subdominio o un dominio propio. */
export const esClaveValida = (clave: string) =>
  clave.includes(".") ? esDominioValido(clave) : validarSubdominio(clave) === null;

export type Entorno = {
  /** Dominio de la plataforma, en minúsculas y sin protocolo (puede llevar puerto en pruebas locales). */
  dominioBase: string | null;
  vercelEnv?: string;
};

export function entornoActual(): Entorno {
  const base = process.env.DOMINIO_BASE?.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "");
  return { dominioBase: base || null, vercelEnv: process.env.VERCEL_ENV };
}

const sinPuerto = (host: string) => host.replace(/:\d+$/, "");

/**
 * Hosts donde se puede elegir la inmobiliaria con ?agencia=: desarrollo local, vistas previas de
 * Vercel y la URL *.vercel.app de producción mientras no haya un dominio real configurado.
 */
export function esHostDePrueba(host: string, entorno: Entorno): boolean {
  const nombre = sinPuerto(host.toLowerCase());
  if (nombre === "localhost" || nombre === "127.0.0.1") return true;
  if (nombre.endsWith(".vercel.app")) return entorno.vercelEnv !== "production" || !entorno.dominioBase;
  return false;
}

export type Destino =
  | { tipo: "panel" }
  | { tipo: "sitio"; clave: string; prueba: boolean }
  /** Ningún sitio: página neutra de la plataforma. */
  | { tipo: "plataforma"; prueba: boolean };

/** A qué corresponde un pedido según su host (y, solo en hosts de prueba, la inmobiliaria elegida). */
export function resolverHost(hostCrudo: string, entorno: Entorno, elegidaEnPrueba?: string | null): Destino {
  const host = hostCrudo.trim().toLowerCase().replace(/\.$/, "");
  const base = entorno.dominioBase;
  if (base) {
    if (host === `app.${base}`) return { tipo: "panel" };
    if (host === base || host === `www.${base}`) return { tipo: "plataforma", prueba: false };
    if (host.endsWith(`.${base}`)) {
      const sub = host.slice(0, -(base.length + 1));
      return validarSubdominio(sub) === null ? { tipo: "sitio", clave: sub, prueba: false } : { tipo: "plataforma", prueba: false };
    }
  }
  if (esHostDePrueba(host, entorno)) {
    const elegida = elegidaEnPrueba?.trim().toLowerCase();
    return elegida && validarSubdominio(elegida) === null
      ? { tipo: "sitio", clave: elegida, prueba: true }
      : { tipo: "plataforma", prueba: true };
  }
  if (sinPuerto(host).endsWith(".vercel.app")) return { tipo: "plataforma", prueba: false };
  // Cualquier otro host es un posible dominio propio: la página lo busca en la base.
  const dominio = normalizarDominio(host);
  return esDominioValido(dominio) ? { tipo: "sitio", clave: dominio, prueba: false } : { tipo: "plataforma", prueba: false };
}

const protocolo = (host: string) => (/(^|\.)localhost$|^127\./.test(sinPuerto(host)) ? "http" : "https");

/** Dirección del panel central (adonde llevan los mails de invitación y de recuperar contraseña). */
export function urlDelPanel(entorno: Entorno = entornoActual()): string {
  const base = entorno.dominioBase;
  return base ? `${protocolo(base)}://app.${base}` : getSiteUrl();
}

type DominiosAgencia = { subdominio: string; dominio_propio: string | null };

/**
 * Dirección absoluta de una ruta en la web de una inmobiliaria, tomada de la base: dominio propio,
 * subdominio de la plataforma o, sin dominio base, la URL del deploy con ?agencia=<subdominio>.
 */
export function urlEnSitio(agencia: DominiosAgencia, ruta = "/", entorno: Entorno = entornoActual()): string {
  if (agencia.dominio_propio) return `https://${agencia.dominio_propio}${ruta}`;
  const base = entorno.dominioBase;
  if (base) return `${protocolo(base)}://${agencia.subdominio}.${base}${ruta}`;
  const url = new URL(ruta, getSiteUrl());
  url.searchParams.set(PARAM_PRUEBA, agencia.subdominio);
  return url.toString();
}
