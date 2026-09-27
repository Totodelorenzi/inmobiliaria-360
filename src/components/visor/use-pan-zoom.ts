"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

export type Vista = { escala: number; x: number; y: number };
type Tamano = { ancho: number; alto: number };

const ESCALA_MAX = 6;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Zoom y paneo con puntero (mouse, dedo, pellizco), rueda, doble toque y teclado.
 * El contenido se ajusta al marco a escala 1 y nunca se puede alejar más ni sacar de la vista.
 */
export function usePanZoom(marcoRef: RefObject<HTMLElement | null>, natural: Tamano | null) {
  const [marco, setMarco] = useState<Tamano | null>(null);
  const [vista, setVistaEstado] = useState<Vista>({ escala: 1, x: 0, y: 0 });
  const vistaRef = useRef(vista);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const ultimoToque = useRef({ t: 0, x: 0, y: 0, movio: false });

  // Tamaño del contenido a escala 1: "contain" dentro del marco.
  const base: Tamano | null =
    marco && natural
      ? (() => {
          const s = Math.min(marco.ancho / natural.ancho, marco.alto / natural.alto);
          return { ancho: natural.ancho * s, alto: natural.alto * s };
        })()
      : null;

  const limitar = useCallback(
    (v: Vista): Vista => {
      if (!marco || !base) return v;
      const w = base.ancho * v.escala;
      const h = base.alto * v.escala;
      return {
        escala: v.escala,
        x: w <= marco.ancho ? (marco.ancho - w) / 2 : clamp(v.x, marco.ancho - w, 0),
        y: h <= marco.alto ? (marco.alto - h) / 2 : clamp(v.y, marco.alto - h, 0),
      };
    },
    [marco, base],
  );

  const setVista = useCallback(
    (v: Vista) => {
      const final = limitar(v);
      vistaRef.current = final;
      setVistaEstado(final);
    },
    [limitar],
  );

  const zoomEn = useCallback(
    (px: number, py: number, factor: number) => {
      const v = vistaRef.current;
      const escala = clamp(v.escala * factor, 1, ESCALA_MAX);
      const k = escala / v.escala;
      setVista({ escala, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    },
    [setVista],
  );

  const restablecer = useCallback(() => setVista({ escala: 1, x: 0, y: 0 }), [setVista]);
  const zoomCentro = useCallback(
    (factor: number) => marco && zoomEn(marco.ancho / 2, marco.alto / 2, factor),
    [marco, zoomEn],
  );

  // Medir el marco y reajustar al cambiar de tamaño (rotar el celular).
  useEffect(() => {
    const el = marcoRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entrada]) => {
      setMarco({ ancho: entrada.contentRect.width, alto: entrada.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [marcoRef]);

  // Al tener medidas (o cambiarlas), volver a la vista ajustada.
  useEffect(() => {
    if (!marco || !base) return;
    const inicial = limitar({ escala: 1, x: 0, y: 0 });
    vistaRef.current = inicial;
    const id = requestAnimationFrame(() => setVistaEstado(inicial));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambian las medidas
  }, [marco?.ancho, marco?.alto, natural?.ancho, natural?.alto]);

  // Rueda del mouse (listener no pasivo para poder evitar el scroll de la página).
  useEffect(() => {
    const el = marcoRef.current;
    if (!el) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", alGirar, { passive: false });
    return () => el.removeEventListener("wheel", alGirar);
  }, [marcoRef, zoomEn]);

  const posicion = (e: ReactPointerEvent) => {
    const r = marcoRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handlers = {
    onPointerDown(e: ReactPointerEvent) {
      e.currentTarget.setPointerCapture(e.pointerId);
      punteros.current.set(e.pointerId, posicion(e));
      ultimoToque.current.movio = false;
    },
    onPointerMove(e: ReactPointerEvent) {
      const anterior = punteros.current.get(e.pointerId);
      if (!anterior) return;
      const nueva = posicion(e);
      if (Math.hypot(nueva.x - anterior.x, nueva.y - anterior.y) > 2) ultimoToque.current.movio = true;

      if (punteros.current.size === 1) {
        const v = vistaRef.current;
        setVista({ ...v, x: v.x + nueva.x - anterior.x, y: v.y + nueva.y - anterior.y });
      } else if (punteros.current.size === 2) {
        const [otroId, otro] = [...punteros.current].find(([id]) => id !== e.pointerId)!;
        void otroId;
        const distAntes = Math.hypot(anterior.x - otro.x, anterior.y - otro.y);
        const distAhora = Math.hypot(nueva.x - otro.x, nueva.y - otro.y);
        if (distAntes > 0) zoomEn((nueva.x + otro.x) / 2, (nueva.y + otro.y) / 2, distAhora / distAntes);
      }
      punteros.current.set(e.pointerId, nueva);
    },
    onPointerUp(e: ReactPointerEvent) {
      const p = punteros.current.get(e.pointerId);
      punteros.current.delete(e.pointerId);
      if (!p || ultimoToque.current.movio || punteros.current.size > 0) return;
      // Doble toque: acerca en ese punto o vuelve a la vista completa.
      const ahora = performance.now();
      const previo = ultimoToque.current;
      if (ahora - previo.t < 300 && Math.hypot(p.x - previo.x, p.y - previo.y) < 30) {
        if (vistaRef.current.escala > 1.1) restablecer();
        else zoomEn(p.x, p.y, 2.5);
        ultimoToque.current = { t: 0, x: 0, y: 0, movio: false };
      } else {
        ultimoToque.current = { t: ahora, x: p.x, y: p.y, movio: false };
      }
    },
    onPointerCancel(e: ReactPointerEvent) {
      punteros.current.delete(e.pointerId);
    },
    onKeyDown(e: React.KeyboardEvent) {
      const v = vistaRef.current;
      const paso = 60;
      const acciones: Record<string, () => void> = {
        "+": () => zoomCentro(1.4),
        "=": () => zoomCentro(1.4),
        "-": () => zoomCentro(1 / 1.4),
        "0": restablecer,
        ArrowLeft: () => setVista({ ...v, x: v.x + paso }),
        ArrowRight: () => setVista({ ...v, x: v.x - paso }),
        ArrowUp: () => setVista({ ...v, y: v.y + paso }),
        ArrowDown: () => setVista({ ...v, y: v.y - paso }),
      };
      if (acciones[e.key]) {
        e.preventDefault();
        acciones[e.key]();
      }
    },
  };

  return { vista, base, handlers, zoomCentro, restablecer };
}
