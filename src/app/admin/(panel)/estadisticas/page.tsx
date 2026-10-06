import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GenerarLink } from "@/components/admin/leads";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { getEstadisticas, getOpcionesPropiedades } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { duracion } from "@/lib/previsita/linea-tiempo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Estadísticas" };

const PERIODOS = [7, 30, 90] as const;
const porcentaje = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 1 });

export default async function EstadisticasPage({ searchParams }: PageProps<"/admin/estadisticas">) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const dias = PERIODOS.find((d) => String(d) === sp.dias) ?? 30;
  const soloPropiedad = typeof sp.propiedad === "string" ? sp.propiedad : undefined;
  const [todas, opciones] = await Promise.all([getEstadisticas(sesion.agencia.id, dias), getOpcionesPropiedades(sesion.agencia.id)]);
  const filas = soloPropiedad ? todas.filter((p) => p.id === soloPropiedad) : todas;
  const totales = filas.reduce(
    (t, p) => ({ visitantes: t.visitantes + p.visitantes, toursCompletos: t.toursCompletos + p.toursCompletos, pedidos: t.pedidos + p.pedidos }),
    { visitantes: 0, toursCompletos: 0, pedidos: 0 },
  );
  const hrefPeriodo = (d: number) => `/admin/estadisticas?dias=${d}${soloPropiedad ? `&propiedad=${soloPropiedad}` : ""}`;

  return (
    <Pagina>
      <Encabezado
        titulo="Estadísticas"
        descripcion="Cómo se recorre cada propiedad y cuántos piden visita."
        acciones={<GenerarLink propiedades={opciones} propertyId={soloPropiedad} />}
      />
      <nav aria-label="Período" className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODOS.map((d) => (
          <Link
            key={d}
            href={hrefPeriodo(d)}
            aria-current={d === dias ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
              d === dias ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
            )}
          >
            Últimos {d} días
          </Link>
        ))}
        {soloPropiedad && (
          <Link href={`/admin/estadisticas?dias=${dias}`} className="ml-auto text-sm font-semibold text-brand-ink underline">
            Ver todas las propiedades
          </Link>
        )}
      </nav>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { valor: totales.visitantes, texto: "visitantes" },
          { valor: totales.toursCompletos, texto: "tours completos" },
          { valor: totales.pedidos, texto: "pedidos de visita" },
        ].map((t) => (
          <div key={t.texto} className="rounded-(--radius-card) border border-border bg-bg p-4">
            <p className="font-display text-3xl font-bold tabular-nums">{t.valor}</p>
            <p className="text-sm text-muted">{t.texto}</p>
          </div>
        ))}
      </div>

      {filas.every((p) => p.vistas === 0) ? (
        <EmptyState icon={<ChartColumn aria-hidden />} title="Todavía no hay visitas en este período" description="Compartí tus propiedades o generá links de pre-visita para empezar a medir." />
      ) : (
        <ul className="flex flex-col gap-3">
          {filas.map((p) => (
            <li key={p.id} className="rounded-(--radius-card) border border-border bg-bg p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Link href={`/admin/propiedades/${p.id}`} className="font-semibold hover:underline">
                  {p.titulo}
                </Link>
                {!p.publicada && <Badge tone="warning">Borrador</Badge>}
                <Link href={`/admin/leads?propiedad=${p.id}`} className="ml-auto text-sm font-semibold text-brand-ink underline">
                  Ver leads
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                {[
                  ["Vistas", String(p.vistas)],
                  ["Visitantes", String(p.visitantes)],
                  ["Tours iniciados", String(p.toursIniciados)],
                  ["Tours completos", String(p.toursCompletos)],
                  ["Tiempo promedio en el tour", p.segundosTour > 0 ? duracion(p.segundosTour) : "—"],
                  ["Vieron los planos", String(p.vieronPlanos)],
                  ["Pedidos de visita", String(p.pedidos)],
                  ["Conversión", p.visitantes > 0 ? porcentaje.format(p.conversion) : "—"],
                ].map(([label, valor]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-display text-lg font-bold tabular-nums">{valor}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">Conversión = pedidos de visita / visitantes de la ficha en el período.</p>
    </Pagina>
  );
}
