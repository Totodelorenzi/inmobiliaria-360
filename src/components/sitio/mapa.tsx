"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Ubicacion } from "@/lib/geo";

/** Mapa de OpenStreetMap que descarga Leaflet recién cuando está por entrar en pantalla. */
export function Mapa({ ubicacion, zona }: { ubicacion: Ubicacion; zona: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"espera" | "listo" | "error">("espera");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let limpiar: (() => void) | undefined;
    let cancelado = false;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observer.disconnect();
        import("./mapa-leaflet")
          .then(({ crearMapa }) => {
            if (cancelado) return;
            limpiar = crearMapa(el, ubicacion);
            setEstado("listo");
          })
          .catch(() => setEstado("error"));
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => {
      cancelado = true;
      observer.disconnect();
      limpiar?.();
    };
  }, [ubicacion]);

  return (
    <div className="relative isolate aspect-[4/3] overflow-hidden rounded-(--radius-card) border border-border bg-surface sm:aspect-[16/9]">
      <div
        ref={ref}
        className="size-full"
        role="img"
        aria-label={ubicacion.exacta ? `Mapa con la ubicación en ${zona}` : `Mapa con la zona aproximada: ${zona}`}
      />
      {estado !== "listo" && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-muted">
          <p className="flex items-center gap-2">
            <MapPin className="size-5" aria-hidden />
            {estado === "error" ? "No se pudo cargar el mapa." : "Cargando mapa…"}
          </p>
        </div>
      )}
    </div>
  );
}
