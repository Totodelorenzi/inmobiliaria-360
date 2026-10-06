"use client";

import { useEffect, useRef, useState } from "react";
import { registrar } from "@/lib/tracking/cliente";
import { tourCompleto } from "@/lib/tracking/config";
import { CronometroVisible } from "@/lib/tracking/cronometro";

/**
 * Seguimiento del tour: tiempo visible por escena (desde que carga hasta que se cambia),
 * "tour_start" con la primera escena y "tour_complete" al cumplir los umbrales de config.ts.
 */
export function useRastreoTour({ propertyId, totalEscenas, activo }: { propertyId: string; totalEscenas: number; activo: boolean }) {
  const crono = useRef<CronometroVisible | null>(null);
  const escena = useRef<string | null>(null);
  const vistas = useRef(new Set<string>());
  const iniciado = useRef(false);
  const completoRef = useRef(false);
  const [completo, setCompleto] = useState(false);

  useEffect(() => {
    if (!activo) return;
    const c = new CronometroVisible();
    crono.current = c;

    const cerrarSegmento = () => {
      if (!escena.current) return;
      const ms = c.tomar();
      if (ms > 500) registrar({ tipo: "scene_view", propertyId, sceneId: escena.current, duracionMs: ms });
    };
    const evaluar = () => {
      if (completoRef.current || !tourCompleto(vistas.current.size, totalEscenas, c.totalMs() / 1000)) return;
      completoRef.current = true;
      setCompleto(true);
      registrar({ tipo: "tour_complete", propertyId, meta: { escenas: vistas.current.size, segundos: Math.round(c.totalMs() / 1000) } });
    };
    // Al ocultar la pestaña se cierra el tramo (el cronómetro ya no cuenta mientras está oculta).
    const alOcultar = () => document.visibilityState === "hidden" && cerrarSegmento();
    document.addEventListener("visibilitychange", alOcultar);
    const intervalo = setInterval(evaluar, 5000);

    return () => {
      cerrarSegmento();
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alOcultar);
      c.detener();
      crono.current = null;
    };
  }, [activo, propertyId, totalEscenas]);

  return {
    completo,
    /** Pannellum avisó que se va de la escena actual. */
    alSalirDeEscena() {
      const c = crono.current;
      if (!c || !escena.current) return;
      const ms = c.tomar();
      if (ms > 500) registrar({ tipo: "scene_view", propertyId, sceneId: escena.current, duracionMs: ms });
      escena.current = null;
    },
    /** La escena terminó de cargar: desde acá cuenta su tiempo (no el de carga). */
    alCargarEscena(id: string) {
      const c = crono.current;
      if (!c) return;
      c.tomar();
      escena.current = id;
      vistas.current.add(id);
      if (!iniciado.current) {
        iniciado.current = true;
        registrar({ tipo: "tour_start", propertyId });
      }
    },
  };
}
