/**
 * Imágenes reales del Edificio Mirador desde la carpeta demo-mirador-2/ (fuera del repo): las
 * comprime a WebP, las sube a Storage y las asigna. Nombres (sin importar la extensión):
 *   vista-1, vista-2                        fachadas horizontales 16:9 (calle 1 y calle 2)
 *   planta-subsuelo, planta-pb, planta-1-2, planta-3-4, planta-5-7, planta-8
 *   maqueta-t1 … maqueta-t6, maqueta-local  (vista desde arriba, mismo fondo liso que las plantas)
 *   t3-1-living, t3-2-cocina, …             renders de cada tipología (orden y nombre en el archivo)
 *   pileta-1, sum-1-parrilla, gimnasio-1, lobby-1, local-1-salon …
 *   cuadros/0001.jpg …                      cuadros del giro entre las dos vistas (modo "secuencia")
 * Lo que no está se saltea. No toca unidades, estados, zonas ni leads; el color de fondo de la
 * página se toma de las plantas (para que se fundan).
 */
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ESPACIOS, PISOS, TIPOLOGIAS, type ClavePlanta } from "./edificio.ts";

type Db = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

/** Tenant "Desarrollos Demo" (id fijo: lo usan el seed y la carga de imágenes). */
export const DESARROLLADORA_DEMO_ID = "d3a0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0d22";
export const CARPETA_REALES = path.resolve(import.meta.dirname, "../../../demo-mirador-2");
const EXTENSIONES = /\.(png|jpe?g|webp|avif|tiff?)$/i;

const PLANTAS: Record<string, ClavePlanta> = {
  "planta-subsuelo": "subsuelo",
  "planta-pb": "pb",
  "planta-1-2": "p12",
  "planta-3-4": "p34",
  "planta-5-7": "p57",
  "planta-8": "p8",
};

/** Palabras que en un nombre de archivo van sin tilde. */
const TILDES: Record<string, string> = { bano: "baño", balcon: "balcón", solarium: "solárium", comun: "común", vestidor: "vestidor", dormitorio: "dormitorio", salon: "salón", recepcion: "recepción" };
const nombreDeArchivo = (partes: string[]) => {
  const texto = partes.map((p) => TILDES[p] ?? p).join(" ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function archivos(): Map<string, string> {
  if (!existsSync(CARPETA_REALES)) return new Map();
  return new Map(
    readdirSync(CARPETA_REALES)
      .filter((a) => EXTENSIONES.test(a))
      .map((a) => [path.parse(a).name.toLowerCase().replace(/[\s_]+/g, "-"), path.join(CARPETA_REALES, a)]),
  );
}

export function hayImagenesReales() {
  return archivos().size > 0 || existsSync(path.join(CARPETA_REALES, "cuadros"));
}

/** Color dominante del borde (el fondo liso de una planta o maqueta). */
async function colorDeFondo(archivo: string) {
  const { data, info } = await sharp(archivo).resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const borde: number[][] = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x > 1 && x < info.width - 2 && y > 1 && y < info.height - 2) continue;
      const i = (y * info.width + x) * 3;
      borde.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  // Mediana por canal: no la mueven un logo o un texto en una esquina.
  const mediana = (c: number) => borde.map((p) => p[c]).sort((a, b) => a - b)[Math.floor(borde.length / 2)];
  return `#${[0, 1, 2].map((c) => mediana(c).toString(16).padStart(2, "0")).join("")}`;
}

