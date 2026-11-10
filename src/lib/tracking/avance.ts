/**
 * Avance del recorrido por propiedad, guardado de forma anónima en este navegador (localStorage):
 * la ficha cambia la jerarquía de sus botones cuando el visitante vuelve después del tour.
 * No viaja al servidor; si el storage no está disponible, todo sigue funcionando sin avance.
 */
const CLAVE = "v360_avance";
const EVENTO = "v360-avance";

export type Avance = { vistas: number; total: number; completo: boolean };

function leerTodo(): Record<string, Avance> {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? (JSON.parse(crudo) as unknown) : {};
    return typeof datos === "object" && datos !== null ? (datos as Record<string, Avance>) : {};
  } catch {
    return {};
  }
}

export function leerAvance(propertyId: string): Avance | null {
  const a = leerTodo()[propertyId];
  return a && typeof a.vistas === "number" && typeof a.total === "number" ? { ...a, completo: Boolean(a.completo) } : null;
}

/** Guarda el avance (nunca retrocede: una visita nueva más corta no borra un recorrido completo). */
export function guardarAvance(propertyId: string, avance: Avance) {
  try {
    const todo = leerTodo();
    const previo = todo[propertyId];
    todo[propertyId] = {
      vistas: Math.max(avance.vistas, previo?.vistas ?? 0),
      total: avance.total,
      completo: avance.completo || Boolean(previo?.completo),
    };
    // Como mucho 50 propiedades: se descartan las más viejas.
    const claves = Object.keys(todo);
    for (const clave of claves.slice(0, Math.max(0, claves.length - 50))) delete todo[clave];
    localStorage.setItem(CLAVE, JSON.stringify(todo));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // sin storage: el avance dura lo que la página
  }
}

/** Para useSyncExternalStore: avisa cuando cambia el avance (en esta pestaña o en otra). */
export function suscribirAvance(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

/**
 * Etapa del recorrido para el CTA de la ficha. Completo: el visor lo marcó (tour_complete) o se vio
 * al menos el 80 % de los ambientes.
 */
export function etapaRecorrido(avance: Avance | null): "sin_empezar" | "en_curso" | "completo" {
  if (!avance || avance.vistas === 0) return "sin_empezar";
  if (avance.completo || (avance.total > 0 && avance.vistas / avance.total >= 0.8)) return "completo";
  return "en_curso";
}
