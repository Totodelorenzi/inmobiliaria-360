/**
 * El Edificio Mirador armado en memoria con la misma forma que devuelve `getProyecto`, para el
 * entorno de prueba local (/dev/edificio, solo en desarrollo): se ve la experiencia sin base de datos.
 */
import type { Proyecto } from "@/lib/data/proyecto";
import { CAMARAS, enPlanta, FACHADA, FONDO, PLANTA, puntoEnPlanta, svgFachada, svgMaqueta, svgMaquetaCochera } from "./dibujos.ts";
import { CONSULTAR, ESPACIOS, ESTADOS, PISOS, PROYECTO, precioUnidad, TIPOLOGIAS, UNIDADES } from "./edificio.ts";

/** UUID estable a partir de un texto (los ids no importan, pero tienen que tener formato válido). */
function id(texto: string) {
  let h = 2166136261;
  const hex: string[] = [];
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    for (const c of `${vuelta}:${texto}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    hex.push(h.toString(16).padStart(8, "0"));
  }
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-8${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

/** `imagen(nombre)` da la URL de cada dibujo (en el entorno local, una ruta que los genera). */
export function proyectoDePrueba(imagen: (nombre: string) => string): Proyecto {
  const zonas = CAMARAS.map((c) => svgFachada(c).zonas);
  const tipoDe = (clave: string) => TIPOLOGIAS.find((t) => t.clave === clave);
  return {
    id: id("proyecto"),
    slug: PROYECTO.slug,
    nombre: PROYECTO.nombre,
    ciudad: PROYECTO.ciudad,
    direccion: PROYECTO.direccion,
    descripcion: PROYECTO.descripcion,
    sobre_titulo: PROYECTO.sobreTitulo,
    sobre_texto: PROYECTO.sobreTexto,
    entrega: PROYECTO.entrega,
    color_fondo: FONDO,
    amenities: PROYECTO.amenities,
    transicion: "fundido",
    secuencia: null,
    vistas: [
      { url: imagen("fachada-1"), ancho: FACHADA.ancho, alto: FACHADA.alto, nombre: PROYECTO.vista1 },
      { url: imagen("fachada-2"), ancho: FACHADA.ancho, alto: FACHADA.alto, nombre: PROYECTO.vista2 },
    ],
    pisos: PISOS.map((p) => ({
      id: id(`piso:${p.numero}`),
      numero: p.numero,
      nombre: p.nombre,
      planta: { url: imagen(`planta-${p.planta}`), ancho: PLANTA.ancho, alto: PLANTA.alto },
      poligonos: [zonas[0][p.numero] ?? null, zonas[1][p.numero] ?? null],
    })),
    tipologias: (TIPOLOGIAS.map((t) => {
      const { ancho, alto } = svgMaqueta(t);
      return {
        id: id(`tipo:${t.clave}`),
        nombre: t.nombre,
        ambientes: t.ambientes,
        dormitorios: t.dormitorios,
        banos: t.banos,
        maqueta: { url: imagen(`maqueta-${t.clave}`), ancho, alto },
        renders: t.renders.map((r, i) => ({ id: id(`render:${t.clave}:${i}`), nombre: r.nombre, url: imagen(`render-${t.clave}-${i}`) })),
      };
    }) as Proyecto["tipologias"]).concat([{ id: id("tipo:cochera"), nombre: "Cochera", ambientes: null, dormitorios: null, banos: null, maqueta: { url: imagen("maqueta-cochera"), ancho: svgMaquetaCochera().ancho, alto: svgMaquetaCochera().alto }, renders: [] }]),
    unidades: UNIDADES.map((u) => ({
      id: id(`unidad:${u.codigo}`),
      floor_id: id(`piso:${u.piso}`),
      unit_type_id: id(`tipo:${tipoDe(u.tipo) ? u.tipo : "cochera"}`),
      codigo: u.codigo,
      categoria: u.categoria,
      operacion: u.operacion,
      superficie_cubierta: u.cubierta,
      superficie_total: u.total,
      orientacion: u.orientacion || null,
      precio: CONSULTAR.has(u.codigo) ? null : precioUnidad(u),
      moneda: "USD",
      estado: ESTADOS[u.codigo] ?? "disponible",
      espejada: u.espejada,
      poligono: enPlanta(u.forma),
    })),
    espacios: ESPACIOS.map((e, orden) => ({
      id: id(`espacio:${e.slug}`),
      floor_id: id(`piso:${e.piso}`),
      nombre: e.nombre,
      slug: e.slug,
      descripcion: e.descripcion,
      punto: puntoEnPlanta(e.punto),
      imagenes: e.imagenes.map((x, i) => ({ id: id(`img:${e.slug}:${i}:${orden}`), nombre: x.nombre, url: imagen(`render-${e.slug}-${i}`) })),
    })),
  };
}

/** Render provisorio en SVG para el entorno local (sin bajar fotos). */
export function svgRenderDePrueba(titulo: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3026"/><stop offset="1" stop-color="#101215"/></linearGradient></defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect x="180" y="160" width="1240" height="680" fill="none" stroke="#c9b79c" stroke-opacity="0.35" stroke-width="4"/>
  <text x="800" y="520" font-family="Arial, Helvetica, sans-serif" font-size="64" fill="#e9e1d4" text-anchor="middle">${titulo}</text>
</svg>`;
}
