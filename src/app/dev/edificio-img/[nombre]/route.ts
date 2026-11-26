import { CAMARAS, svgFachada, svgMaqueta, svgMaquetaCochera, svgPlanta } from "../../../../../scripts/seed/mirador/dibujos.ts";
import { ESPACIOS, TIPOLOGIAS, type ClavePlanta } from "../../../../../scripts/seed/mirador/edificio.ts";
import { svgRenderDePrueba } from "../../../../../scripts/seed/mirador/fixture.ts";

/** Dibujos del entorno de prueba local (solo en desarrollo). */
export async function GET(_: Request, { params }: RouteContext<"/dev/edificio-img/[nombre]">) {
  if (process.env.NODE_ENV !== "development") return new Response("No encontrado", { status: 404 });
  const nombre = (await params).nombre.replace(/\.svg$/, "");
  let svg: string | null = null;
  const fachada = nombre.match(/^fachada-(\d)$/);
  if (fachada) svg = svgFachada(CAMARAS[Number(fachada[1]) - 1]).svg;
  else if (nombre.startsWith("planta-")) svg = svgPlanta(nombre.slice(7) as ClavePlanta);
  else if (nombre === "maqueta-cochera") svg = svgMaquetaCochera().svg;
  else if (nombre.startsWith("maqueta-")) {
    const t = TIPOLOGIAS.find((x) => x.clave === nombre.slice(8));
    if (t) svg = svgMaqueta(t).svg;
  } else if (nombre.startsWith("render-")) {
    const [, clave, i] = nombre.match(/^render-(.+)-(\d+)$/) ?? [];
    const t = TIPOLOGIAS.find((x) => x.clave === clave);
    const e = ESPACIOS.find((x) => x.slug === clave);
    const titulo = t?.renders[Number(i)]?.nombre ?? e?.imagenes[Number(i)]?.nombre;
    if (titulo) svg = svgRenderDePrueba(titulo);
  }
  return svg ? new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } }) : new Response("No encontrado", { status: 404 });
}
