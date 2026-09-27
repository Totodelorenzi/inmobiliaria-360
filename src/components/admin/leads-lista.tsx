"use client";

import { Mail, Phone, Trash2 } from "lucide-react";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { eliminarLead } from "@/lib/admin/acciones-agencia";
import { telefonoWhatsapp, whatsappLink } from "@/lib/format";
import { BotonConfirmar, MostrarAviso, useAccion } from "./acciones-ui";

export type LeadFila = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  mensaje: string | null;
  origen: "formulario" | "whatsapp_click";
  created_at: string;
  propiedad: { titulo: string; slug: string } | null;
};

const cuando = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function ListaLeads({ leads, agencia }: { leads: LeadFila[]; agencia: string }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  return (
    <div className="flex flex-col gap-3">
      <MostrarAviso aviso={aviso} />
      <ul className="flex flex-col gap-3" aria-busy={pendiente}>
        {leads.map((lead) => {
          const saludo = `Hola${lead.nombre ? ` ${lead.nombre.split(" ")[0]}` : ""}, te escribo de ${agencia} por tu consulta${lead.propiedad ? ` sobre “${lead.propiedad.titulo}”` : ""}.`;
          return (
            <li key={lead.id} className="rounded-(--radius-card) border border-border bg-bg p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {lead.nombre ?? (lead.origen === "whatsapp_click" ? "Alguien tocó “Consultar por WhatsApp”" : "Sin nombre")}
                  </p>
                  <p className="text-sm text-muted">
                    {cuando.format(new Date(lead.created_at))} ·{" "}
                    {lead.propiedad ? (
                      <a href={`/propiedad/${lead.propiedad.slug}`} target="_blank" className="underline">
                        {lead.propiedad.titulo}
                      </a>
                    ) : (
                      "Consulta general"
                    )}
                  </p>
                </div>
                <Badge tone={lead.origen === "formulario" ? "brand" : "success"}>{lead.origen === "formulario" ? "Formulario" : "WhatsApp"}</Badge>
              </div>
              {lead.mensaje && <p className="mt-3 rounded-xl bg-surface p-3 text-sm whitespace-pre-line">{lead.mensaje}</p>}
              {lead.origen === "whatsapp_click" && !lead.telefono && (
                <p className="mt-2 text-sm text-muted">La conversación sigue en el WhatsApp de la inmobiliaria.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {lead.telefono && (
                  <>
                    <a href={whatsappLink(telefonoWhatsapp(lead.telefono), saludo)} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "whatsapp" })}>
                      <WhatsappIcon className="size-5" /> Responder por WhatsApp
                    </a>
                    <a href={`tel:${lead.telefono.replace(/[^\d+]/g, "")}`} className={buttonStyles({ variant: "outline" })}>
                      <Phone className="size-4" aria-hidden /> {lead.telefono}
                    </a>
                  </>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Tu consulta en ${agencia}`)}&body=${encodeURIComponent(saludo)}`} className={buttonStyles({ variant: "outline" })}>
                    <Mail className="size-4" aria-hidden /> {lead.email}
                  </a>
                )}
                <BotonConfirmar
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label="Eliminar consulta"
                  titulo="¿Eliminar esta consulta?"
                  onConfirmar={() => ejecutar(() => eliminarLead(lead.id))}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden />
                </BotonConfirmar>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
