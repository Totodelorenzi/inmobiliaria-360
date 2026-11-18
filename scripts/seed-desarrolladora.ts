/**
 * Demo del módulo desarrolladora: tenant "Desarrollos Demo" con el proyecto "Edificio Mirador"
 * (Olavarría): planta baja y 4 pisos, 3 tipologías con sus ambientes, 24 unidades con estados
 * mezclados y 10 leads de muestra con historial.
 * Si existe la carpeta demo-mirador/ usa esas imágenes; si no, dibujos provisorios en SVG y vistas
 * de panorámicas CC0. Los polígonos son aproximados (se ajustan en el panel).
 *   npm run seed:desarrolladora   → crea el tenant si falta y recrea el proyecto y su actividad
 * Solo toca ese tenant: borra y vuelve a crear su proyecto `es_demo`, sus leads y sus visitantes.
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { borrarCarpetaPropiedad } from "@/lib/admin/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, TablesInsert } from "@/types/database";
import { cargarActividadEdificio } from "./seed/actividad-edificio.ts";
import { aplicarImagenesMirador, DESARROLLADORA_DEMO_ID, hayImagenesMirador } from "./seed/imagenes-mirador.ts";
import { descargarPanorama, fotoDesdePanorama, logoPng } from "./seed/imagenes.ts";

const SLUG = "edificio-mirador";
const log = (texto: string) => console.log(`• ${texto}`);

type Punto = [number, number];
const pct = (v: number, total: number) => Math.round((v / total) * 1000) / 10;
/** Rectángulo en píxeles del dibujo → polígono en porcentajes de la imagen. */
const rect = (x1: number, y1: number, x2: number, y2: number, ancho: number, alto: number): Punto[] => [
  [pct(x1, ancho), pct(y1, alto)],
  [pct(x2, ancho), pct(y1, alto)],
  [pct(x2, ancho), pct(y2, alto)],
  [pct(x1, ancho), pct(y2, alto)],
];

const PISOS = [0, 1, 2, 3, 4];
const nombrePiso = (numero: number) => (numero === 0 ? "Planta baja" : `${numero}° piso`);
const codigoUnidad = (numero: number, letra: string) => (numero === 0 ? `PB ${letra}` : `${numero}${letra}`);

// ---------------------------------------------------------------------------
// Fachada (1200×1500): planta baja y 4 pisos de 200 px
// ---------------------------------------------------------------------------
const FACHADA = { ancho: 1200, alto: 1500, x1: 220, x2: 980, techo: 300, altoPiso: 200 };
const yPiso = (numero: number) => FACHADA.techo + (4 - numero) * FACHADA.altoPiso;

