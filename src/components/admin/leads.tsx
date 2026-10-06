"use client";

import { Check, Copy, Link2, Mail, Phone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { eliminarLead } from "@/lib/admin/acciones-agencia";
import { actualizarLead, crearLinkPrevisita, type EstadoLink } from "@/lib/admin/acciones-leads";
import { telefonoWhatsapp, whatsappLink } from "@/lib/format";
import type { Enums } from "@/types/database";
import { BotonConfirmar, Hoja, MostrarAviso, useAccion } from "./acciones-ui";
import { ESTADO_LABEL } from "./nivel";

/** Estado del lead, editable en el lugar. */
export function SelectorEstado({ id, estado }: { id: string; estado: Enums<"estado_lead"> }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  return (
    <div className="flex flex-col gap-1">
      <Select
        defaultValue={estado}
        disabled={pendiente}
        aria-label="Estado del lead"
        className="w-auto"
        onChange={(e) => ejecutar(() => actualizarLead(id, { estado: e.target.value as Enums<"estado_lead"> }))}
      >
        {Object.entries(ESTADO_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </Select>
      {aviso?.tono === "error" && <MostrarAviso aviso={aviso} />}
    </div>
  );
}

export function NotasLead({ id, notas }: { id: string; notas: string | null }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  const [texto, setTexto] = useState(notas ?? "");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => actualizarLead(id, { notas: texto }));
      }}
    >
      <Field label="Notas internas" hint="Solo las ve el equipo. Ej.: “Llamar el lunes después de las 18”.">
        {(a) => <Textarea {...a} value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} maxLength={5000} />}
      </Field>
      <MostrarAviso aviso={aviso} />
      <Button type="submit" variant="outline" loading={pendiente} disabled={texto === (notas ?? "")} className="self-start">
        Guardar notas
      </Button>
    </form>
  );
}

/** Contactar al lead: WhatsApp con saludo listo, llamada y email. */
export function ContactoLead({
  lead,
  agencia,
}: {
  lead: { id: string; nombre: string | null; telefono: string | null; email: string | null; codigo_ref: string | null; propiedad: { titulo: string } | null };
  agencia: string;
}) {
  const { ejecutar } = useAccion();
  const router = useRouter();
  const saludo = `Hola${lead.nombre ? ` ${lead.nombre.split(" ")[0]}` : ""}, te escribo de ${agencia}${
    lead.propiedad ? ` por “${lead.propiedad.titulo}”` : ""
  }.`;
  return (
    <div className="flex flex-wrap gap-2">
      {lead.telefono && (
        <>
          <a href={whatsappLink(telefonoWhatsapp(lead.telefono), saludo)} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "whatsapp" })}>
            <WhatsappIcon className="size-5" /> WhatsApp
          </a>
          <a href={`tel:${lead.telefono.replace(/[^\d+]/g, "")}`} className={buttonStyles({ variant: "outline" })}>
            <Phone className="size-4" aria-hidden /> {lead.telefono}
          </a>
        </>
      )}
      {lead.email && (
        <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Tu consulta en ${agencia}`)}&body=${encodeURIComponent(saludo)}`} className={buttonStyles({ variant: "outline" })}>
          <Mail className="size-4" aria-hidden /> Email
        </a>
      )}
      {!lead.telefono && !lead.email && (
        <p className="text-sm text-muted">
          Sin datos de contacto todavía{lead.codigo_ref ? `: si escribe por WhatsApp, su mensaje trae “Ref. ${lead.codigo_ref}”` : ""}.
        </p>
      )}
      <BotonConfirmar
        variant="ghost"
        size="icon"
        aria-label="Eliminar lead"
        titulo="¿Eliminar este lead?"
        descripcion="Se borran sus datos y respuestas. Su recorrido anónimo queda sin asociar."
        onConfirmar={() => ejecutar(() => eliminarLead(lead.id), () => router.push("/admin/leads"))}
      >
        <Trash2 className="size-4 text-danger" aria-hidden />
      </BotonConfirmar>
    </div>
  );
}

type OpcionPropiedad = { id: string; titulo: string; publicada: boolean };

/** "Generar link de pre-visita": crea el link personalizado y lo copia o lo manda por WhatsApp. */
export function GenerarLink({ propiedades, propertyId, variant = "outline" }: { propiedades: OpcionPropiedad[]; propertyId?: string; variant?: "outline" | "brand" | "accent" }) {
  const [abierta, setAbierta] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoLink, FormData>(crearLinkPrevisita, { ok: false });
  const [copiado, setCopiado] = useState(false);
  const [intento, setIntento] = useState(0);
  const publicadas = propiedades.filter((p) => p.publicada);
  const link = estado.ok ? estado.link : undefined;
  const mensaje = link
    ? `¡Hola ${link.nombre.split(" ")[0]}! Te comparto la pre-visita de “${link.titulo}”: recorrela en 360° y mirá los planos desde el celular antes de visitarla. ${link.url}`
    : "";

  return (
    <>
      <Button variant={variant} onClick={() => (setAbierta(true), setIntento((n) => n + 1))}>
        <Link2 className="size-4" aria-hidden /> Generar link de pre-visita
      </Button>
      <Hoja titulo="Link de pre-visita" abierta={abierta} onCerrar={() => setAbierta(false)}>
        {link ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Cuando {link.nombre} lo abra, vas a ver en su ficha todo lo que recorre. Si después deja sus datos o pide visita, se une solo.
            </p>
            <p className="truncate rounded-xl bg-surface px-3 py-2 font-mono text-sm">{link.url}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(mensaje);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                }}
              >
                {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copiado ? "¡Copiado!" : "Copiar mensaje"}
              </Button>
              {link.telefono ? (
                <a href={whatsappLink(telefonoWhatsapp(link.telefono), mensaje)} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "whatsapp" })}>
                  <WhatsappIcon className="size-5" /> Abrir en WhatsApp
                </a>
              ) : (
                <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "whatsapp" })}>
                  <WhatsappIcon className="size-5" /> Elegir contacto en WhatsApp
                </a>
              )}
            </div>
            <a href={`/admin/leads/${link.leadId}`} className="text-center text-sm font-semibold text-brand-ink underline">
              Ver el lead
            </a>
          </div>
        ) : (
          <form key={intento} action={accion} className="flex flex-col gap-4">
            {estado.error && (
              <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger">
                {estado.error}
              </p>
            )}
            <Field label="Propiedad">
              {(a) => (
                <Select {...a} name="propertyId" defaultValue={propertyId ?? publicadas[0]?.id} required>
                  {publicadas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nombre del prospecto">
              {(a) => <Input {...a} name="nombre" required maxLength={120} placeholder="Laura Gómez" />}
            </Field>
            <Field label="Teléfono (opcional)" hint="Para abrir WhatsApp directo con su número.">
              {(a) => <Input {...a} name="telefono" type="tel" inputMode="tel" placeholder="11 2233-4455" />}
            </Field>
            <Button type="submit" variant="brand" loading={pendiente} disabled={publicadas.length === 0}>
              Generar link
            </Button>
            {publicadas.length === 0 && <p className="text-sm text-muted">Primero publicá una propiedad.</p>}
          </form>
        )}
      </Hoja>
    </>
  );
}
