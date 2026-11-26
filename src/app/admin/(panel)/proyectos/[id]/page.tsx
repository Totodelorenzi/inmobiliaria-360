import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ImagenesProyecto, MarcadorZonas, UnidadesEstado } from "@/components/admin/proyecto";
import { TextosProyecto } from "@/components/admin/proyecto-landing";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { getProyectoAdmin } from "@/lib/admin/datos-proyecto";
import { requerirSesion } from "@/lib/admin/sesion";
import { rutaProyecto } from "@/lib/edificio";
import { urlEnSitio } from "@/lib/tenancy";

export const metadata: Metadata = { title: "Proyecto" };

const VISTAS = [
  { clave: "unidades", label: "Unidades" },
  { clave: "imagenes", label: "Imágenes" },
  { clave: "zonas", label: "Zonas" },
  { clave: "textos", label: "Textos" },
] as const;

export default async function ProyectoPage({ params, searchParams }: PageProps<"/admin/proyectos/[id]">) {
  const sesion = await requerirSesion();
  if (!sesion.agencia.modulos.includes("desarrolladora")) redirect("/admin");
  const [{ id }, { vista: pedida }] = await Promise.all([params, searchParams]);
  const proyecto = await getProyectoAdmin(sesion.agencia.id, id);
  if (!proyecto) notFound();
  const vista = VISTAS.find((v) => v.clave === pedida)?.clave ?? "unidades";

  return (
    <Pagina>
      <Encabezado
        titulo={proyecto.nombre}
        descripcion={proyecto.publicado ? "Publicado: los cambios se ven en la web al instante." : "Borrador: todavía no se ve en la web."}
        acciones={
          proyecto.publicado && (
            <a href={urlEnSitio(sesion.agencia, rutaProyecto(proyecto.slug))} target="_blank" className={buttonStyles({ variant: "outline" })}>
              <ExternalLink className="size-4" aria-hidden /> Ver en la web
            </a>
          )
        }
      />
      <nav aria-label="Secciones del proyecto" className="mb-5 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
        {VISTAS.map((v) => (
          <Link
            key={v.clave}
            href={`/admin/proyectos/${proyecto.id}?vista=${v.clave}`}
            aria-current={v.clave === vista ? "page" : undefined}
            className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-muted aria-[current=page]:bg-bg aria-[current=page]:text-fg aria-[current=page]:shadow-sm"
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {vista === "unidades" && <UnidadesEstado proyecto={proyecto} />}
      {vista === "imagenes" && <ImagenesProyecto proyecto={proyecto} />}
      {vista === "zonas" && <MarcadorZonas proyecto={proyecto} />}
      {vista === "textos" && <TextosProyecto proyecto={proyecto} />}
    </Pagina>
  );
}
