import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaLeads, type LeadFila } from "@/components/admin/leads-lista";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getLeads, LEADS_POR_PAGINA } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Consultas" };

const FILTROS = [
  { valor: undefined, texto: "Todas" },
  { valor: "formulario", texto: "Formulario" },
  { valor: "whatsapp_click", texto: "WhatsApp" },
] as const;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const origen = sp.origen === "formulario" || sp.origen === "whatsapp_click" ? sp.origen : undefined;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const { leads, total } = await getLeads(sesion.agencia.id, { origen, pagina });
  const paginas = Math.max(1, Math.ceil(total / LEADS_POR_PAGINA));
  const href = (cambios: { origen?: string; pagina?: number }) => {
    const params = new URLSearchParams();
    const o = "origen" in cambios ? cambios.origen : origen;
    if (o) params.set("origen", o);
    if (cambios.pagina && cambios.pagina > 1) params.set("pagina", String(cambios.pagina));
    const q = params.toString();
    return `/admin/leads${q ? `?${q}` : ""}`;
  };

  return (
    <Pagina>
      <Encabezado
        titulo="Consultas"
        descripcion={`${total} ${total === 1 ? "consulta" : "consultas"}`}
        acciones={
          total > 0 && (
            <a href={`/admin/leads/exportar${origen ? `?origen=${origen}` : ""}`} className={buttonStyles({ variant: "outline" })} download>
              <Download className="size-4" aria-hidden /> Exportar a Excel (CSV)
            </a>
          )
        }
      />
      <nav aria-label="Origen" className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.texto}
            href={href({ origen: f.valor })}
            aria-current={f.valor === origen ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
              f.valor === origen ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
            )}
          >
            {f.texto}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <EmptyState icon={<Inbox aria-hidden />} title="No hay consultas" description="Cuando alguien complete el formulario o toque “Consultar por WhatsApp” en la web, aparece acá." />
      ) : (
        <ListaLeads leads={leads as LeadFila[]} agencia={sesion.agencia.nombre} />
      )}

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-between">
          {pagina > 1 ? (
            <Link href={href({ pagina: pagina - 1 })} className={buttonStyles({ variant: "outline" })}>
              <ChevronLeft className="size-4" aria-hidden /> Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={href({ pagina: pagina + 1 })} className={buttonStyles({ variant: "outline" })}>
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