function svgFachada() {
  const { ancho, alto, x1, x2, techo, altoPiso } = FACHADA;
  const vereda = techo + 5 * altoPiso;
  // Una ventana por unidad, del ancho proporcional a la unidad (A, B, C, D y E).
  const ventanas = (y: number) =>
    UBICACION.map(([a, b]) => {
      const xa = x1 + ((a - PLANTA.x1) / (PLANTA.x2 - PLANTA.x1)) * (x2 - x1) + 14;
      const xb = x1 + ((b - PLANTA.x1) / (PLANTA.x2 - PLANTA.x1)) * (x2 - x1) - 14;
      return `<rect x="${xa}" y="${y + 30}" width="${xb - xa}" height="118" fill="url(#vidrio)"/>`;
    }).join("");
  const pisos = [4, 3, 2, 1]
    .map((n) => {
      const y = yPiso(n);
      return `${ventanas(y)}
      <rect x="${x1 - 14}" y="${y + 150}" width="${x2 - x1 + 28}" height="14" fill="#e7e5e4"/>
      <rect x="${x1 - 14}" y="${y + 108}" width="${x2 - x1 + 28}" height="42" fill="#ffffff" opacity="0.35"/>
      <line x1="${x1 - 14}" y1="${y + 108}" x2="${x2 + 14}" y2="${y + 108}" stroke="#57534e" stroke-width="5"/>`;
    })
    .join("");
  const pb = yPiso(0);
  const [hallA, hallB] = [UBICACION[2][0], UBICACION[2][1]].map((x) => x1 + ((x - PLANTA.x1) / (PLANTA.x2 - PLANTA.x1)) * (x2 - x1));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6bb6ea"/><stop offset="1" stop-color="#e6f4fd"/></linearGradient>
    <linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9d0ea"/><stop offset="1" stop-color="#4b7ea8"/></linearGradient>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="url(#cielo)"/>
  <circle cx="1040" cy="170" r="70" fill="#fff7cc" opacity="0.9"/>
  <rect x="0" y="${vereda}" width="${ancho}" height="${alto - vereda}" fill="#9ca3af"/>
  <rect x="0" y="${vereda - 12}" width="${ancho}" height="22" fill="#d1d5db"/>
  <rect x="${x1}" y="${techo}" width="${x2 - x1}" height="${vereda - techo}" fill="#f5f5f4"/>
  <rect x="${x2}" y="${techo}" width="46" height="${vereda - techo}" fill="#d6d3d1"/>
  ${pisos}
  ${ventanas(pb).replace(/height="118"/g, 'height="150"')}
  <rect x="${hallA + 10}" y="${pb + 20}" width="${hallB - hallA - 20}" height="${altoPiso - 20}" fill="#292524"/>
  <rect x="${hallA + 40}" y="${pb + 50}" width="${hallB - hallA - 80}" height="${altoPiso - 50}" fill="url(#vidrio)" opacity="0.6"/>
  <rect x="${x1 - 20}" y="${techo - 34}" width="${x2 - x1 + 86}" height="38" fill="#44403c"/>
  ${[110, 1110].map((x) => `<rect x="${x - 10}" y="${vereda - 150}" width="20" height="150" fill="#78350f"/><circle cx="${x}" cy="${vereda - 190}" r="80" fill="#4d7c0f"/><circle cx="${x - 40}" cy="${vereda - 150}" r="55" fill="#65a30d"/>`).join("")}
</svg>`;
}

// ---------------------------------------------------------------------------
// Plantas (1200×1200): pasillo y escalera atrás, las 5 unidades al frente (abajo).
// Ancho proporcional a los metros: A y B 1 dormitorio, C y D 2 dormitorios, E 3 en esquina.
// ---------------------------------------------------------------------------
const PLANTA = { lado: 1200, x1: 80, x2: 1120, y1: 140, y2: 1060, pasillo: 380 };
const LETRAS = ["A", "B", "C", "D", "E"] as const;
const UBICACION: [number, number][] = [
  [80, 218],
  [218, 356],
  [356, 570],
  [570, 784],
  [784, 1120],
];
const cajaUnidad = (i: number): [number, number, number, number] => [UBICACION[i][0], PLANTA.pasillo, UBICACION[i][1], PLANTA.y2];

function svgPlanta(baja: boolean) {
  const { lado, x1, x2, y1, y2, pasillo } = PLANTA;
  const cajas = LETRAS.map((letra, i) => {
    const [a, b, c, d] = cajaUnidad(i);
    if (baja && letra === "C") {
      return `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}" fill="#e2e8f0" stroke="#1f2937" stroke-width="10"/>
      <text x="${(a + c) / 2}" y="${(b + d) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#475569" text-anchor="middle">Hall</text>`;
    }
    return `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}" fill="#ffffff" stroke="#1f2937" stroke-width="10"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" fill="#f8fafc"/>
  <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${pasillo - y1}" fill="#e2e8f0"/>
  <rect x="420" y="${y1 + 20}" width="140" height="180" fill="#94a3b8"/>
  <path d="M432 ${y1 + 40} H548 M432 ${y1 + 70} H548 M432 ${y1 + 100} H548 M432 ${y1 + 130} H548 M432 ${y1 + 160} H548" stroke="#f8fafc" stroke-width="5"/>
  <rect x="600" y="${y1 + 20}" width="120" height="120" fill="#64748b"/>
  ${cajas}
  <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="none" stroke="#1f2937" stroke-width="16"/>
  <text x="${lado / 2}" y="${y2 + 70}" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#64748b" text-anchor="middle">Frente · Norte</text>
