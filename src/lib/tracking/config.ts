/**
 * Configuración del tracking de pre-visita. Todo lo ajustable está acá.
 */

/** Tour completo: vio al menos este porcentaje de las escenas y acumuló al menos estos segundos visibles. */
export const TOUR_COMPLETO = { escenasMinimas: 0.8, segundosMinimos: 60 } as const;

/** Cada cuánto se envía el lote de eventos (además de al ocultar la página). */
export const ENVIO_CADA_MS = 10_000;

/** Una sesión nueva empieza tras este tiempo sin actividad (cuenta como otra visita). */
export const SESION_VENCE_MS = 30 * 60_000;

/** Máximo de eventos por lote; el resto se descarta en el servidor. */
export const MAX_EVENTOS_POR_LOTE = 50;

/** Duración máxima creíble de un segmento visible (escena o plano). */
export const MAX_DURACION_MS = 60 * 60_000;

export function tourCompleto(escenasVistas: number, totalEscenas: number, segundosVisibles: number) {
  if (totalEscenas === 0) return false;
  const necesarias = Math.max(1, Math.ceil(totalEscenas * TOUR_COMPLETO.escenasMinimas));
  return escenasVistas >= necesarias && segundosVisibles >= TOUR_COMPLETO.segundosMinimos;
}
