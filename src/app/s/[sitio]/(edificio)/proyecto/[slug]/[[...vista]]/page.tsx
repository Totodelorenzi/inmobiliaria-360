import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Experiencia } from "@/components/edificio/experiencia";
import { CreditoPlataforma } from "@/components/sitio/site-footer";
import { getProyecto, type Proyecto } from "@/lib/data/proyecto";
import { getAgencia } from "@/lib/data/sitio";
import {
  buscarEspacio,
  buscarUnidad,
  detallePiso,
  ESTADO_UNIDAD_LABEL,
  leerVista,
  metrosUnidad,
  nombrePiso,
  nombreUnidad,
  precioUnidad,
  rutaProyecto,
  rutaVista,
  vistaExiste,
  type Vista,
} from "@/lib/edificio";
import { urlEnSitio } from "@/lib/tenancy";

export const revalidate = 3600;

// Cada paso se genera al primer pedido y queda cacheado (ISR); el panel invalida el sitio al cambiar algo.
export function generateStaticParams() {
  return [];
}

type Ruta = PageProps<"/s/[sitio]/proyecto/[slug]/[[...vista]]">;

async function cargar(params: Ruta["params"]) {
  const { sitio, slug, vista: segmentos } = await params;
  const agencia = await getAgencia(sitio);
  const proyecto = agencia ? await getProyecto(agencia.id, slug) : null;
  const vista = leerVista(segmentos ?? []);
  return { agencia, proyecto, vista: proyecto && vista && vistaExiste(proyecto, vista) ? vista : null };
}

/** Título, descripción e imagen de cada paso: lo que muestra WhatsApp al compartirlo. */
function resumen(p: Proyecto, v: Vista): { titulo: string; descripcion: string; imagen?: string } {
  const fachada = p.vistas[0]?.url;
  const lugar = [p.nombre, p.ciudad].filter(Boolean).join(" · ");
  if (v.tipo === "piso") {
    const piso = p.pisos.find((x) => x.numero === v.numero)!;
    const detalle = detallePiso(
      p.unidades.filter((u) => u.floor_id === piso.id),
      p.espacios.filter((e) => e.floor_id === piso.id),
    );
    return { titulo: `${nombrePiso(piso.numero)} · ${p.nombre}`, descripcion: `${detalle ? `${detalle}. ` : ""}Elegí en la planta y mirá cada unidad.`, imagen: fachada };
  }
  if (v.tipo === "espacio") {
    const { espacio } = buscarEspacio(p, v.numero, v.espacio)!;
    return { titulo: `${espacio.nombre} · ${p.nombre}`, descripcion: espacio.descripcion ?? `Amenities de ${p.nombre}.`, imagen: espacio.imagenes[0]?.url ?? fachada };
  }
  if (v.tipo === "unidad" || v.tipo === "imagenes") {
    const { unidad, tipologia } = buscarUnidad(p, v.codigo)!;
    const datos = [tipologia.nombre, metrosUnidad(unidad), unidad.orientacion, precioUnidad(unidad) === "Consultar" ? null : precioUnidad(unidad), ESTADO_UNIDAD_LABEL[unidad.estado]].filter(Boolean);
    return { titulo: `${nombreUnidad(unidad)} · ${p.nombre}`, descripcion: datos.join(" · "), imagen: tipologia.renders[0]?.url ?? tipologia.maqueta?.url ?? fachada };
  }
  return { titulo: lugar, descripcion: (p.descripcion ?? `Conocé ${p.nombre}: elegí un piso, mirá cada unidad y sus imágenes.`).slice(0, 160), imagen: fachada };
}

export async function generateMetadata({ params }: Ruta): Promise<Metadata> {
  const { agencia, proyecto, vista } = await cargar(params);
  if (!agencia || !proyecto || !vista) return { title: "Proyecto no encontrado" };
  const { titulo, descripcion, imagen } = resumen(proyecto, vista);
  // La galería comparte la dirección canónica de su unidad.
  const canonica = urlEnSitio(agencia, rutaVista(proyecto.slug, vista.tipo === "imagenes" ? { tipo: "unidad", codigo: vista.codigo } : vista));
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: canonica },
    openGraph: { type: "website", url: canonica, title: titulo, description: descripcion, ...(imagen && { images: [imagen] }) },
  };
}

export default async function ProyectoPage({ params }: Ruta) {
  const { agencia, proyecto, vista } = await cargar(params);
  if (!agencia || !proyecto || !vista) notFound();

  // Lo primero que se ve se pide desde el <head>: la fachada o, si se entra directo, la planta o la maqueta.
  const unidad = vista.tipo === "unidad" || vista.tipo === "imagenes" ? buscarUnidad(proyecto, vista.codigo) : null;
  const piso = vista.tipo === "piso" || vista.tipo === "espacio" ? proyecto.pisos.find((p) => p.numero === vista.numero) : unidad?.piso;
  const principal = unidad?.tipologia.maqueta?.url ?? piso?.planta?.url ?? proyecto.vistas[0]?.url;
  if (principal) preload(principal, { as: "image", fetchPriority: "high" });

  return (
    <Experiencia
      proyecto={proyecto}
      agencia={{ id: agencia.id, nombre: agencia.nombre, logo: agencia.logo_url, whatsapp: agencia.whatsapp }}
      inicial={vista}
      base={rutaProyecto(proyecto.slug)}
      urlPublica={urlEnSitio(agencia, rutaProyecto(proyecto.slug))}
      credito={<CreditoPlataforma />}
    />
  );
}
