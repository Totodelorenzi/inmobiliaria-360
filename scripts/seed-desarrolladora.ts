/**
 * Demo del módulo desarrolladora: tenant "Desarrollos Demo" con el Edificio Mirador (esquina de
 * 20 × 15 m en Olavarría): subsuelo con 8 cocheras, planta baja con lobby y local en alquiler,
 * pisos 1 a 7 con 20 departamentos de 6 tipologías y piso 8 de amenities. Estados y precios en
 * dólares mezclados y 10 leads de muestra con historial y campaña (UTM).
 * Imágenes provisorias dibujadas (fachadas en perspectiva, plantas y maquetas sobre el fondo de la
 * página) y renders sacados de panorámicas CC0; si hay archivos en demo-mirador-2/, se usan esos.
 *   npm run seed:desarrolladora                 → crea el tenant si falta y recrea el proyecto
 *   npm run seed:desarrolladora -- --sin-cuadros → sin la secuencia de cuadros del giro (modo b)
 * Solo toca ese tenant: borra y vuelve a crear su proyecto `es_demo`, sus leads y sus visitantes.
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/types/database";
import { cargarActividadEdificio } from "./seed/actividad-edificio.ts";
import { descargarPanorama, fotoDesdePanorama, logoPng } from "./seed/imagenes.ts";
import { CAMARAS, camaraEntre, enPlanta, FACHADA, FONDO, PLANTA, puntoEnPlanta, svgFachada, svgMaqueta, svgMaquetaCochera, svgPlanta } from "./seed/mirador/dibujos.ts";
import { CONSULTAR, ESPACIOS, ESTADOS, PISOS, PROYECTO, precioUnidad, TIPOLOGIAS, UNIDADES, type ClavePlanta } from "./seed/mirador/edificio.ts";
import { aplicarImagenesReales, DESARROLLADORA_DEMO_ID, hayImagenesReales } from "./seed/mirador/reales.ts";

const log = (texto: string) => console.log(`• ${texto}`);
const CUADROS = 48;

const webp = (svg: string, ancho: number, calidad = 82) => sharp(Buffer.from(svg), { density: 96 }).resize(ancho).webp({ quality: calidad }).toBuffer();

async function main() {
  const db = createAdminClient();
  const agencyId = DESARROLLADORA_DEMO_ID;
  const fallar = (contexto: string, error: { message: string } | null) => {
    if (error) throw new Error(`${contexto}: ${error.message}`);
  };

  async function subir(ruta: string, datos: Buffer, tipo = "image/webp") {
    const { error } = await db.storage.from("fotos").upload(ruta, datos, { contentType: tipo, cacheControl: "31536000", upsert: true });
    fallar(`No se pudo subir ${ruta}`, error);
    return db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  }

  /** Borra una carpeta de Storage con sus subcarpetas (los cuadros del giro van en una). */
  async function borrarCarpeta(carpeta: string) {
    const { data } = await db.storage.from("fotos").list(carpeta, { limit: 1000 });
    for (const sub of (data ?? []).filter((f) => !f.id)) await borrarCarpeta(`${carpeta}/${sub.name}`);
    const archivos = (data ?? []).filter((f) => f.id).map((f) => `${carpeta}/${f.name}`);
    if (archivos.length) await db.storage.from("fotos").remove(archivos);
  }

  // 0. Antes de borrar nada: la base tiene que tener la migración de la landing.
  fallar("Falta aplicar la migración 0014 (landing del proyecto) en la base", (await db.from("project_spaces").select("id").limit(1)).error);

  // 1. Tenant
  const { data: existente, error: errorAgencia } = await db.from("agencies").select("id").eq("id", agencyId).maybeSingle();
  fallar("No se pudo leer la base", errorAgencia);
  if (!existente) {
    const color = "#1d4d4f";
    const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140"><rect x="20" y="24" width="70" height="96" fill="${color}"/><rect x="96" y="56" width="40" height="64" fill="${color}" opacity="0.6"/><text x="156" y="92" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="${color}">Desarrollos Demo</text></svg>`;
    const logo_url = await subir(`${agencyId}/agencia/${randomUUID()}.png`, await logoPng(logo), "image/png");
    fallar(
      "No se pudo crear el tenant",
      (
        await db.from("agencies").insert({
          id: agencyId,
          nombre: "Desarrollos Demo",
          subdominio: "desarrollos-demo",
          modulos: ["desarrolladora"],
          color_primario: color,
          logo_url,
          whatsapp: "5492284000000",
          email: "hola@desarrollosdemo.example",
          direccion: "Olavarría, Buenos Aires",
        })
      ).error,
    );
    log("Tenant creado: Desarrollos Demo (?agencia=desarrollos-demo)");
  }

  // Entran a su panel el admin de la plataforma (ADMIN_EMAIL) y el usuario de demo para presentaciones (DEMO_EMAIL).
  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
  for (const [variable, rol] of [["ADMIN_EMAIL", "admin"], ["DEMO_EMAIL", "agente"]] as const) {
    const email = process.env[variable]?.trim().toLowerCase();
    const usuario = email && usuarios?.users.find((u) => u.email?.toLowerCase() === email);
    if (!usuario) continue;
    fallar("No se pudo sumar al usuario", (await db.from("agency_members").upsert({ user_id: usuario.id, agency_id: agencyId, rol }, { onConflict: "user_id,agency_id" })).error);
    log(`${email} es ${rol} de Desarrollos Demo`);
  }

  // 2. El proyecto de ejemplo anterior se borra entero (cascada a pisos, unidades, espacios y sus eventos)
  const { data: viejos } = await db.from("projects").select("id").eq("agency_id", agencyId).eq("es_demo", true);
  for (const { id } of viejos ?? []) await borrarCarpeta(agencyId + "/" + id);
  if (viejos?.length) fallar("No se pudo borrar el proyecto anterior", (await db.from("projects").delete().eq("agency_id", agencyId).eq("es_demo", true)).error);

  const projectId = randomUUID();
  const carpeta = `${agencyId}/${projectId}`;
  const fachadas = CAMARAS.map((c) => svgFachada(c));
  const [vista1, vista2] = await Promise.all(fachadas.map(async (f, i) => subir(`${carpeta}/vista-${i + 1}.webp`, await webp(f.svg, FACHADA.ancho, 80))));

  // Cuadros del giro entre las dos vistas (modo "secuencia"): quedan cargados, el proyecto arranca en "fundido".
  let secuencia: TablesInsert<"projects">["secuencia"] = null;
  if (!process.argv.includes("--sin-cuadros")) {
    const lote = randomUUID();
    for (let i = 0; i < CUADROS; i++) {
      const { svg } = svgFachada(camaraEntre(i / (CUADROS - 1)));
      await subir(`${carpeta}/cuadros-${lote}/${String(i + 1).padStart(4, "0")}.webp`, await webp(svg, 1280, 72));
    }
    const patron = db.storage.from("fotos").getPublicUrl(`${carpeta}/cuadros-${lote}/{n}.webp`).data.publicUrl.replace("%7Bn%7D", "{n}");
    secuencia = { patron, cuadros: CUADROS, digitos: 4, inicio: 1, ancho: 1280, alto: 720 };
    log(`Giro entre vistas: ${CUADROS} cuadros`);
  }

  fallar(
    "No se pudo crear el proyecto",
    (
      await db.from("projects").insert({
        id: projectId,
        agency_id: agencyId,
        nombre: PROYECTO.nombre,
        slug: PROYECTO.slug,
        ciudad: PROYECTO.ciudad,
        direccion: PROYECTO.direccion,
        descripcion: PROYECTO.descripcion,
        fachada_url: vista1,
        fachada_ancho: FACHADA.ancho,
        fachada_alto: FACHADA.alto,
        fachada2_url: vista2,
        fachada2_ancho: FACHADA.ancho,
        fachada2_alto: FACHADA.alto,
        vista1_nombre: PROYECTO.vista1,
        vista2_nombre: PROYECTO.vista2,
        transicion: "fundido",
        secuencia,
        sobre_titulo: PROYECTO.sobreTitulo,
        sobre_texto: PROYECTO.sobreTexto,
        entrega: PROYECTO.entrega,
        amenities: PROYECTO.amenities,
        color_fondo: FONDO,
        publicado: true,
        es_demo: true,
      })
    ).error,
  );
  log(`Proyecto: ${PROYECTO.nombre} (dos vistas de la fachada)`);

  // 3. Renders provisorios: vistas de panorámicas CC0 (se bajan una vez y quedan en caché)
  const renders = new Map<string, string>();
  async function render(pano: string, yaw: number) {
    const llave = `${pano}:${yaw}`;
    if (!renders.has(llave)) {
      const foto = await fotoDesdePanorama(await descargarPanorama(pano), { pano, yaw, hfov: 92 });
      renders.set(llave, await subir(`${carpeta}/${randomUUID()}.webp`, await sharp(foto.grande).resize(1600).webp({ quality: 76 }).toBuffer()));
    }
    return renders.get(llave)!;
  }

  // 4. Tipologías con maqueta y renders (+ "Cochera", sin imágenes)
  const idTipo = new Map<string, string>();
  const ambientes = new Map<string, string[]>();
  for (const [orden, t] of TIPOLOGIAS.entries()) {
    const id = randomUUID();
    idTipo.set(t.clave, id);
    const maqueta = svgMaqueta(t);
    fallar(
      `Tipología ${t.nombre}`,
      (
        await db.from("unit_types").insert({
          id,
          project_id: projectId,
          nombre: t.nombre,
          ambientes: t.ambientes,
          dormitorios: t.dormitorios,
          banos: t.banos,
          orden,
          maqueta_url: await subir(`${carpeta}/${randomUUID()}.webp`, await webp(maqueta.svg, maqueta.ancho, 85)),
          maqueta_ancho: maqueta.ancho,
          maqueta_alto: maqueta.alto,
        })
      ).error,
    );
    const filas: (TablesInsert<"unit_type_rooms"> & { id: string })[] = [];
    for (const [i, r] of t.renders.entries()) filas.push({ id: randomUUID(), unit_type_id: id, nombre: r.nombre, render_url: await render(r.pano, r.yaw), orden: i });
    fallar(`Renders de ${t.nombre}`, (await db.from("unit_type_rooms").insert(filas)).error);
    ambientes.set(id, filas.map((f) => f.id));
    log(`Tipología ${t.nombre}: maqueta y ${filas.length} renders`);
  }
  const cochera = randomUUID();
  idTipo.set("cochera", cochera);
  const auto = svgMaquetaCochera();
  fallar(
    "Tipología cochera",
    (
      await db.from("unit_types").insert({
        id: cochera,
        project_id: projectId,
        nombre: "Cochera",
        orden: TIPOLOGIAS.length,
        maqueta_url: await subir(`${carpeta}/${randomUUID()}.webp`, await webp(auto.svg, auto.ancho, 85)),
        maqueta_ancho: auto.ancho,
        maqueta_alto: auto.alto,
      })
    ).error,
  );

  // 5. Plantas (los pisos iguales comparten imagen) y pisos con su zona en cada vista
  const plantas = new Map<ClavePlanta, string>();
  for (const clave of new Set(PISOS.map((p) => p.planta))) plantas.set(clave, await subir(`${carpeta}/planta-${clave}.webp`, await webp(svgPlanta(clave), PLANTA.ancho, 84)));
  const pisos = PISOS.map((p) => ({
    id: randomUUID(),
    project_id: projectId,
    numero: p.numero,
    nombre: p.nombre,
    planta_url: plantas.get(p.planta)!,
    planta_ancho: PLANTA.ancho,
    planta_alto: PLANTA.alto,
    poligono: fachadas[0].zonas[p.numero] ?? null,
    poligono2: fachadas[1].zonas[p.numero] ?? null,
  }));
  fallar("Pisos", (await db.from("project_floors").insert(pisos)).error);
  const pisoId = (numero: number) => pisos.find((p) => p.numero === numero)!.id;

  // 6. Unidades: departamentos, local y cocheras
  const unidades: (TablesInsert<"units"> & { id: string })[] = UNIDADES.map((u) => ({
    id: randomUUID(),
    project_id: projectId,
    floor_id: pisoId(u.piso),
    unit_type_id: idTipo.get(u.tipo)!,
    codigo: u.codigo,
    categoria: u.categoria,
    operacion: u.operacion,
    superficie_cubierta: u.cubierta,
    superficie_total: u.total,
    orientacion: u.orientacion || null,
    precio: CONSULTAR.has(u.codigo) ? null : precioUnidad(u),
    moneda: "USD",
    estado: ESTADOS[u.codigo] ?? "disponible",
    poligono: enPlanta(u.forma),
  }));
  fallar("Unidades", (await db.from("units").insert(unidades)).error);
  log(`${pisos.length} pisos y ${unidades.length} unidades (${UNIDADES.filter((u) => u.categoria === "departamento").length} departamentos, local y ${UNIDADES.filter((u) => u.categoria === "cochera").length} cocheras)`);

  // 7. Espacios comunes con su punto en la planta y sus imágenes
  const espacios = ESPACIOS.map((e, orden) => ({
    id: randomUUID(),
    project_id: projectId,
    floor_id: pisoId(e.piso),
    nombre: e.nombre,
    slug: e.slug,
    descripcion: e.descripcion,
    punto: puntoEnPlanta(e.punto),
    orden,
  }));
  fallar("Espacios", (await db.from("project_spaces").insert(espacios)).error);
  for (const [i, e] of ESPACIOS.entries()) {
    const filas = [];
    for (const [orden, img] of e.imagenes.entries()) filas.push({ space_id: espacios[i].id, nombre: img.nombre, url: await render(img.pano, img.yaw), orden });
    fallar(`Imágenes de ${e.nombre}`, (await db.from("project_space_images").insert(filas)).error);
  }
  log(`Espacios: ${ESPACIOS.map((e) => e.nombre).join(", ")}`);

  // 8. Imágenes reales, si ya están en demo-mirador-2/
  if (hayImagenesReales()) {
    const { subidas, faltan } = await aplicarImagenesReales(db, agencyId, projectId, log);
    log(`Imágenes reales: ${subidas}${faltan.length ? ` (faltan: ${faltan.join(", ")})` : ""}`);
  }

  // 9. Leads y visitantes de muestra
  const actividad = await cargarActividadEdificio(db, agencyId, {
    projectId,
    pisos: pisos.map(({ id, numero }) => ({ id, numero })),
    unidades: unidades.map(({ id, codigo, floor_id, unit_type_id }) => ({ id, codigo, floor_id, unit_type_id })),
    ambientes,
    espacios: espacios.map(({ id, slug, floor_id }) => ({ id, slug, floor_id })),
  });
  const { caliente, tibio, frio } = actividad.niveles;
  log(`Actividad: ${actividad.leads} leads (${caliente} calientes, ${tibio} tibios, ${frio} fríos), ${actividad.visitantes} visitantes, ${actividad.eventos} eventos`);
  console.log(`\nListo. Web de prueba: /proyecto/${PROYECTO.slug}?agencia=desarrollos-demo`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
