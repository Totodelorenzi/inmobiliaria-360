import { Building, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { getProyectosAdmin } from "@/lib/admin/datos-proyecto";
import { requerirSesion } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProyectosPage() {
  const sesion = await requerirSesion();
  if (!sesion.agencia.modulos.includes("desarrolladora")) redirect("/admin");
  const proyectos = await getProyectosAdmin(sesion.agencia.id);
  // Con un solo proyecto se entra directo.
  if (proyectos.length === 1) redirect(`/admin/proyectos/${proyectos[0].id}`);

  return (
    <Pagina>
      <Encabezado titulo="Proyectos" descripcion="Tus edificios: estado de cada unidad, imágenes y zonas tocables." />
      {proyectos.length === 0 ? (
        <EmptyState icon={<Building aria-hidden />} title="Todavía no hay proyectos" description="Pedinos que carguemos tu edificio y lo vas a ver acá." />
      ) : (
        <ul className="flex flex-col gap-2">
          {proyectos.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/proyectos/${p.id}`} className="flex min-h-16 items-center gap-3 rounded-(--radius-card) border border-border bg-bg px-4 hover:bg-surface">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  <span className="block text-sm text-muted">
                    {[p.ciudad, `${p.unidades.filter((u) => u.estado === "disponible").length} de ${p.unidades.length} disponibles`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Badge tone={p.publicado ? "success" : "neutral"}>{p.publicado ? "Publicado" : "Borrador"}</Badge>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
