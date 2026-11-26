"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { whatsappLink } from "@/lib/format";
import type { Utm } from "@/lib/tracking/eventos";
import { codigoReferencia, registrar } from "@/lib/tracking/cliente";

// ---------------------------------------------------------------------------
// Precarga: el paso siguiente ya está decodificado cuando empieza la animación
// ---------------------------------------------------------------------------
const precargadas = new Map<string, Promise<void>>();

/** Baja y decodifica una imagen una sola vez (no falla: si no carga, la animación sigue igual). */
export function precargar(url: string | null | undefined): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();
  let p = precargadas.get(url);
  if (!p) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    p = img.decode().catch(() => undefined);
    precargadas.set(url, p);
  }
  return p;
}

/** Precarga cuando el navegador está libre (lo que probablemente se mire después). */
export function precargarLuego(urls: (string | null | undefined)[]) {
  if (typeof window === "undefined") return;
  const ir = () => urls.forEach((u) => void precargar(u));
  if ("requestIdleCallback" in window) window.requestIdleCallback(ir, { timeout: 2500 });
  else setTimeout(ir, 600);
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
export type Pantalla = { ancho: number; alto: number };

function suscribir(cb: () => void) {
  window.addEventListener("resize", cb);
  window.visualViewport?.addEventListener("resize", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.visualViewport?.removeEventListener("resize", cb);
  };
}
let ultima: Pantalla = { ancho: 0, alto: 0 };
function leer(): Pantalla {
  // Alto "chico" (con las barras del navegador visibles): no cambia al ocultarse la barra al scrollear.
  const alto = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
  const ancho = document.documentElement.clientWidth || window.innerWidth;
  // En el celular, la barra del navegador que aparece y desaparece no reacomoda la escena.
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  if (ultima.ancho !== ancho || ultima.alto === 0 || (tactil ? Math.abs(ultima.alto - alto) > 120 : ultima.alto !== alto)) ultima = { ancho, alto };
  return ultima;
}
const SIN_MEDIDA: Pantalla = { ancho: 0, alto: 0 };
const enServidor = () => SIN_MEDIDA;

/** Tamaño de la pantalla (0 × 0 en el servidor y al hidratar: las capas se acomodan después). */
export function usePantalla() {
  return useSyncExternalStore(suscribir, leer, enServidor);
}

/** true cuando el sistema pide reducir el movimiento. */
export function useMenosMovimiento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cambiar = () => setMenos(q.matches);
    cambiar();
    q.addEventListener("change", cambiar);
    return () => q.removeEventListener("change", cambiar);
  }, []);
  return menos;
}

// ---------------------------------------------------------------------------
// Campaña de la visita (UTM): se guarda al llegar y viaja con la consulta
// ---------------------------------------------------------------------------
const CLAVE_UTM = "v360_campana";
const CAMPOS_UTM = ["source", "medium", "campaign", "content", "term"] as const;

/** Toma los UTM de la dirección de llegada (la última campaña de la sesión manda). */
export function guardarCampana() {
  try {
    const p = new URLSearchParams(location.search);
    const utm: Utm = {};
    for (const c of CAMPOS_UTM) {
      const v = p.get(`utm_${c}`)?.trim();
      if (v) utm[c] = v.slice(0, 100);
    }
    if (Object.keys(utm).length) sessionStorage.setItem(CLAVE_UTM, JSON.stringify(utm));
  } catch {
    // sin storage: la consulta va sin campaña
  }
}

export function campana(): Utm {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLAVE_UTM) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(CAMPOS_UTM.filter((c) => typeof v[c] === "string").map((c) => [c, v[c] as string]));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/** Link a WhatsApp con el código de referencia del visitante; registra el click (y su campaña). */
export function abrirWhatsapp(numero: string, mensaje: string, evento: { projectId: string; unitId?: string; ubicacion: string }) {
  const ref = codigoReferencia();
  const utm = campana();
  registrar(
    {
      tipo: "whatsapp_click",
      projectId: evento.projectId,
      ...(evento.unitId ? { unitId: evento.unitId } : {}),
      meta: { ubicacion: evento.ubicacion, ...Object.fromEntries(Object.entries(utm).map(([k, v]) => [`utm_${k}`, v])) },
    },
    { inmediato: true },
  );
  return whatsappLink(numero, ref ? `${mensaje} (Ref. ${ref})` : mensaje);
}

/** La pantalla ya se midió (en el servidor y al hidratar vale 0 × 0). */
export const listo = (p: Pantalla) => p.ancho > 0 && p.alto > 0;
