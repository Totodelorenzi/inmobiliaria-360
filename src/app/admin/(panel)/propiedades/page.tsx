import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaPropiedades } from "@/components/admin/propiedades-lista";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { crearBorrador } from "@/lib/admin/acciones";
import { getPropiedadesAdmin, type FiltroEstado } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Propiedades" };

const ESTADOS: { valor: FiltroEstado; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "publicadas", texto: "Publicadas" },
  { valor: "borradores", texto: "Borradores" },
  { valor: "destacadas", texto: "Destacadas" },
];

export default async function PropiedadesPage({ searchParams }: PageProps<"/admin/propiedades">) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const estado = ESTADOS.find((e) => e.valor === sp.estado)?.valor ?? "todas";
  const operacion = sp.operacion === "alquiler" || sp.operacion === "venta" ? sp.operacion : undefined;
  const propiedades = await getPropiedadesAdmin(sesion.agencia.id, { q, estado, operacion });
  const conFiltros = Boolean(q || operacion || estado !== "todas");

  const hrefEstado = (valor: FiltroEstado) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (operacion) params.set("operacion", operacion);
    if (valor !== "todas") params.set("estado", valor);
    const query = params.toString();
    return `/admin/propiedades${query ? `?${query}` : ""}`;
  };

  return (
    <Pagina>
      <Encabezado
        titulo="Propiedades"
        descripcion={`${propiedades.length} ${propiedades.length === 1 ? "propiedad" : "propiedades"}${conFiltros ? " con estos filtros" : ""}`}
        acciones={
          <form action={crearBorrador}>
            <Button type="submit" variant="accent">
              <Plus className="size-5" aria-hidden /> Cargar propiedad
            </Button>
          </form>
        }
      />

      <form method="get" role="search" className="mb-3 flex gap-2">
        {estado !== "todas" && <input type="hidden" name="estado" value={estado} />}
        <label className="relative flex-1">
          <span className="sr-only">Buscar por título</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" type="search" defaultValue={q} placeholder="Buscar por título" className="pl-10" />
        </label>
        <Select name="operacion" defaultValue={operacion ?? ""} aria-label="Operación" className="w-auto">
          <option value="">Todas</option>
          <option value="alquiler">Alquiler</option>
          <option value="venta">Venta</option>
        </Select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <nav aria-label="Estado" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {ESTADOS.map((e) => (
          <Link
            key={e.valor}
            href={hrefEstado(e.valor)}
            aria-current={e.valor === estado ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
              e.valor === estado ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
            )}
          >
            {e.texto}
          </Link>
        ))}
      </nav>

      {propiedades.length > 0 ? (
        <ListaPropiedades propiedades={propiedades} />
      ) : (
        <EmptyState
          title={conFiltros ? "No hay propiedades con estos filtros" : "Todavía no cargaste propiedades"}
          description={conFiltros ? "Probá con otra búsqueda." : "Cargá la primera: con fotos 360° o planos ya podés salir a ofrecerla."}
          action={
            conFiltros ? (
              <Link href="/admin/propiedades" className="font-semibold text-brand-ink underline">
                Ver todas
              </Link>
            ) : (
              <form action={crearBorrador}>
                <Button type="submit" variant="accent">
                  <Plus className="size-5" aria-hidden /> Cargar propiedad
                </Button>
              </form>
            )
          }
        />
      )}
    </Pagina>
  );
}
