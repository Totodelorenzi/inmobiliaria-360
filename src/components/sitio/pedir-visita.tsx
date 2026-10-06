"use client";

import { CalendarCheck, CircleCheck, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, type ReactNode } from "react";
import { pedirVisita, type EstadoPedido } from "@/app/(sitio)/propiedad/[slug]/acciones";
import { Button, buttonStyles, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FORMA_PAGO_LABEL, FRANJAS, PLAZO_LABEL } from "@/lib/previsita/validacion";
import type { Enums } from "@/types/database";

function Opciones({
  nombre,
  pregunta,
  opciones,
  valor,
  error,
}: {
  nombre: string;
  pregunta: string;
  opciones: Record<string, string>;
  valor?: string;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${nombre}-error` : undefined}>
      <legend className="mb-2 font-semibold">{pregunta}</legend>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(opciones).map(([v, label]) => (
          <label
            key={v}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border px-3 py-2 text-center text-sm font-medium has-checked:border-brand has-checked:bg-brand has-checked:text-brand-fg has-focus-visible:outline-3 has-focus-visible:outline-focus"
          >
            <input type="radio" name={nombre} value={v} defaultChecked={valor === v} className="sr-only" required />
            {label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${nombre}-error`} role="alert" className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type Props = {
  propertyId: string;
  operacion: Enums<"operacion">;
  titulo: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  /** Opción secundaria que se ofrece al terminar. */
  whatsapp?: ReactNode;
};

/** Botón "Pedir visita presencial" con su formulario corto de calificación. */
export function PedirVisita({ propertyId, operacion, titulo, variant = "brand", size = "lg", fullWidth, className, children, whatsapp }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [estado, accion, enviando] = useActionState<EstadoPedido, FormData>(pedirVisita, { ok: false });
  const v = estado.valores;
  const e = estado.errores ?? {};
  const venta = operacion === "venta";

  return (
    <>
      <Button variant={variant} size={size} fullWidth={fullWidth} className={className} onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        {children ?? (
          <>
            <CalendarCheck className="size-5" aria-hidden /> Pedir visita presencial
          </>
        )}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="titulo-pedir-visita"
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-bg p-0 text-fg backdrop:bg-black/60 sm:m-auto sm:max-w-lg sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-bg px-5 py-3">
          <div className="min-w-0">
            <h2 id="titulo-pedir-visita" className="text-lg font-bold">
              Pedir visita presencial
            </h2>
            <p className="truncate text-sm text-muted">{titulo}</p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={buttonStyles({ variant: "ghost", size: "icon" })}
            aria-label="Cerrar"
          >
            <X aria-hidden />
          </button>
        </div>

        {estado.ok ? (
          <div role="status" className="flex flex-col items-center gap-3 p-6 text-center">
            <CircleCheck className="size-12 text-success" aria-hidden />
            <p className="text-xl font-bold">¡Listo! Te vamos a contactar para coordinar la visita.</p>
            {estado.codigo && (
              <p className="text-muted">
                Tu código de referencia es <strong className="font-mono text-fg">{estado.codigo}</strong>.
              </p>
            )}
            {whatsapp && <div className="mt-2 w-full">{whatsapp}</div>}
          </div>
        ) : (
          // key: al volver con errores, los campos se remontan con lo que la persona eligió.
          <form key={JSON.stringify(v ?? {})} action={accion} className="flex flex-col gap-5 p-5" noValidate>
            <input type="hidden" name="propertyId" value={propertyId} />
            <div className="hidden" aria-hidden>
              <label>
                Empresa
                <input name="empresa" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <p className="text-sm text-muted">Con estas respuestas la inmobiliaria prepara la visita. Toma menos de un minuto.</p>
            {e.general && (
              <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger">
                {e.general}
              </p>
            )}

            {venta && <Opciones nombre="formaPago" pregunta="¿Cómo pensás pagar?" opciones={FORMA_PAGO_LABEL} valor={v?.formaPago} error={e.formaPago} />}
            <Opciones
              nombre="plazo"
              pregunta={venta ? "¿Cuándo pensás comprar?" : "¿Cuándo te mudarías?"}
              opciones={PLAZO_LABEL}
              valor={v?.plazo}
              error={e.plazo}
            />
            {venta && (
              <Opciones
                nombre="necesitaVender"
                pregunta="¿Necesitás vender otra propiedad para comprar?"
                opciones={{ si: "Sí", no: "No" }}
                valor={v?.necesitaVender}
                error={e.necesitaVender}
              />
            )}
            <Opciones nombre="franja" pregunta="¿Qué momento te queda mejor para la visita?" opciones={FRANJAS} valor={v?.franja} error={e.franja} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required error={e.nombre}>
                {(a) => <Input {...a} name="nombre" autoComplete="name" defaultValue={v?.nombre} required />}
              </Field>
              <Field label="Teléfono" required error={e.telefono}>
                {(a) => <Input {...a} name="telefono" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v?.telefono} required />}
              </Field>
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="acepto" defaultChecked={v?.acepto} required className="mt-1 size-5 shrink-0 accent-(--brand)" />
                <span className="text-sm">
                  Acepto que la inmobiliaria use mis datos y lo que vi en este sitio para coordinar la visita.{" "}
                  <Link href="/privacidad" target="_blank" className="font-semibold text-brand-ink underline">
                    Privacidad
                  </Link>
                </span>
              </label>
              {e.acepto && (
                <p role="alert" className="mt-1 text-sm font-medium text-danger">
                  {e.acepto}
                </p>
              )}
            </div>

            <Button type="submit" variant="brand" size="lg" fullWidth loading={enviando}>
              {enviando ? "Enviando…" : "Pedir visita"}
            </Button>
          </form>
        )}
      </dialog>
    </>
  );
}
