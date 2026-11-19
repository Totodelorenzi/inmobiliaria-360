/**
 * Imágenes reales del Edificio Mirador desde la carpeta demo-mirador/ (fuera del repo):
 * las comprime a WebP, las sube a Storage y las asigna a la fachada, plantas, maquetas y ambientes.
 * Los nombres van sin extensión (fachada.png, t2-bano.jpg…). Las que falten se saltean.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { letraUnidad } from "@/lib/edificio";

type Db = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

/** Tenant "Desarrollos Demo" (id fijo: lo usan el seed y la carga de imágenes). */
export const DESARROLLADORA_DEMO_ID = "d3a0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0d22";
export const CARPETA_MIRADOR = path.resolve(import.meta.dirname, "../../demo-mirador");

/** Ambientes de cada tipología, en el orden en que se cargan (unit_type_rooms.orden). */
export const ARCHIVOS_AMBIENTES = [
  ["t1-living", "t1-cocina", "t1-dormitorio", "t1-bano"],
  ["t2-living", "t2-cocina", "t2-dormitorio-principal", "t2-dormitorio-2", "t2-bano"],
  ["t3-living", "t3-cocina", "t3-dormitorio-principal", "t3-bano", "t3-balcon"],
];

const EXTENSIONES = /\.(png|jpe?g|webp|avif|tiff?)$/i;

const r = (x1: number, y1: number, x2: number, y2: number): [number, number][] => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];
/** Pisos sobre fachada.png (horizontal, 16:9): bandas entre losas, en % de la imagen. */
const ZONAS_PISOS: Record<number, [number, number][]> = {
  4: r(3.3, 9.5, 96.5, 27),
  3: r(3.3, 27, 96.5, 43),
  2: r(3.3, 43, 96.5, 59.5),
  1: r(3.3, 59.5, 96.5, 76),
  0: r(3.3, 76, 96.5, 90.5),
};
/** Unidades sobre planta-tipo.png y planta-baja.png (misma distribución): del pasillo al borde del balcón. */
const ZONAS_UNIDADES: Record<string, [number, number][]> = {
  A: r(2.5, 37, 16.5, 81),
  B: r(16.5, 37, 30, 81),
  C: r(30.5, 37, 49.5, 80.5),
  D: r(50.5, 37, 69, 80.5),
  E: r(69.5, 37, 97, 82),
};

export function hayImagenesMirador() {
  return existsSync(CARPETA_MIRADOR) && readdirSync(CARPETA_MIRADOR).some((a) => EXTENSIONES.test(a));
}

export async function aplicarImagenesMirador(db: Db, agencyId: string, projectId: string, log: (t: string) => void, zonas = false, solo?: string[]) {
  const archivos = new Map(
    readdirSync(CARPETA_MIRADOR)
      .filter((a) => EXTENSIONES.test(a))
      .map((a) => [path.parse(a).name.toLowerCase(), path.join(CARPETA_MIRADOR, a)]),
  );
  const faltan: string[] = [];
  const cache = new Map<string, { url: string; ancho: number; alto: number }>();

  /** Comprime y sube una imagen por nombre (una sola vez aunque se use en varios lugares). */
  async function subir(nombre: string) {
    if (cache.has(nombre)) return cache.get(nombre)!;
    // Con una lista de nombres, solo se cargan esas (el resto queda como está).
    if (solo?.length && !solo.includes(nombre)) return null;
    const archivo = archivos.get(nombre);
    if (!archivo) {
      faltan.push(nombre);
      return null;
    }
    const { data, info } = await sharp(readFileSync(archivo))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const ruta = `${agencyId}/${projectId}/${nombre}-${randomUUID().slice(0, 8)}.webp`;
    const { error } = await db.storage.from("fotos").upload(ruta, data, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw new Error(`No se pudo subir ${nombre}: ${error.message}`);
    const subida = { url: db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl, ancho: info.width, alto: info.height };
    cache.set(nombre, subida);
    log(`${nombre}: ${info.width}×${info.height}, ${Math.round(data.length / 1024)} KB`);
    return subida;
  }
  const fallar = (que: string, error: { message: string } | null) => {
    if (error) throw new Error(`No se pudo asignar ${que}: ${error.message}`);
  };

  const fachada = await subir("fachada");
  if (fachada) {
    fallar("la fachada", (await db.from("projects").update({ fachada_url: fachada.url, fachada_ancho: fachada.ancho, fachada_alto: fachada.alto }).eq("id", projectId)).error);
  }

  const { data: pisos } = await db.from("project_floors").select("id, numero").eq("project_id", projectId);
  for (const p of pisos ?? []) {
    const planta = await subir(p.numero === 0 ? "planta-baja" : "planta-tipo");
    if (!planta) continue;
    fallar(`la planta del piso ${p.numero}`, (await db.from("project_floors").update({ planta_url: planta.url, planta_ancho: planta.ancho, planta_alto: planta.alto }).eq("id", p.id)).error);
  }

  // Zonas medidas sobre las imágenes reales: solo en un proyecto recién creado (no pisa los ajustes del panel).
  if (zonas && fachada) {
    for (const p of pisos ?? []) {
      if (ZONAS_PISOS[p.numero]) fallar(`la zona del piso ${p.numero}`, (await db.from("project_floors").update({ poligono: ZONAS_PISOS[p.numero] }).eq("id", p.id)).error);
    }
  }
  if (zonas && archivos.has("planta-tipo") && archivos.has("planta-baja")) {
    const { data: unidades } = await db.from("units").select("id, codigo").eq("project_id", projectId);
    for (const u of unidades ?? []) {
      const zona = ZONAS_UNIDADES[letraUnidad(u.codigo)];
      if (zona) fallar(`la zona de la unidad ${u.codigo}`, (await db.from("units").update({ poligono: zona }).eq("id", u.id)).error);
    }
  }

  const { data: tipologias } = await db.from("unit_types").select("id, orden, salas:unit_type_rooms(id, orden)").eq("project_id", projectId).order("orden");
  for (const [i, t] of (tipologias ?? []).entries()) {
    const maqueta = await subir(`maqueta-t${i + 1}`);
    if (maqueta) {
      fallar(`la maqueta t${i + 1}`, (await db.from("unit_types").update({ maqueta_url: maqueta.url, maqueta_ancho: maqueta.ancho, maqueta_alto: maqueta.alto }).eq("id", t.id)).error);
    }
    const salas = [...t.salas].sort((a, b) => a.orden - b.orden);
    for (const [j, nombre] of (ARCHIVOS_AMBIENTES[i] ?? []).entries()) {
      const render = await subir(nombre);
      if (render && salas[j]) fallar(nombre, (await db.from("unit_type_rooms").update({ render_url: render.url }).eq("id", salas[j].id)).error);
    }
  }
  return { subidas: cache.size, faltan };
}
