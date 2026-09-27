"use client";

import { CircleCheck, CircleAlert, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export type ItemCola = {
  id: string;
  nombre: string;
  estado: "esperando" | "procesando" | "subiendo" | "listo" | "error";
  progreso: number;
  error?: string;
};

type Tarea = (archivo: File, progreso: (fraccion: number, estado?: ItemCola["estado"]) => void) => Promise<void>;

/**
 * Cola de subida: procesa de a `simultaneos` archivos, informa el progreso de cada uno
 * y permite reintentar los que fallaron sin volver a elegirlos.
 */
export function useColaSubida(tarea: Tarea, { simultaneos = 2, alTerminar }: { simultaneos?: number; alTerminar?: () => void } = {}) {
  const [items, setItems] = useState<ItemCola[]>([]);
  const archivos = useRef(new Map<string, File>());
  const esperando = useRef<string[]>([]);
  const activos = useRef(0);
  const tareaRef = useRef(tarea);
  const alTerminarRef = useRef(alTerminar);
  useEffect(() => {
    tareaRef.current = tarea;
    alTerminarRef.current = alTerminar;
  });

  const actualizar = (id: string, cambios: Partial<ItemCola>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));

  // Declaración de función (no const): se llama a sí misma al terminar cada archivo. Solo usa refs.
  function siguiente() {
    while (activos.current < simultaneos && esperando.current.length > 0) {
      const id = esperando.current.shift()!;
      const archivo = archivos.current.get(id);
      if (!archivo) continue;
      activos.current++;
      actualizar(id, { estado: "procesando", progreso: 0, error: undefined });
      tareaRef
        .current(archivo, (progreso, estado) => actualizar(id, { progreso, ...(estado && { estado }) }))
        .then(() => {
          actualizar(id, { estado: "listo", progreso: 1 });
          archivos.current.delete(id);
        })
        .catch((e: unknown) => actualizar(id, { estado: "error", error: e instanceof Error ? e.message : "No se pudo subir." }))
        .finally(() => {
          activos.current--;
          if (activos.current === 0 && esperando.current.length === 0) alTerminarRef.current?.();
          siguiente();
        });
    }
  }

  function agregar(lista: FileList | File[]) {
    const nuevos = [...lista].map((archivo) => {
      const id = crypto.randomUUID();
      archivos.current.set(id, archivo);
      esperando.current.push(id);
      return { id, nombre: archivo.name, estado: "esperando" as const, progreso: 0 };
    });
    setItems((prev) => [...prev.filter((i) => i.estado !== "listo"), ...nuevos]);
    siguiente();
  }

  function reintentar(id: string) {
    esperando.current.push(id);
    actualizar(id, { estado: "esperando", error: undefined });
    siguiente();
  }

  function descartar(id: string) {
    archivos.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return { items, agregar, reintentar, descartar, ocupado: items.some((i) => i.estado !== "listo" && i.estado !== "error") };
}

const ETIQUETA: Record<ItemCola["estado"], string> = {
  esperando: "En espera",
  procesando: "Preparando…",
  subiendo: "Subiendo",
  listo: "Listo",
  error: "Error",
};

/** Lista de archivos en proceso con su barra de progreso. */
export function ListaCola({ items, reintentar, descartar }: { items: ItemCola[]; reintentar: (id: string) => void; descartar: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2" aria-label="Archivos en proceso">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border bg-bg p-3">
          <div className="flex items-center gap-2">
            {item.estado === "listo" ? (
              <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
            ) : item.estado === "error" ? (
              <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden />
            ) : (
              <Spinner className="size-5 shrink-0 text-muted" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.nombre}</span>
            <span className="shrink-0 text-xs text-muted">
              {ETIQUETA[item.estado]}
              {item.estado === "subiendo" && ` ${Math.round(item.progreso * 100)}%`}
            </span>
            {item.estado === "error" && (
              <>
                <button type="button" onClick={() => reintentar(item.id)} className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface" aria-label={`Reintentar ${item.nombre}`}>
                  <RotateCw className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => descartar(item.id)} className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface" aria-label={`Descartar ${item.nombre}`}>
                  <X className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
          {(item.estado === "subiendo" || item.estado === "procesando") && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={Math.round(item.progreso * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${item.nombre}`}>
              <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${Math.max(4, item.progreso * 100)}%` }} />
            </div>
          )}
          {item.error && <p className="mt-1 text-sm text-danger">{item.error}</p>}
        </li>
      ))}
    </ul>
  );
}
