import { ChevronLeft, ChevronRight, Download, Inbox, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GenerarLink, SelectorEstado } from "@/components/admin/leads";
import { NivelBadge, ORIGEN_LABEL, Puntaje, ESTADO_LABEL, NIVEL_LABEL } from "@/components/admin/nivel";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { getLeads, getOpcionesPropiedades, LEADS_POR_PAGINA, type FiltrosLeads } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { resumenPuntaje } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { Constants } from "@/types/database";

export const metadata: Metadata = { title: "Leads" };

const haceCuanto = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
function relativo(fecha: string) {
  const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60_000);
  if (min < 60) return haceCuanto.format(-min, "minute");
  if (min < 60 * 24) return haceCuanto.format(-Math.round(min / 60), "hour");
  return haceCuanto.format(-Math.round(min / 1440), "day");
}

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const uno = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const filtros: FiltrosLeads = {
    q: uno(sp.q)?.trim().slice(0, 60) || undefined,
    nivel: Constants.public.Enums.nivel_lead.find((n) => n === sp.nivel),
    estado: Constants.public.Enums.estado_lead.find((e) => e === sp.estado),
    propiedad: uno(sp.propiedad)?.match(/^[0-9a-f-]{36}$/i) ? uno(sp.propiedad) : undefined,
    pagina: Math.max(1, Number(sp.pagina) || 1),
  };
  const [{ leads, total }, propiedades] = await Promise.all([getLeads(sesion.agencia.id, filtros), getOpcionesPropiedades(sesion.agencia.id)]);
  const paginas = Math.max(1, Math.ceil(total / LEADS_POR_PAGINA));
  const href = (cambios: Partial<FiltrosLeads>) => {
    const f = { ...filtros, pagina: 1, ...cambios };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && !(k === "pagina" && v === 1)) params.set(k, String(v));
    const q = params.toString();
    return `/admin/leads${q ? `?${q}` : ""}`;
  };
  const exportar = `/admin/leads/exportar${filtros.nivel ? `?nivel=${filtros.nivel}` : ""}`;

  return (
    <Pagina>
      <Encabezado
        titulo="Leads"
        descripcion={`${total} ${total === 1 ? "interesado" : "interesados"}, del más caliente al más frío`}
        acciones={
          <>
            <GenerarLink propiedades={propiedades} />
            {total > 0 && (
              <a href={exportar} className={buttonStyles({ variant: "outline" })} download>
                <Download className="size-4" aria-hidden /> CSV
              </a>
            )}
          </>
        }
      />

      <form method="get" role="search" className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        {filtros.nivel && <input type="hidden" name="nivel" value={filtros.nivel} />}
        <label className="relative">
          <span className="sr-only">Buscar por código, nombre o teléfono</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" type="search" defaultValue={filtros.q} placeholder="Código (Ref. A7K2), nombre o teléfono" className="pl-10" />
        </label>
        <Select name="propiedad" defaultValue={filtros.propiedad ?? ""} aria-label="Propiedad" className="sm:w-56">
          <option value="">Todas las propiedades</option>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.titulo}
            </option>
          ))}
        </Select>
        <Select name="estado" defaultValue={filtros.estado ?? ""} aria-label="Estado" className="sm:w-44">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <nav aria-label="Nivel" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[undefined, ...Constants.public.Enums.nivel_lead.toReversed()].map((nivel) => (
          <Link
            key={nivel ?? "todos"}
            href={href({ nivel })}
            aria-current={nivel === filtros.nivel ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
              nivel === filtros.nivel ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
            )}
          >
            {nivel ? NIVEL_LABEL[nivel] : "Todos"}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden />}
          title={filtros.q || filtros.nivel || filtros.estado || filtros.propiedad ? "No hay leads con estos filtros" : "Todavía no hay leads"}
          description="Aparecen cuando alguien pide una visita, deja una consulta, toca WhatsApp o abre un link de pre-visita."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((lead) => (
            <li key={lead.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-(--radius-card) border border-border bg-bg p-4 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-focus">
              <Puntaje score={lead.score} nivel={lead.nivel} className="w-28 shrink-0" />
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/leads/${lead.id}`} className="font-semibold after:absolute after:inset-0 hover:underline focus-visible:outline-none">
                    {lead.nombre ?? (lead.codigo_ref ? `Ref. ${lead.codigo_ref}` : "Sin nombre")}
                  </Link>
                  <NivelBadge nivel={lead.nivel} />
                  {lead.codigo_ref && <span className="font-mono text-xs text-muted">Ref. {lead.codigo_ref}</span>}
                </div>
                <p className="truncate text-sm text-muted">
                  {lead.propiedad?.titulo ?? "Consulta general"} · {ORIGEN_LABEL[lead.origen]} · activo {relativo(lead.ultima_actividad)}
                </p>
                {lead.score_detalle.length > 0 && <p className="mt-1 truncate text-sm">{resumenPuntaje(lead.score_detalle)}</p>}
              </div>
              <div className="relative z-10">
                <SelectorEstado id={lead.id} estado={lead.estado} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-between">
          {filtros.pagina > 1 ? (
            <Link href={href({ pagina: filtros.pagina - 1 })} className={buttonStyles({ variant: "outline" })}>
              <ChevronLeft className="size-4" aria-hidden /> Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {filtros.pagina} de {paginas}
          </span>
          {filtros.pagina < paginas ? (
            <Link href={href({ pagina: filtros.pagina + 1 })} className={buttonStyles({ variant: "outline" })}>
              Siguientes <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </Pagina>
  );
}
