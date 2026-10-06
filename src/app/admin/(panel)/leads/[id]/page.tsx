import { ArrowLeft, CalendarCheck, Footprints, Link2, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactoLead, NotasLead, SelectorEstado } from "@/components/admin/leads";
import { NivelBadge, ORIGEN_LABEL, Puntaje } from "@/components/admin/nivel";
import { Pagina, Panel } from "@/components/admin/ui";
import { getLeadDetalle } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { duracion, lineaDeTiempo } from "@/lib/previsita/linea-tiempo";
import { FORMA_PAGO_LABEL, FRANJAS, PLAZO_LABEL } from "@/lib/previsita/validacion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle del lead" };

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});
const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const lead = await getLeadDetalle(sesion.agencia.id, id);
  if (!lead) notFound();
  const visitas = lineaDeTiempo(lead.eventos);
  const pedido = lead.pedidos[0];

  return (
    <Pagina>
      <Link href="/admin/leads" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Leads
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{lead.nombre ?? (lead.codigo_ref ? `Ref. ${lead.codigo_ref}` : "Sin nombre")}</h1>
            <NivelBadge nivel={lead.nivel} />
          </div>
          <p className="mt-1 text-muted">
            {lead.codigo_ref && <span className="font-mono">Ref. {lead.codigo_ref} · </span>}
            {ORIGEN_LABEL[lead.origen]} · {lead.propiedad ? lead.propiedad.titulo : "Consulta general"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Puntaje score={lead.score} nivel={lead.nivel} />
          <SelectorEstado id={lead.id} estado={lead.estado} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-5">
          <Panel titulo="Contacto">
            <ContactoLead lead={lead} agencia={sesion.agencia.nombre} />
            {lead.mensaje && <p className="mt-3 rounded-xl bg-surface p-3 text-sm whitespace-pre-line">{lead.mensaje}</p>}
            {lead.consentimiento_at && (
              <p className="mt-2 text-xs text-muted">Aceptó el uso de sus datos el {fechaHora.format(new Date(lead.consentimiento_at))}.</p>
            )}
          </Panel>

          <Panel titulo="Actividad">
            {visitas.length === 0 ? (
              <p className="text-muted">
                {lead.link && !lead.link.abierto ? "Todavía no abrió el link de pre-visita." : "Sin actividad registrada en el sitio."}
              </p>
            ) : (
              <ol className="flex flex-col gap-5">
                {visitas.map((visita) => (
                  <li key={visita.inicio}>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Footprints className="size-4 text-brand-ink" aria-hidden />
                      Visita del {fechaHora.format(new Date(visita.inicio))}
                      {visita.segundos > 0 && <span className="font-normal text-muted">· {duracion(visita.segundos)} recorriendo</span>}
                    </p>
                    <ul className="ml-2 flex flex-col border-l-2 border-border pl-4">
                      {visita.items.map((item, i) => (
                        <li key={i} className={cn("py-1 text-sm", item.destacado && "font-semibold")}>
                          <span className="mr-2 font-mono text-xs text-muted">{hora.format(new Date(item.hora))}</span>
                          {item.texto}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel titulo="Por qué tiene este puntaje">
            {lead.score_detalle.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay señales de interés.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {lead.score_detalle.map((d) => (
                  <li key={d.clave} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Star className="size-4 shrink-0 text-brand-ink" aria-hidden /> {d.texto}
                    </span>
                    <span className="font-mono text-muted">+{d.puntos}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {pedido && (
            <Panel titulo="Pedido de visita">
              <p className="mb-3 flex items-center gap-2 text-sm text-muted">
                <CalendarCheck className="size-4" aria-hidden /> {fechaHora.format(new Date(pedido.created_at))}
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {pedido.forma_pago && (
                  <div>
                    <dt className="text-muted">Forma de pago</dt>
                    <dd className="font-semibold">{FORMA_PAGO_LABEL[pedido.forma_pago]}</dd>
                  </div>
                )}
                {pedido.plazo && (
                  <div>
                    <dt className="text-muted">Plazo</dt>
                    <dd className="font-semibold">{PLAZO_LABEL[pedido.plazo]}</dd>
                  </div>
                )}
                {pedido.necesita_vender !== null && (
                  <div>
                    <dt className="text-muted">Necesita vender</dt>
                    <dd className="font-semibold">{pedido.necesita_vender ? "Sí" : "No"}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Horario</dt>
                  <dd className="font-semibold">{FRANJAS[pedido.franja_preferida]}</dd>
                </div>
              </dl>
              {lead.pedidos.length > 1 && <p className="mt-3 text-xs text-muted">Pidió visita {lead.pedidos.length} veces.</p>}
            </Panel>
          )}

          {lead.link && (
            <Panel titulo="Link de pre-visita">
              <p className="flex items-center gap-2 text-sm">
                <Link2 className="size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>
                  Generado el {fechaHora.format(new Date(lead.link.created_at))}.{" "}
                  <strong>{lead.link.abierto ? "Lo abrió." : "Todavía no lo abrió."}</strong>
                </span>
              </p>
            </Panel>
          )}

          <Panel titulo="Notas">
            <NotasLead id={lead.id} notas={lead.notas} />
          </Panel>

          {lead.visitante?.utm_source && (
            <p className="text-xs text-muted">
              Llegó desde: {[lead.visitante.utm_source, lead.visitante.utm_medium, lead.visitante.utm_campaign].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Pagina>
  );
}
