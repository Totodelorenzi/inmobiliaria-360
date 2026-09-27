import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/states";
import { getAgencia, getBarrios, getListado } from "@/lib/data/sitio";
import { filtrosAQuery, parseFiltros, POR_PAGINA, type Filtros, type Modo } from "@/lib/filtros";
import { FiltrosListado, SelectorOrden } from "./filtros";
import { GrillaPropiedades } from "./secciones";

export const TITULO_MODO: Record<Modo, string> = {
  alquiler: "Propiedades en alquiler",
  venta: "Propiedades en venta",
  emprendimientos: "Emprendimientos en pozo y en construcción",
};

type SearchParams = Record<string, string | string[] | undefined>;

export async function Listado({ modo, searchParams }: { modo: Modo; searchParams: Promise<SearchParams> }) {
  // searchParams primero: la ruta queda dinámica aunque se compile sin Supabase configurado.
  const filtros = parseFiltros(await searchParams, modo);
  const agencia = await getAgencia();
  if (!agencia) return null;
  const [{ items, total }, barrios] = await Promise.all([
    getListado(agencia.id, modo, filtros),
    getBarrios(agencia.id, modo),
  ]);

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">{TITULO_MODO[modo]}</h1>
      <p className="mt-1 mb-5 text-muted" aria-live="polite">
        {total === 0 ? "Sin resultados" : `${total} ${total === 1 ? "propiedad" : "propiedades"}`}
      </p>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-8">
        <FiltrosListado key={filtrosAQuery(filtros, modo)} modo={modo} filtros={filtros} barrios={barrios} total={total} />
        <div className="flex flex-col gap-6">
          <div className="hidden justify-end lg:flex">
            <SelectorOrden filtros={filtros} modo={modo} />
          </div>
          {items.length > 0 ? (
            <GrillaPropiedades items={items} />
          ) : (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title="No encontramos propiedades con esos filtros"
              description="Probá sacando algún filtro o buscando otro barrio."
              action={
                <Link href={`/${modo}`} className={buttonStyles({ variant: "outline" })}>
                  Ver todas
                </Link>
              }
            />
          )}
          <Paginacion modo={modo} filtros={filtros} total={total} />
        </div>
      </div>
    </Container>
  );
}

function Paginacion({ modo, filtros, total }: { modo: Modo; filtros: Filtros; total: number }) {
  const paginas = Math.ceil(total / POR_PAGINA);
  if (paginas <= 1) return null;
  const href = (pagina: number) => `/${modo}${filtrosAQuery(filtros, modo, { pagina })}`;
  const actual = Math.min(filtros.pagina, paginas);
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-2">
      {actual > 1 ? (
        <Link href={href(actual - 1)} className={buttonStyles({ variant: "outline" })} rel="prev">
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Página {actual} de {paginas}
      </span>
      {actual < paginas ? (
        <Link href={href(actual + 1)} className={buttonStyles({ variant: "outline" })} rel="next">
          Siguiente <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
