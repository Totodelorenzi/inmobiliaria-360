"use client";

import { CircleCheck, Send, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef } from "react";
import { pedirInformacion, type EstadoPedidoInfo } from "@/app/s/[sitio]/(edificio)/acciones";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type Props = { agencyId: string; unitId: string; codigo: string; proyecto: string };

/** Botón "Pedir información" de una unidad: abre el formulario y crea (o actualiza) el lead del visitante. */
export function PedirInfo({ agencyId, unitId, codigo, proyecto }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, accion, enviando] = useActionState<EstadoPedidoInfo, FormData>(pedirInformacion, { ok: false });
  const v = estado.valores;
  const e = estado.errores;

  return (
    <>
      <Button variant="brand" size="lg" fullWidth onClick={() => dialogo.current?.showModal()}>
        Pedir información
      </Button>
      <dialog
        ref={dialogo}
        aria-label={`Pedir información de la unidad ${codigo}`}
        className="m-auto max-h-[92dvh] w-[min(100%-1.5rem,28rem)] overflow-y-auto rounded-2xl bg-bg p-5 text-fg shadow-xl backdrop:bg-black/60"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Pedir información</h2>
            <p className="text-sm text-muted">
              Unidad {codigo} · {proyecto}
            </p>
          </div>
          <button type="button" onClick={() => dialogo.current?.close()} className="-m-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-surface" aria-label="Cerrar">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {estado.ok ? (
          <div role="status" className="flex flex-col items-center gap-2 rounded-(--radius-card) bg-success-bg p-6 text-center text-success">
            <CircleCheck className="size-10" aria-hidden />
            <p className="text-lg font-bold">¡Listo! Recibimos tu pedido</p>
            <p className="text-fg">Te vamos a contactar a la brevedad con la información de la unidad {codigo}.</p>
            {estado.codigo && (
              <p className="text-sm text-fg">
                Tu código de referencia es <strong className="font-mono">{estado.codigo}</strong>.
              </p>
            )}
            <Button variant="outline" onClick={() => dialogo.current?.close()}>
              Seguir mirando
            </Button>
          </div>
        ) : (
          // key: al volver con errores, los campos se remontan con los valores enviados.
          <form key={JSON.stringify(v ?? {})} action={accion} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="agencyId" value={agencyId} />
            <input type="hidden" name="unitId" value={unitId} />
            <div className="hidden" aria-hidden>
              <label>
                Empresa
                <input name="empresa" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            {e?.general && (
              <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger">
                {e.general}
              </p>
            )}
            <Field label="Nombre" required error={e?.nombre}>
              {(a) => <Input {...a} name="nombre" autoComplete="name" defaultValue={v?.nombre} required />}
            </Field>
            <Field label="Teléfono" error={e?.contacto} hint="Te contactamos por WhatsApp o llamada.">
              {(a) => <Input {...a} name="telefono" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v?.telefono} />}
            </Field>
            <Field label="Email" error={e?.email}>
              {(a) => <Input {...a} name="email" type="email" autoComplete="email" defaultValue={v?.email} />}
            </Field>
            <Field label="Mensaje" error={e?.mensaje}>
              {(a) => (
                <Textarea {...a} name="mensaje" rows={3} maxLength={2000} defaultValue={v?.mensaje ?? `Hola, me interesa la unidad ${codigo} de ${proyecto}. ¿Me pasan más información?`} />
              )}
            </Field>
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="acepto" defaultChecked={v?.acepto} required className="mt-1 size-5 shrink-0 accent-(--brand)" />
                <span className="text-sm">
                  Acepto que la desarrolladora use mis datos y lo que vi en este sitio para responderme.{" "}
                  <Link href="/privacidad" target="_blank" className="font-semibold text-brand-ink underline">
                    Privacidad
                  </Link>
                </span>
              </label>
              {e?.acepto && (
                <p role="alert" className="mt-1 text-sm font-medium text-danger">
                  {e.acepto}
                </p>
              )}
            </div>
            <Button type="submit" variant="brand" size="lg" fullWidth loading={enviando}>
              {!enviando && <Send className="size-5" aria-hidden />}
              {enviando ? "Enviando…" : "Enviar pedido"}
            </Button>
          </form>
        )}
      </dialog>
    </>
  );
}
