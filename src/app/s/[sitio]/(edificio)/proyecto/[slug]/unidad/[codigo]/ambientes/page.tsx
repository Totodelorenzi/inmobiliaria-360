import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Ambientes } from "@/components/edificio/ambientes";
import { buscarUnidad, getProyecto } from "@/lib/data/proyecto";
import { getAgencia } from "@/lib/data/sitio";
import { rutaUnidad } from "@/lib/edificio";

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

type Ruta = PageProps<"/s/[sitio]/proyecto/[slug]/unidad/[codigo]/ambientes">;

async function cargar(params: Ruta["params"]) {
  const { sitio, slug, codigo } = await params;
  const agencia = await getAgencia(sitio);
  const proyecto = agencia ? await getProyecto(agencia.id, slug) : null;
  const encontrada = proyecto ? buscarUnidad(proyecto, codigo) : null;
  // Sin renders cargados en la tipología, el recorrido de ambientes no existe.
  return { proyecto, encontrada: encontrada && encontrada.tipologia.renders.length > 0 ? encontrada : null };
}

export async function generateMetadata({ params }: Ruta): Promise<Metadata> {
  const { proyecto, encontrada } = await cargar(params);
  if (!proyecto || !encontrada) return { title: "Ambientes no encontrados" };
  return {
    title: `Ambientes de la unidad ${encontrada.unidad.codigo} · ${proyecto.nombre}`,
    description: `Recorré los ambientes de la unidad ${encontrada.unidad.codigo}: ${encontrada.tipologia.renders.map((r) => r.nombre).join(", ")}.`.slice(0, 160),
  };
}

export default async function AmbientesPage({ params }: Ruta) {
  const { proyecto, encontrada } = await cargar(params);
  if (!proyecto || !encontrada) notFound();
  const { unidad, tipologia } = encontrada;
  preload(tipologia.renders[0].render_url, { as: "image", fetchPriority: "high" });
  return (
    <Ambientes
      titulo={`Unidad ${unidad.codigo} · ${proyecto.nombre}`}
      volverA={rutaUnidad(proyecto.slug, unidad.codigo)}
      ambientes={tipologia.renders}
      espejada={unidad.espejada}
      rastreo={{ projectId: proyecto.id, unitId: unidad.id }}
    />
  );
}
