/**
 * Tracking propio del navegador (sin terceros). Acumula eventos y los manda en lotes a
 * /api/eventos cada ~10 s y al ocultar la página. El visitante lo identifica el servidor con
 * una cookie first-party; acá solo se maneja la sesión y la cola.
 */
import { ENVIO_CADA_MS, SESION_VENCE_MS } from "./config";
import type { EventoCliente, Utm } from "./eventos";

type Nuevo = Omit<EventoCliente, "t" | "sesion">;

const URL_EVENTOS = "/api/eventos";
const CLAVE_SESION = "v360_sesion";
const CLAVE_UTM = "v360_utm";

let cola: EventoCliente[] = [];
let iniciado = false;
let primerEnvio = true;

/** No se registra nada si el navegador pide Global Privacy Control. */
export function rastreoPermitido() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !nav.globalPrivacyControl;
}

function guardado<T>(clave: string, leer: (v: string) => T): T | null {
  try {
    const v = sessionStorage.getItem(clave);
    return v ? leer(v) : null;
  } catch {
    return null;
  }
}

/** Id de sesión: se renueva tras 30 min sin actividad (cada sesión cuenta como una visita). */
function sesionActual() {
  const ahora = Date.now();
  const previa = guardado(CLAVE_SESION, (v) => JSON.parse(v) as { id: string; ultimo: number });
  const id = previa && ahora - previa.ultimo < SESION_VENCE_MS ? previa.id : crypto.randomUUID();
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ id, ultimo: ahora }));
  } catch {
    // modo privado sin storage: la sesión dura lo que la página
  }
  return id;
}

/** UTM de la primera página de la sesión (viajan solo en el primer lote). */
function utmPendiente(): Utm | undefined {
  const yaEnviado = guardado(CLAVE_UTM, (v) => v);
  if (yaEnviado) return undefined;
  const p = new URLSearchParams(location.search);
  const utm = { source: p.get("utm_source") ?? undefined, medium: p.get("utm_medium") ?? undefined, campaign: p.get("utm_campaign") ?? undefined };
  return utm.source || utm.medium || utm.campaign ? utm : undefined;
}

function enviar() {
  if (cola.length === 0) return;
  const utm = primerEnvio ? utmPendiente() : undefined;
  const cuerpo = JSON.stringify({ eventos: cola.splice(0, 50), ...(utm ? { utm } : {}) });
  try {
    if (primerEnvio) {
      // El primero va por fetch: así el navegador guarda seguro las cookies del visitante.
      primerEnvio = false;
      try {
        sessionStorage.setItem(CLAVE_UTM, "1");
      } catch {}
      void fetch(URL_EVENTOS, { method: "POST", body: cuerpo, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    } else if (!navigator.sendBeacon?.(URL_EVENTOS, new Blob([cuerpo], { type: "application/json" }))) {
      void fetch(URL_EVENTOS, { method: "POST", body: cuerpo, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    // el tracking nunca rompe la página
  }
  if (cola.length > 0) enviar();
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  setInterval(enviar, ENVIO_CADA_MS);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && enviar());
  window.addEventListener("pagehide", enviar);
}

/** Registra un evento. `inmediato`: se manda ya (ej. antes de abrir WhatsApp). */
export function registrar(evento: Nuevo, { inmediato = false } = {}) {
  if (!rastreoPermitido()) return;
  iniciar();
  cola.push({ ...evento, t: Date.now(), sesion: sesionActual() });
  if (inmediato || primerEnvio) enviar();
}

/** Código de referencia del visitante (cookie legible que deja el servidor). */
export function codigoReferencia() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)v360_ref=([A-Z0-9]{4,6})/);
  return m ? m[1] : null;
}

/** Vacía la cola (para tests o al borrar el historial). */
export function descartarPendientes() {
  cola = [];
}
