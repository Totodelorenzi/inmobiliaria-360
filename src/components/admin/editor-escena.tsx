"use client";

import "pannellum/build/pannellum.css";
import "@/components/visor/visor.css";
import { Crosshair, MousePointerClick, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { actualizarEscena, crearHotspot, eliminarHotspot } from "@/lib/admin/acciones";
import type { Escena } from "@/lib/admin/datos";
import { Hoja, MostrarAviso, useAccion } from "./acciones-ui";

type VisorEditor = {
  getYaw(): number;
  getPitch(): number;
  mouseEventToCoords(e: MouseEvent): [number, number];
  destroy(): void;
};

type Props = { escena: Escena; escenas: Escena[]; propertyId: string };

/** Panorámica con sus puntos de paso: tocar para agregar uno y elegir a qué ambiente lleva. */
export function EditorEscena({ escena, escenas, propertyId }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<VisorEditor | null>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState<{ pitch: number; yaw: number } | null>(null);
  const [destino, setDestino] = useState("");
  const [texto, setTexto] = useState("");
  const { ejecutar, pendiente, aviso } = useAccion();
  const otras = escenas.filter((e) => e.id !== escena.id);
  const nombre = (id: string) => escenas.find((e) => e.id === id)?.nombre_ambiente ?? "otro ambiente";
  const claveHotspots = escena.hotspots.map((h) => `${h.id}:${h.yaw}:${h.pitch}`).join("|");

  useEffect(() => {
    let visor: VisorEditor | undefined;
    let cancelado = false;
    import("pannellum/build/pannellum.js").then(() => {
      const pannellum = (window as unknown as { pannellum?: { viewer(el: HTMLElement, c: object): VisorEditor } }).pannellum;
      if (cancelado || !contenedorRef.current || !pannellum) return;
      visor = pannellum.viewer(contenedorRef.current, {
        type: "equirectangular",
        panorama: escena.panorama_url,
        autoLoad: true,
        showControls: false,
        compass: false,
        yaw: escena.yaw_inicial,
        pitch: escena.pitch_inicial,
        hfov: 100,
        hotSpots: escena.hotspots.map((h) => ({
          type: "info",
          yaw: h.yaw,
          pitch: h.pitch,
          cssClass: "hotspot-tour",
          createTooltipFunc: (div: HTMLElement) => {
            div.innerHTML = `<span class="hotspot-tour__icono">→</span><span class="hotspot-tour__texto"></span>`;
            div.querySelector(".hotspot-tour__texto")!.textContent = h.texto || nombre(h.target_scene_id);
          },
        })),
      });
      visorRef.current = visor;
    });
    return () => {
      cancelado = true;
      visor?.destroy();
      visorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se recrea al cambiar de escena o de puntos
  }, [escena.id, escena.panorama_url, claveHotspots]);

  function alSoltar(e: React.PointerEvent) {
    const inicio = toque.current;
    toque.current = null;
    if (!agregando || !inicio || !visorRef.current || Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 6) return;
    const [pitch, yaw] = visorRef.current.mouseEventToCoords(e.nativeEvent);
    setNuevo({ pitch, yaw });
    setDestino(otras[0]?.id ?? "");
    setTexto("");
  }

  return (
    <div className="flex flex-col gap-3">
      <MostrarAviso aviso={aviso} />
      <div
        className="visor-tour relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black sm:aspect-[16/9]"
        onPointerDown={(e) => (toque.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={alSoltar}
      >
        <div ref={contenedorRef} className="absolute inset-0" />
        {agregando && (
          <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl bg-accent px-3 py-2 text-center text-sm font-semibold text-accent-fg">
            Tocá en la imagen el lugar por donde se pasa al otro ambiente (una puerta, un pasillo).
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={agregando ? "accent" : "outline"}
          onClick={() => setAgregando((v) => !v)}
          disabled={otras.length === 0}
          aria-pressed={agregando}
        >
          <MousePointerClick className="size-4" aria-hidden /> {agregando ? "Tocá la imagen… (cancelar)" : "Agregar punto de paso"}
        </Button>
        <Button
          variant="outline"
          loading={pendiente}
          onClick={() => {
            const v = visorRef.current;
            if (v) ejecutar(() => actualizarEscena(escena.id, propertyId, { yaw_inicial: Math.round(v.getYaw() * 10) / 10, pitch_inicial: Math.round(v.getPitch() * 10) / 10 }));
          }}
        >
          <Crosshair className="size-4" aria-hidden /> Usar esta vista como inicial
        </Button>
      </div>
      {otras.length === 0 && <p className="text-sm text-muted">Subí al menos otro ambiente para poder conectarlos con puntos de paso.</p>}

      {escena.hotspots.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Puntos de paso de este ambiente">
          {escena.hotspots.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3">
              <span className="text-sm">
                → <strong>{nombre(h.target_scene_id)}</strong>
                {h.texto && ` (“${h.texto}”)`}
              </span>
              <Button variant="ghost" size="icon" onClick={() => ejecutar(() => eliminarHotspot(h.id, propertyId))} aria-label={`Quitar el punto hacia ${nombre(h.target_scene_id)}`}>
                <Trash2 className="size-4 text-danger" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Hoja titulo="Nuevo punto de paso" abierta={nuevo !== null} onCerrar={() => setNuevo(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevo || !destino) return;
            ejecutar(
              () => crearHotspot(propertyId, { scene_id: escena.id, target_scene_id: destino, yaw: nuevo.yaw, pitch: nuevo.pitch, texto: texto || null }),
              () => {
                setNuevo(null);
                setAgregando(false);
              },
            );
          }}
        >
          <Field label="¿A qué ambiente lleva?">
            {(a) => (
              <Select {...a} value={destino} onChange={(e) => setDestino(e.target.value)} required>
                {otras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre_ambiente}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Texto del botón (opcional)" hint={`Si lo dejás vacío dice “${nombre(destino)}”.`}>
            {(a) => <Input {...a} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={60} placeholder="Ir a la cocina" />}
          </Field>
          <Button type="submit" variant="brand" loading={pendiente} fullWidth>
            Guardar punto
          </Button>
        </form>
      </Hoja>
    </div>
  );
}
