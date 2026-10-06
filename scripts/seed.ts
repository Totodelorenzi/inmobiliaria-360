/**
 * Datos de ejemplo: inmobiliaria + 9 propiedades con fotos, 2 tours 360° y 2 planos.
 *   npm run seed                  → carga todo en Supabase (borra antes los datos de ejemplo anteriores)
 *   npm run seed -- --solo-imagenes → solo descarga y procesa imágenes (no necesita Supabase)
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { slugify, slugDisponible } from "@/lib/admin/propiedad";
import { borrarCarpetaPropiedad, type Bucket } from "@/lib/admin/storage";
import { getAgencyId, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { cargarActividad, type PropiedadCreada } from "./seed/actividad.ts";
import { AGENCIA, AGENCIA_DEMO_ID, PROPIEDADES, panoramasUsadas } from "./seed/datos.ts";
import * as img from "./seed/imagenes.ts";

const soloImagenes = process.argv.includes("--solo-imagenes");
const log = (texto: string) => console.log(`• ${texto}`);

async function descargarTodas() {
  const ids = panoramasUsadas();
  log(`Panorámicas CC0 de Poly Haven: ${ids.length} (se guardan en scripts/.cache para no volver a bajarlas)`);
  const panos = new Map<string, Buffer>();
  for (let i = 0; i < ids.length; i += 4) {
    const lote = ids.slice(i, i + 4);
    const buffers = await Promise.all(lote.map((id) => img.descargarPanorama(id)));
    lote.forEach((id, j) => panos.set(id, buffers[j]));
    log(`  ${Math.min(i + 4, ids.length)}/${ids.length} listas`);
  }
  return panos;
}

async function muestras(panos: Map<string, Buffer>) {
  const dir = new URL("./.cache/muestras/", import.meta.url);
  await mkdir(dir, { recursive: true });
  const primera = PROPIEDADES[0];
  const tour = await img.panoramaTour(panos.get(primera.escenas![0].pano)!);
  await writeFile(new URL("tour.jpg", dir), tour.grande);
  for (const [i, foto] of primera.fotos.slice(0, 3).entries()) {
    if (!("pano" in foto)) continue;
    const f = await img.fotoDesdePanorama(panos.get(foto.pano)!, foto);
    await writeFile(new URL(`foto-${i + 1}.webp`, dir), f.grande);
    await writeFile(new URL(`foto-${i + 1}-800.jpg`, dir), f.mini);
  }
  await writeFile(new URL("plano-unidad.webp", dir), (await img.desdeSvg(img.svgUnidad2Amb(), 3200, 600)).grande);
  await writeFile(new URL("plano-amenities.webp", dir), (await img.desdeSvg(img.svgAmenities(), 3200, 600)).grande);
  await writeFile(new URL("fachada.webp", dir), (await img.desdeSvg(img.svgFachada("Alto Caballito"), 2400, 800)).grande);
  await writeFile(new URL("logo.png", dir), await img.logoPng(img.svgLogo(AGENCIA.nombre, AGENCIA.color_primario!)));
  log(`Muestras en scripts/.cache/muestras/`);
}

async function main() {
  const panos = await descargarTodas();
  if (soloImagenes) return muestras(panos);

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no está configurado: completá .env.local (ver docs/SETUP-CUENTAS.md) y volvé a correr npm run seed.");
  }
  const db = createAdminClient();

  async function subir(bucket: Bucket, ruta: string, datos: Buffer, tipo: string) {
    const { error } = await db.storage.from(bucket).upload(ruta, datos, { contentType: tipo, cacheControl: "31536000", upsert: true });
    if (error) throw new Error(`No se pudo subir ${bucket}/${ruta}: ${error.message}`);
    return db.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
  }
  const tipoDe = (ext: string) => (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  async function subirImagen(bucket: Bucket, carpeta: string, imagen: img.Imagen, sufijoMini: string) {
    const nombre = randomUUID();
    const url = await subir(bucket, `${carpeta}/${nombre}.${imagen.extGrande}`, imagen.grande, tipoDe(imagen.extGrande));
    const thumb_url = await subir(bucket, `${carpeta}/${nombre}${sufijoMini}.jpg`, imagen.mini, "image/jpeg");
    return { url, thumb_url };
  }

  // 1. Inmobiliaria
  const agencyId = getAgencyId() ?? AGENCIA_DEMO_ID;
  const { data: existente, error: errorAgencia } = await db.from("agencies").select("id, nombre").eq("id", agencyId).maybeSingle();
  if (errorAgencia) throw new Error(`No se pudo leer la base: ${errorAgencia.message}. ¿Corriste las migraciones (npx supabase db push)?`);
  if (existente) {
    log(`Inmobiliaria existente: ${existente.nombre} (no se modifica)`);
  } else {
    if (getAgencyId()) throw new Error(`AGENCY_ID=${agencyId} no existe en la base.`);
    const logo = await subir("fotos", `${agencyId}/agencia/logo.png`, await img.logoPng(img.svgLogo(AGENCIA.nombre, AGENCIA.color_primario!)), "image/png");
    const { error } = await db.from("agencies").insert({ ...AGENCIA, id: agencyId, logo_url: logo });
    if (error) throw new Error(`No se pudo crear la inmobiliaria: ${error.message}`);
    log(`Inmobiliaria creada: ${AGENCIA.nombre}`);
  }

  // 2. Borrar los datos de ejemplo anteriores (actividad primero; los eventos caen en cascada)
  for (const tabla of ["leads", "tracked_links", "visitors"] as const) {
    const { error: errorTabla } = await db.from(tabla).delete().eq("agency_id", agencyId).eq("es_demo", true);
    if (errorTabla) throw new Error(`No se pudo limpiar ${tabla}: ${errorTabla.message}`);
  }
  const { data: viejas } = await db.from("properties").select("id").eq("agency_id", agencyId).eq("es_demo", true);
  for (const { id } of viejas ?? []) await borrarCarpetaPropiedad(db, agencyId, id);
  if (viejas?.length) {
    await db.from("properties").delete().eq("agency_id", agencyId).eq("es_demo", true);
    log(`Borradas ${viejas.length} propiedades de ejemplo anteriores`);
  }

  // 3. Propiedades
  const { data: slugsUsados } = await db.from("properties").select("slug");
  const usados = new Set((slugsUsados ?? []).map((s) => s.slug));
  const panoramasTour = new Map<string, Promise<img.Imagen>>();
  const tourDe = (id: string) => {
    if (!panoramasTour.has(id)) panoramasTour.set(id, img.panoramaTour(panos.get(id)!));
    return panoramasTour.get(id)!;
  };

  const creadas: PropiedadCreada[] = [];
  for (const [i, def] of PROPIEDADES.entries()) {
    const { fotos, escenas = [], hotspots = [], planos = [], ...datos } = def;
    const id = randomUUID();
    const slug = slugDisponible(slugify(datos.titulo), usados);
    usados.add(slug);
    const carpeta = `${agencyId}/${id}`;
    const { error } = await db.from("properties").insert({
      ...datos,
      id,
      agency_id: agencyId,
      slug,
      // Fechas escalonadas: el orden "más recientes" queda prolijo.
      created_at: new Date(Date.now() - i * 36e5).toISOString(),
    });
    if (error) throw new Error(`No se pudo crear "${datos.titulo}": ${error.message}`);

    for (const [orden, foto] of fotos.entries()) {
      const imagen = "svg" in foto ? await img.desdeSvg(img.svgFachada(datos.titulo.split(":")[0]), 2400, 800) : await img.fotoDesdePanorama(panos.get(foto.pano)!, foto);
      const subida = await subirImagen("fotos", carpeta, imagen, "-800");
      await db.from("property_photos").insert({ property_id: id, ...subida, orden, es_principal: orden === 0 });
    }

    const creada: PropiedadCreada = { id, titulo: datos.titulo, operacion: datos.operacion, fotos: fotos.length, escenas: [], planos: [] };
    creadas.push(creada);
    const idsEscenas: string[] = [];
    for (const [orden, escena] of escenas.entries()) {
      const subida = await subirImagen("panoramas", carpeta, await tourDe(escena.pano), "-mini");
      const sceneId = randomUUID();
      idsEscenas.push(sceneId);
      creada.escenas.push({ id: sceneId, nombre: escena.nombre });
      await db.from("tour_scenes").insert({
        id: sceneId,
        property_id: id,
        nombre_ambiente: escena.nombre,
        panorama_url: subida.url,
        thumb_url: subida.thumb_url,
        orden,
        yaw_inicial: escena.yaw ?? 0,
        pitch_inicial: escena.pitch ?? 0,
      });
    }
    if (hotspots.length) {
      const { error: errorHotspots } = await db
        .from("tour_hotspots")
        .insert(hotspots.map(([desde, hacia, yaw, pitch]) => ({ scene_id: idsEscenas[desde], target_scene_id: idsEscenas[hacia], yaw, pitch })));
      if (errorHotspots) throw new Error(`Hotspots de "${datos.titulo}": ${errorHotspots.message}`);
    }

    for (const [orden, plano] of planos.entries()) {
      const svg = plano.svg === "unidad-2-amb" ? img.svgUnidad2Amb() : img.svgAmenities();
      const subida = await subirImagen("planos", carpeta, await img.desdeSvg(svg, 3200, 600), "-mini");
      const planId = randomUUID();
      creada.planos.push({ id: planId, nombre: plano.nombre, puntos: plano.puntos.map((pt) => pt.texto) });
      await db.from("property_plans").insert({ id: planId, property_id: id, nombre: plano.nombre, ...subida, orden, tipo_original: "imagen" });
      await db.from("plan_hotspots").insert(plano.puntos.map((p) => ({ plan_id: planId, x_pct: p.x, y_pct: p.y * img.PROPORCION_DIBUJO, texto: p.texto })));
    }
    log(`${i + 1}/${PROPIEDADES.length} ${datos.titulo} (${fotos.length} fotos${escenas.length ? `, tour de ${escenas.length} ambientes` : ""}${planos.length ? `, ${planos.length} planos` : ""})`);
  }

  // 4. Visitas, leads y pedidos de visita de las últimas 3 semanas
  const a = await cargarActividad(db, agencyId, creadas);
  log(
    `Actividad de ejemplo: ${a.visitantes} visitantes, ${a.eventos} eventos, ${a.leads} leads ` +
      `(${a.niveles.caliente} calientes, ${a.niveles.tibio} tibios, ${a.niveles.frio} fríos), ${a.pedidos} pedidos de visita, ${a.links} links`,
  );

  console.log(`\nListo. Inmobiliaria ${agencyId}. Siguiente paso: npm run crear-admin`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