</svg>`;
}
// ---------------------------------------------------------------------------
// Maquetas vistas desde arriba (1200×900, sin textos: se pueden mostrar espejadas)
// ---------------------------------------------------------------------------
const MADERA = "#e4cfa9";
const CERAMICA = "#dbe4e8";
const cama = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="220" height="250" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/><rect x="${x + 14}" y="${y + 14}" width="88" height="54" rx="8" fill="#cbd5e1"/><rect x="${x + 118}" y="${y + 14}" width="88" height="54" rx="8" fill="#cbd5e1"/><rect x="${x}" y="${y + 110}" width="220" height="140" rx="10" fill="#7c93b0"/>`;
const sillon = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="240" height="96" rx="18" fill="#64748b"/><rect x="${x + 14}" y="${y + 30}" width="212" height="56" rx="12" fill="#94a3b8"/><rect x="${x + 40}" y="${y + 130}" width="160" height="70" rx="8" fill="#a16207" opacity="0.8"/>`;
const mesa = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y}" r="62" fill="#b45309" opacity="0.85"/>${[0, 90, 180, 270].map((g) => `<rect x="${x - 22}" y="${y - 104}" width="44" height="34" rx="8" fill="#475569" transform="rotate(${g} ${x} ${y})"/>`).join("")}`;
const cocina = (x: number, y: number, w: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="64" fill="#475569"/><rect x="${x + 20}" y="${y + 12}" width="70" height="40" rx="6" fill="#cbd5e1"/><circle cx="${x + w - 80}" cy="${y + 22}" r="12" fill="#1e293b"/><circle cx="${x + w - 44}" cy="${y + 22}" r="12" fill="#1e293b"/><circle cx="${x + w - 80}" cy="${y + 48}" r="10" fill="#1e293b"/><circle cx="${x + w - 44}" cy="${y + 48}" r="10" fill="#1e293b"/>`;
const bano = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="90" height="190" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/><ellipse cx="${x + 160}" cy="${y + 40}" rx="30" ry="38" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/><rect x="${x + 130}" y="${y + 130}" width="70" height="50" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>`;

type Ambiente = { caja: [number, number, number, number]; piso: string; muebles: string };
function svgMaqueta(ambientes: Ambiente[]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#f1f5f9"/>
  ${ambientes.map(({ caja: [a, b, c, d], piso, muebles }) => `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}" fill="${piso}" stroke="#1f2937" stroke-width="12"/>${muebles}`).join("")}
  <rect x="80" y="80" width="1040" height="740" fill="none" stroke="#1f2937" stroke-width="18"/>
  <rect x="80" y="40" width="540" height="40" fill="#cbd5e1" stroke="#64748b" stroke-width="4"/>
</svg>`;
}

const planta = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="46" fill="#4d7c0f"/><circle cx="${x + 30}" cy="${y - 20}" r="30" fill="#65a30d"/>`;
const reposera = (x: number, y: number) => `<rect x="${x}" y="${y}" width="80" height="190" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>`;

type Render = { nombre: string; pano: string; yaw: number };
type Tipologia = Pick<TablesInsert<"unit_types">, "nombre" | "ambientes" | "dormitorios" | "banos"> & {
  clave: "t1" | "t2" | "t3";
  maqueta: Ambiente[];
  renders: Render[];
  cubierta: number;
  total: number;
};

const TIPOLOGIAS: Tipologia[] = [
  {
    clave: "t1",
    nombre: "1 dormitorio",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    cubierta: 41,
    total: 45,
    maqueta: [
      { caja: [80, 80, 620, 560], piso: MADERA, muebles: sillon(130, 120) + mesa(470, 420) },
      { caja: [80, 560, 400, 820], piso: CERAMICA, muebles: cocina(100, 740, 280) },
      { caja: [400, 560, 620, 820], piso: CERAMICA, muebles: bano(412, 600) },
      { caja: [620, 80, 1120, 820], piso: MADERA, muebles: cama(760, 130) },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 20 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Dormitorio", pano: "hotel_room", yaw: 0 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
    ],
  },
  {
    clave: "t2",
    nombre: "2 dormitorios",
    ambientes: 3,
    dormitorios: 2,
    banos: 1,
    cubierta: 64,
    total: 70,
    maqueta: [
      { caja: [80, 80, 580, 520], piso: MADERA, muebles: sillon(130, 120) + mesa(440, 400) },
      { caja: [80, 520, 360, 820], piso: CERAMICA, muebles: cocina(100, 740, 240) },
      { caja: [360, 520, 580, 820], piso: CERAMICA, muebles: bano(380, 580) },
      { caja: [580, 80, 1120, 450], piso: MADERA, muebles: cama(760, 110) },
      { caja: [580, 450, 1120, 820], piso: MADERA, muebles: cama(640, 520) },
    ],
    renders: [
      { nombre: "Living comedor", pano: "glasshouse_interior", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Dormitorio principal", pano: "lythwood_room", yaw: 90 },
      { nombre: "Segundo dormitorio", pano: "lythwood_room", yaw: 270 },
      { nombre: "Baño", pano: "bathroom", yaw: 0 },
    ],
  },
  {
    clave: "t3",
    nombre: "3 dormitorios",
    ambientes: 4,
    dormitorios: 3,
    banos: 1,
    cubierta: 96,
    total: 110,
    maqueta: [
      { caja: [80, 80, 560, 540], piso: MADERA, muebles: sillon(130, 120) + mesa(430, 410) },
      { caja: [80, 540, 340, 820], piso: CERAMICA, muebles: cocina(100, 740, 220) },
      { caja: [340, 540, 560, 820], piso: CERAMICA, muebles: bano(352, 590) },
      { caja: [560, 80, 860, 450], piso: MADERA, muebles: cama(600, 120) },
      { caja: [860, 80, 1120, 450], piso: MADERA, muebles: cama(880, 120) },
      { caja: [560, 450, 860, 820], piso: MADERA, muebles: cama(600, 520) },
      { caja: [860, 450, 1120, 820], piso: "#d6d3d1", muebles: planta(940, 540) + reposera(1000, 600) },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 20 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Dormitorio principal", pano: "hotel_room", yaw: 0 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
      { nombre: "Balcón terraza", pano: "veranda", yaw: 0 },
    ],
  },
];

/** Qué tipología va en cada lugar de la planta y si es la versión espejada (B de A, D de C). */
const REPARTO: Record<(typeof LETRAS)[number], { tipo: Tipologia["clave"]; espejada: boolean; orientacion: string }> = {
  A: { tipo: "t1", espejada: false, orientacion: "Norte (frente)" },
  B: { tipo: "t1", espejada: true, orientacion: "Norte (frente)" },
  C: { tipo: "t2", espejada: false, orientacion: "Norte (frente)" },
  D: { tipo: "t2", espejada: true, orientacion: "Norte (frente)" },
  E: { tipo: "t3", espejada: false, orientacion: "Norte y Oeste (esquina)" },
};

/** Más vendidas en los pisos altos; el resto, disponibles. */
const ESTADOS: Record<string, Enums<"estado_unidad">> = {
  "4A": "vendida", "4E": "vendida", "3B": "vendida", "3E": "vendida", "2D": "vendida",
  "4C": "reservada", "3D": "reservada", "2A": "reservada", "1E": "reservada", "PB B": "reservada",
};
/** Precio "a consultar". */
const CONSULTAR = new Set(["4B", "4D", "3C", "PB E"]);
/** Dólares por m² total: la planta baja un poco más barata y cada piso un 3 % más caro. */
const USD_M2 = 1700;
const precio = (numero: number, total: number) => Math.round((USD_M2 * total * (numero === 0 ? 0.96 : 1 + 0.03 * (numero - 1))) / 500) * 500;

const webp = (svg: string, ancho: number) => sharp(Buffer.from(svg), { density: 144 }).resize(ancho).webp({ quality: 84 }).toBuffer();

async function main() {
  const db = createAdminClient();
  const agencyId = DESARROLLADORA_DEMO_ID;
  const fallar = (contexto: string, error: { message: string } | null) => {
    if (error) throw new Error(`${contexto}: ${error.message}`);
  };

  async function subir(carpeta: string, datos: Buffer, tipo = "image/webp") {
    const ruta = `${carpeta}/${randomUUID()}.${tipo === "image/png" ? "png" : "webp"}`;
    const { error } = await db.storage.from("fotos").upload(ruta, datos, { contentType: tipo, cacheControl: "31536000" });
    fallar(`No se pudo subir ${ruta}`, error);
    return db.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  }

  // 1. Tenant
  const { data: existente, error: errorAgencia } = await db.from("agencies").select("id").eq("id", agencyId).maybeSingle();
  fallar("No se pudo leer la base (¿falta la migración de desarrolladora?)", errorAgencia);
  if (!existente) {
    const color = "#1d4d4f";
    const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140"><rect x="20" y="24" width="70" height="96" fill="${color}"/><rect x="96" y="56" width="40" height="64" fill="${color}" opacity="0.6"/><text x="156" y="92" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="${color}">Desarrollos Demo</text></svg>`;
    const logo_url = await subir(`${agencyId}/agencia`, await logoPng(logo), "image/png");
    const { error } = await db.from("agencies").insert({
      id: agencyId,
      nombre: "Desarrollos Demo",
      subdominio: "desarrollos-demo",
      modulos: ["desarrolladora"],
      color_primario: color,
      logo_url,
      whatsapp: "5492284000000",
      email: "hola@desarrollosdemo.example",
      direccion: "Olavarría, Buenos Aires",
    });
    fallar("No se pudo crear el tenant", error);
    log("Tenant creado: Desarrollos Demo (?agencia=desarrollos-demo)");
  }

  // Entran a su panel el admin de la plataforma (ADMIN_EMAIL) y el usuario de demo para presentaciones (DEMO_EMAIL).
  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
  for (const [variable, rol] of [["ADMIN_EMAIL", "admin"], ["DEMO_EMAIL", "agente"]] as const) {
    const email = process.env[variable]?.trim().toLowerCase();
    const usuario = email && usuarios?.users.find((u) => u.email?.toLowerCase() === email);
    if (!usuario) continue;
    const { error } = await db.from("agency_members").upsert({ user_id: usuario.id, agency_id: agencyId, rol }, { onConflict: "user_id,agency_id" });
    fallar("No se pudo sumar al usuario", error);
    log(`${email} es ${rol} de Desarrollos Demo`);
  }

  // 2. Proyecto de ejemplo: se borra y se vuelve a crear (cascada a pisos, tipologías, unidades y sus eventos)
  const { data: viejos } = await db.from("projects").select("id").eq("agency_id", agencyId).eq("es_demo", true);
  for (const { id } of viejos ?? []) await borrarCarpetaPropiedad(db, agencyId, id);
  if (viejos?.length) fallar("No se pudo borrar el proyecto anterior", (await db.from("projects").delete().eq("agency_id", agencyId).eq("es_demo", true)).error);

  const projectId = randomUUID();
  const carpeta = `${agencyId}/${projectId}`;
  fallar(
    "No se pudo crear el proyecto",
    (
      await db.from("projects").insert({
        id: projectId,
        agency_id: agencyId,
        nombre: "Edificio Mirador",
        slug: SLUG,
        ciudad: "Olavarría",
        direccion: "Av. Colón 2400",
        descripcion: "Departamentos de 1, 2 y 3 dormitorios en pozo, todos al frente, a pasos del centro. Entrega estimada: diciembre de 2028.",
        fachada_url: await subir(carpeta, await webp(svgFachada(), FACHADA.ancho)),
        fachada_ancho: FACHADA.ancho,
        fachada_alto: FACHADA.alto,
        publicado: true,
        es_demo: true,
      })
    ).error,
  );
  log("Proyecto: Edificio Mirador (fachada lista)");

  // 3. Tipologías con maqueta y renders
  const panos = new Map<string, Buffer>();
  for (const id of new Set(TIPOLOGIAS.flatMap((t) => t.renders.map((r) => r.pano)))) panos.set(id, await descargarPanorama(id));
  const renders = new Map<string, string>();
  const idTipo = new Map<Tipologia["clave"], string>();
  const ambientes = new Map<string, string[]>();
  for (const [orden, t] of TIPOLOGIAS.entries()) {
    const id = randomUUID();
    idTipo.set(t.clave, id);
    const { nombre, dormitorios, banos, maqueta, renders: lista } = t;
    fallar(
      `Tipología ${nombre}`,
      (
        await db.from("unit_types").insert({
          id,
          project_id: projectId,
          nombre,
          ambientes: t.ambientes,
          dormitorios,
          banos,
          orden,
          maqueta_url: await subir(carpeta, await webp(svgMaqueta(maqueta), 1200)),
          maqueta_ancho: 1200,
          maqueta_alto: 900,
        })
      ).error,
    );
    const filas: (TablesInsert<"unit_type_rooms"> & { id: string })[] = [];
    for (const [i, r] of lista.entries()) {
      const llave = `${r.pano}:${r.yaw}`;
      if (!renders.has(llave)) {
        const foto = await fotoDesdePanorama(panos.get(r.pano)!, { pano: r.pano, yaw: r.yaw, hfov: 95 });
        renders.set(llave, await subir(carpeta, await sharp(foto.grande).resize(1600).webp({ quality: 74 }).toBuffer()));
      }
      filas.push({ id: randomUUID(), unit_type_id: id, nombre: r.nombre, render_url: renders.get(llave)!, orden: i });
    }
    fallar(`Ambientes de ${nombre}`, (await db.from("unit_type_rooms").insert(filas)).error);
    ambientes.set(id, filas.map((f) => f.id));
    log(`Tipología ${nombre}: maqueta y ${lista.length} renders`);
  }

  // 4. Pisos y unidades: los pisos 1 a 4 comparten la planta tipo; la planta baja tiene la suya (la C es el hall).
  const plantaTipo = await subir(carpeta, await webp(svgPlanta(false), PLANTA.lado));
  const plantaBaja = await subir(carpeta, await webp(svgPlanta(true), PLANTA.lado));
  const pisos: { id: string; numero: number }[] = [];
  const unidades: (TablesInsert<"units"> & { id: string })[] = [];
  for (const numero of PISOS) {
    const floorId = randomUUID();
    const y = yPiso(numero);
    fallar(
      nombrePiso(numero),
      (
        await db.from("project_floors").insert({
          id: floorId,
          project_id: projectId,
          numero,
          nombre: nombrePiso(numero),
          planta_url: numero === 0 ? plantaBaja : plantaTipo,
          planta_ancho: PLANTA.lado,
          planta_alto: PLANTA.lado,
          poligono: rect(FACHADA.x1 - 14, y, FACHADA.x2 + 14, y + FACHADA.altoPiso, FACHADA.ancho, FACHADA.alto),
        })
      ).error,
    );
    pisos.push({ id: floorId, numero });
    for (const [i, letra] of LETRAS.entries()) {
      if (numero === 0 && letra === "C") continue;
      const codigo = codigoUnidad(numero, letra);
      const { tipo, espejada, orientacion } = REPARTO[letra];
      const t = TIPOLOGIAS.find((x) => x.clave === tipo)!;
      unidades.push({
        id: randomUUID(),
        project_id: projectId,
        floor_id: floorId,
        unit_type_id: idTipo.get(tipo)!,
        codigo,
        superficie_cubierta: t.cubierta,
        superficie_total: t.total,
        orientacion,
        precio: CONSULTAR.has(codigo) ? null : precio(numero, t.total),
        moneda: "USD",
        estado: ESTADOS[codigo] ?? "disponible",
        espejada,
        poligono: rect(...cajaUnidad(i), PLANTA.lado, PLANTA.lado),
      });
    }
  }
  fallar("Unidades", (await db.from("units").insert(unidades)).error);
  log(`${pisos.length} pisos y ${unidades.length} unidades`);

  // 5. Imágenes reales, si ya están en demo-mirador/
  if (hayImagenesMirador()) {
    const { subidas, faltan } = await aplicarImagenesMirador(db, agencyId, projectId, log);
    log(`Imágenes reales: ${subidas}${faltan.length ? ` (faltan: ${faltan.join(", ")})` : ""}`);
  }

  // 6. Leads y visitantes de muestra
  const actividad = await cargarActividadEdificio(db, agencyId, {
    projectId,
    pisos,
    unidades: unidades.map(({ id, codigo, floor_id, unit_type_id }) => ({ id, codigo, floor_id, unit_type_id })),
    ambientes,
  });
  const { caliente, tibio, frio } = actividad.niveles;
  log(`Actividad: ${actividad.leads} leads (${caliente} calientes, ${tibio} tibios, ${frio} fríos), ${actividad.visitantes} visitantes, ${actividad.eventos} eventos`);
  console.log(`\nListo. Web de prueba: /proyecto/${SLUG}?agencia=desarrollos-demo`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
