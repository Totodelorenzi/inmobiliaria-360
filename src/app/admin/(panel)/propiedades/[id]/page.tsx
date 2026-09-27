import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PasoDatos } from "@/components/admin/paso-datos";
import { PasoFotos } from "@/components/admin/paso-fotos";
import { PasoPlanos } from "@/components/admin/paso-planos";
import { PasoPublicar } from "@/components/admin/paso-publicar";
import { PasoTour } from "@/components/admin/paso-tour";
import { Aviso, Pagina } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getPropiedadEditor } from "@/lib/admin/datos";
import { requisitosPublicacion, TITULO_BORRADOR } from "@/lib/admin/propiedad";
import { requerirSesion } from "@/lib/admin/sesion";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar propiedad" };

const PASOS = [
  { id: "datos", titulo: "Datos" },
  { id: "fotos", titulo: "Fotos" },
  { id: "tour", titulo: "Tour 360°" },
  { id: "planos", titulo: "Planos" },
  { id: "publicar", titulo: "Publicar" },
] as const;

type Paso = (typeof PASOS)[number]["id"];

export default async function EditorPropiedad({ params, searchParams }: PageProps<"/admin/propiedades/[id]">) {
  const sesion = await requerirSesion();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await getPropiedadEditor(id);
  if (!p || p.agency_id !== sesion.agencia.id) notFound();

  const paso: Paso = PASOS.find((x) => x.id === sp.paso)?.id ?? "datos";
  const indice = PASOS.findIndex((x) => x.id === paso);
  const requisitos = requisitosPublicacion({
    ...p,
    fotos: p.fotos.length,
    escenas: p.escenas.length,
    planos: p.planos.length,
  });
  const pasoDe = (texto: string): Paso =>
    /foto/i.test(texto) ? "fotos" : /tour/i.test(texto) ? "tour" : /plano/i.test(texto) ? "planos" : "datos";
  const completo: Record<Paso, boolean> = {
    datos: p.titulo !== TITULO_BORRADOR && Boolean(p.barrio || p.ciudad),
    fotos: p.fotos.length > 0,
    tour: p.escenas.length > 0,
    planos: p.planos.length > 0,
    publicar: p.publicada,
  };
  const url = `${getSiteUrl()}/propiedad/${p.slug}`;

  return (
    <Pagina>
      <Link href="/admin/propiedades" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Propiedades
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold sm:text-3xl">{p.titulo === TITULO_BORRADOR ? "Nueva propiedad" : p.titulo}</h1>
        {p.publicada ? <Badge tone="success">Publicada</Badge> : <Badge tone="warning">Borrador</Badge>}
        {p.publicada && (
          <a href={url} target="_blank" className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Ver en la web (se abre en otra pestaña)">
            <ExternalLink className="size-5" aria-hidden />
          </a>
        )}
      </div>
      {sp.aviso === "duplicada" && (
        <div className="mb-4">
          <Aviso tono="ok">Propiedad duplicada como borrador. Cambiá lo que haga falta y publicala.</Aviso>
        </div>
      )}

      <nav aria-label="Pasos" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-2">
          {PASOS.map((x, i) => (
            <li key={x.id}>
              <Link
                href={`?paso=${x.id}`}
                aria-current={x.id === paso ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border px-3 pr-4 text-sm font-semibold",
                  x.id === paso ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs",
                    x.id === paso ? "bg-white/25" : completo[x.id] ? "bg-success-bg text-success" : "bg-surface",
                  )}
                >
                  {completo[x.id] && x.id !== paso ? <Check className="size-3.5" aria-label="completo" /> : i + 1}
                </span>
                {x.titulo}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {paso === "datos" && <PasoDatos propiedad={p} />}
      {paso === "fotos" && <PasoFotos propertyId={p.id} agencyId={p.agency_id} fotos={p.fotos} />}
      {paso === "tour" && <PasoTour propertyId={p.id} agencyId={p.agency_id} escenas={p.escenas} />}
      {paso === "planos" && (
        <PasoPlanos propertyId={p.id} agencyId={p.agency_id} planos={p.planos} escenas={p.escenas.map(({ id, nombre_ambiente }) => ({ id, nombre_ambiente }))} />
      )}
      {paso === "publicar" && (
        <PasoPublicar
          propertyId={p.id}
          publicada={p.publicada}
          url={url}
          titulo={p.titulo}
          requisitos={requisitos.map((r) => ({ ...r, paso: pasoDe(r.texto) }))}
        />
      )}

      <div className="mt-8 flex justify-between gap-3">
        {indice > 0 ? (
          <Link href={`?paso=${PASOS[indice - 1].id}`} className={buttonStyles({ variant: "outline" })}>
            <ArrowLeft className="size-4" aria-hidden /> {PASOS[indice - 1].titulo}
          </Link>
        ) : (
          <span />
        )}
        {indice < PASOS.length - 1 && (
          <Link href={`?paso=${PASOS[indice + 1].id}`} className={buttonStyles({ variant: "brand" })}>
            {PASOS[indice + 1].titulo} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </Pagina>
  );
}
