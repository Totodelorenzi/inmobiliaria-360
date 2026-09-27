"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import type { Resultado } from "@/lib/admin/sesion";
import { Aviso } from "./ui";

export type AvisoAccion = { tono: "ok" | "error"; texto: string } | null;

/** Ejecuta una Server Action mostrando el resultado y recargando los datos de la pantalla. */
export function useAccion() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<AvisoAccion>(null);

  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void) {
    setAviso(null);
    startTransition(async () => {
      try {
        const r = await accion();
        if (!r.ok) setAviso({ tono: "error", texto: r.error });
        else {
          if (r.mensaje) setAviso({ tono: "ok", texto: r.mensaje });
          alTerminar?.();
          router.refresh();
        }
      } catch {
        setAviso({ tono: "error", texto: "No se pudo completar la acción. Revisá tu conexión y probá de nuevo." });
      }
    });
  }
  return { ejecutar, pendiente, aviso, setAviso };
}

export function MostrarAviso({ aviso }: { aviso: AvisoAccion }) {
  return aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null;
}

/** Botón que pide confirmación antes de una acción irreversible. */
export function BotonConfirmar({
  children,
  titulo,
  descripcion,
  confirmar = "Eliminar",
  onConfirmar,
  variant = "outline",
  size = "md",
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  titulo: string;
  descripcion?: ReactNode;
  confirmar?: string;
  onConfirmar: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant={variant} size={size} className={className} disabled={disabled} onClick={() => ref.current?.showModal()} aria-label={ariaLabel}>
        {children}
      </Button>
      <dialog ref={ref} aria-label={titulo} className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl bg-bg p-5 text-fg backdrop:bg-black/50">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {descripcion && <div className="mt-2 text-muted">{descripcion}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => ref.current?.close()}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              ref.current?.close();
              onConfirmar();
            }}
          >
            {confirmar}
          </Button>
        </div>
      </dialog>
    </>
  );
}

/** Hoja inferior (celular) / diálogo centrado (escritorio) con opciones. */
export function Hoja({ titulo, abierta, onCerrar, children }: { titulo: string; abierta: boolean; onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    else if (!abierta && d.open) d.close();
  }, [abierta]);
  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-fg backdrop:bg-black/50 sm:m-auto sm:w-[min(28rem,calc(100%-2rem))] sm:rounded-3xl"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="truncate font-bold">{titulo}</h2>
        <button type="button" onClick={onCerrar} className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface" aria-label="Cerrar">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {children}
    </dialog>
  );
}
