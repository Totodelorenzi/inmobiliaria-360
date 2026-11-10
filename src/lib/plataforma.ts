/**
 * Configuración global de la plataforma. Es lo único de la plataforma que ve un comprador: el crédito
 * discreto del pie de cada web ("Hecho con udevelop"). Nunca se escribe a mano por cliente.
 */
import { entornoActual } from "@/lib/tenancy";

export const PLATAFORMA = { nombre: "udevelop" } as const;

/** Link del crédito: el dominio de la plataforma cuando exista; mientras tanto, solo el nombre. */
export function urlPlataforma(): string | null {
  const base = entornoActual().dominioBase;
  return base ? `https://${base.replace(/:\d+$/, "")}` : null;
}