export async function aplicarImagenesReales(db: Db, agencyId: string, projectId: string, log: (t: string) => void, solo?: string[]) {
  const todos = archivos();
  const quiero = (nombre: string) => !solo?.length || solo.some((s) => nombre.startsWith(s.toLowerCase()));
  const carpeta = `${agencyId}/${projectId}`;
  let subidas = 0;
  const faltan: string[] = [];
  const fallar = (que: string, error: { message: string } | null) => {
    if (error) throw new Error(`${que}: ${error.message}`);
  };

  async function subir(archivo: string, maxLado: number, ruta = `${carpeta}/${randomUUID()}.webp`) {
    const { data, info } = await sharp(archivo).rotate().resize(maxLado, maxLado, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const { error } = await db.storage.from("fotos").upload(ruta, data, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    fallar(`No se pudo subir ${path.basename(archivo)}`, error);
    subidas++;
    return { url: db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl, ancho: info.width, alto: info.height };
  }

  // Vistas de la fachada
  for (const nombre of ["vista-1", "vista-2"] as const) {
    if (!quiero(nombre)) continue;
    const archivo = todos.get(nombre);
    if (!archivo) {
      faltan.push(nombre);
      continue;
    }
    const img = await subir(archivo, 1920);
    const cambios = nombre === "vista-1" ? { fachada_url: img.url, fachada_ancho: img.ancho, fachada_alto: img.alto } : { fachada2_url: img.url, fachada2_ancho: img.ancho, fachada2_alto: img.alto };
    fallar(nombre, (await db.from("projects").update(cambios).eq("id", projectId)).error);
    log(`${nombre}: ${img.ancho}×${img.alto}`);
  }

  // Plantas (los pisos iguales comparten la imagen) y color de fondo de la página
  const { data: pisos } = await db.from("project_floors").select("id, numero").eq("project_id", projectId);
  let fondo: string | null = null;
  for (const [nombre, clave] of Object.entries(PLANTAS)) {
    if (!quiero(nombre)) continue;
    const archivo = todos.get(nombre);
    if (!archivo) {
      faltan.push(nombre);
      continue;
    }
    fondo ??= await colorDeFondo(archivo);
    const img = await subir(archivo, 1600);
    const numeros = PISOS.filter((p) => p.planta === clave).map((p) => p.numero);
    const ids = (pisos ?? []).filter((p) => numeros.includes(p.numero)).map((p) => p.id);
    fallar(nombre, (await db.from("project_floors").update({ planta_url: img.url, planta_ancho: img.ancho, planta_alto: img.alto }).in("id", ids)).error);
    log(`${nombre}: pisos ${numeros.join(", ")}`);
  }
  if (fondo) {
    fallar("color de fondo", (await db.from("projects").update({ color_fondo: fondo }).eq("id", projectId)).error);
    log(`Fondo de la página: ${fondo} (tomado de las plantas)`);
  }

  // Maquetas y renders de cada tipología
  const { data: tipos } = await db.from("unit_types").select("id, nombre").eq("project_id", projectId);
  for (const t of TIPOLOGIAS) {
    const tipo = tipos?.find((x) => x.nombre === t.nombre);
    if (!tipo) continue;
    const maqueta = `maqueta-${t.clave}`;
    if (quiero(maqueta)) {
      const archivo = todos.get(maqueta);
      if (archivo) {
        const img = await subir(archivo, 1600);
        fallar(maqueta, (await db.from("unit_types").update({ maqueta_url: img.url, maqueta_ancho: img.ancho, maqueta_alto: img.alto }).eq("id", tipo.id)).error);
        log(`${maqueta}: ${t.nombre}`);
      } else faltan.push(maqueta);
    }
    const renders = [...todos.keys()].filter((n) => new RegExp(`^${t.clave}-\\d+(-|$)`).test(n) && quiero(n)).sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
    if (!renders.length) continue;
    const filas = [];
    for (const [orden, n] of renders.entries()) {
      const img = await subir(todos.get(n)!, 1920);
      filas.push({ unit_type_id: tipo.id, nombre: nombreDeArchivo(n.split("-").slice(2)) || `Imagen ${orden + 1}`, render_url: img.url, orden });
    }
    fallar(`renders de ${t.nombre}`, (await db.from("unit_type_rooms").delete().eq("unit_type_id", tipo.id)).error);
    fallar(`renders de ${t.nombre}`, (await db.from("unit_type_rooms").insert(filas)).error);
    log(`${t.nombre}: ${filas.length} renders`);
  }

  // Imágenes de los espacios comunes
  const { data: espacios } = await db.from("project_spaces").select("id, slug, nombre").eq("project_id", projectId);
  for (const e of ESPACIOS) {
    const espacio = espacios?.find((x) => x.slug === e.slug);
    const nombres = [...todos.keys()].filter((n) => new RegExp(`^${e.slug}-\\d+(-|$)`).test(n) && quiero(n)).sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
    if (!espacio || !nombres.length) continue;
    const filas = [];
    for (const [orden, n] of nombres.entries()) {
      const img = await subir(todos.get(n)!, 1920);
      filas.push({ space_id: espacio.id, nombre: nombreDeArchivo(n.split("-").slice(2)) || espacio.nombre, url: img.url, orden });
    }
    fallar(`imágenes de ${e.nombre}`, (await db.from("project_space_images").delete().eq("space_id", espacio.id)).error);
    fallar(`imágenes de ${e.nombre}`, (await db.from("project_space_images").insert(filas)).error);
    log(`${e.nombre}: ${filas.length} imágenes`);
  }

  // Cuadros del giro (modo "secuencia"): quedan cargados; el modo se elige en el panel.
  const dirCuadros = path.join(CARPETA_REALES, "cuadros");
  if (quiero("cuadros") && existsSync(dirCuadros) && statSync(dirCuadros).isDirectory()) {
    const cuadros = readdirSync(dirCuadros)
      .filter((a) => EXTENSIONES.test(a))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    if (cuadros.length >= 2) {
      const id = randomUUID();
      let medida = { ancho: 0, alto: 0 };
      for (const [i, a] of cuadros.entries()) {
        const img = await subir(path.join(dirCuadros, a), 1600, `${carpeta}/cuadros-${id}/${String(i + 1).padStart(4, "0")}.webp`);
        medida = { ancho: img.ancho, alto: img.alto };
      }
      const base = db.storage.from("fotos").getPublicUrl(`${carpeta}/cuadros-${id}/{n}.webp`).data.publicUrl.replace("%7Bn%7D", "{n}");
      const secuencia = { patron: base, cuadros: cuadros.length, digitos: 4, inicio: 1, ...medida };
      fallar("cuadros", (await db.from("projects").update({ secuencia }).eq("id", projectId)).error);
      log(`Cuadros del giro: ${cuadros.length}`);
    }
  }
  return { subidas, faltan };
}

