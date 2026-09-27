"use client";

import { CircleCheck, Send } from "lucide-react";
import { useActionState } from "react";
import { enviarConsulta, type EstadoConsulta } from "@/app/(sitio)/propiedad/[slug]/acciones";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

const MENSAJE_INICIAL = "Hola, me interesa esta propiedad. ¿Me pasás más información?";

export function FormConsulta({ agencyId, propertyId }: { agencyId: string; propertyId: string }) {
  const [estado, accion, enviando] = useActionState<EstadoConsulta, FormData>(enviarConsulta, { ok: false });
  const v = estado.valores;
  const e = estado.errores;

  if (estado.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-2 rounded-(--radius-card) bg-success-bg p-6 text-center text-success">
        <CircleCheck className="size-10" aria-hidden />
        <p className="text-lg font-bold">¡Gracias por tu consulta!</p>
        <p className="text-fg">Te vamos a responder a la brevedad.</p>
      </div>
    );
  }

  return (
    // key: al volver con errores, los campos se remontan con los valores enviados.
    <form key={JSON.stringify(v ?? {})} action={accion} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="agencyId" value={agencyId} />
      <input type="hidden" name="propertyId" value={propertyId} />
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
        {(a) => <Textarea {...a} name="mensaje" rows={4} maxLength={2000} defaultValue={v?.mensaje ?? MENSAJE_INICIAL} />}
      </Field>
      <Button type="submit" variant="brand" size="lg" fullWidth loading={enviando}>
        {!enviando && <Send className="size-5" aria-hidden />}
        {enviando ? "Enviando…" : "Enviar consulta"}
      </Button>
    </form>
  );
}
