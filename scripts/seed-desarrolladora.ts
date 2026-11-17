/**
 * Demo del módulo desarrolladora: tenant "Desarrollos Demo" con el proyecto "Edificio Mirador"
 * (Olavarría): 5 pisos, 3 tipologías con sus ambientes y 23 unidades con estados mezclados.
 * Imágenes provisorias (dibujos en SVG y vistas de panorámicas CC0) y polígonos aproximados.
 *   npm run seed:desarrolladora   → crea el tenant si falta y recrea el proyecto de ejemplo
 * Solo toca ese tenant: borra y vuelve a crear su proyecto `es_demo`.
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { borrarCarpetaPropiedad } from "@/lib/admin/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, TablesInsert } from "@/types/database";
import { descargarPanorama, fotoDesdePanorama, logoPng } from "./seed/imagenes.ts";

export const DESARROLLADORA_DEMO_ID = "d3a0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0d22";
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

// ---------------------------------------------------------------------------
// Fachada (1200×1500): 5 pisos de 190 px sobre la planta baja
// ---------------------------------------------------------------------------
const FACHADA = { ancho: 1200, alto: 1500, x1: 250, x2: 950, techo: 260, altoPiso: 190 };
const yPiso = (numero: number) => FACHADA.techo + (5 - numero) * FACHADA.altoPiso;

function svgFachada() {
  const { ancho, alto, x1, x2, techo, altoPiso } = FACHADA;
  const base = techo + 5 * altoPiso;
  const pisos = [5, 4, 3, 2, 1]
    .map((n) => {
      const y = yPiso(n);
      const ventanas = [0, 1, 2, 3]
        .map((i) => {
          const x = x1 + 30 + i * 165;
          return `<rect x="${x}" y="${y + 28}" width="145" height="112" fill="url(#vidrio)"/><line x1="${x + 72}" y1="${y + 28}" x2="${x + 72}" y2="${y + 140}" stroke="#f5f5f4" stroke-width="6"/>`;
        })
        .join("");
      return `${ventanas}
      <rect x="${x1 - 14}" y="${y + 150}" width="${x2 - x1 + 28}" height="16" fill="#e7e5e4"/>
      <rect x="${x1 - 14}" y="${y + 104}" width="${x2 - x1 + 28}" height="46" fill="#ffffff" opacity="0.35"/>
      <line x1="${x1 - 14}" y1="${y + 104}" x2="${x2 + 14}" y2="${y + 104}" stroke="#57534e" stroke-width="5"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6bb6ea"/><stop offset="1" stop-color="#e6f4fd"/></linearGradient>
    <linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9d0ea"/><stop offset="1" stop-color="#4b7ea8"/></linearGradient>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="url(#cielo)"/>
  <circle cx="1010" cy="170" r="70" fill="#fff7cc" opacity="0.9"/>
  <rect x="0" y="${base + 170}" width="${ancho}" height="${alto - base - 170}" fill="#9ca3af"/>
  <rect x="0" y="${base + 158}" width="${ancho}" height="22" fill="#d1d5db"/>
  <rect x="${x1}" y="${techo}" width="${x2 - x1}" height="${base - techo + 170}" fill="#f5f5f4"/>
  <rect x="${x2}" y="${techo}" width="46" height="${base - techo + 170}" fill="#d6d3d1"/>
  ${pisos}
  <rect x="${x1 - 20}" y="${techo - 34}" width="${x2 - x1 + 86}" height="38" fill="#44403c"/>
  <rect x="${x1 + 40}" y="${base + 30}" width="230" height="140" fill="url(#vidrio)"/>
  <rect x="${x2 - 270}" y="${base + 30}" width="230" height="140" fill="url(#vidrio)"/>
  <rect x="${(x1 + x2) / 2 - 60}" y="${base + 40}" width="120" height="130" fill="#292524"/>
  ${[110, 1090].map((x) => `<rect x="${x - 10}" y="${base + 20}" width="20" height="150" fill="#78350f"/><circle cx="${x}" cy="${base - 20}" r="95" fill="#4d7c0f"/><circle cx="${x - 45}" cy="${base + 20}" r="62" fill="#65a30d"/>`).join("")}
</svg>`;
}

// ---------------------------------------------------------------------------
// Planta de piso (1200×1200): frente abajo, contrafrente arriba, palier al medio
// ---------------------------------------------------------------------------
const PLANTA = { lado: 1200, x1: 80, x2: 1120, y1: 140, y2: 1060, palier1: 560, palier2: 640 };

type Hueco = { letra: string; caja: [number, number, number, number]; orientacion: string };
function huecos(cantidad: 4 | 5): Hueco[] {
  const { x1, x2, y1, y2, palier1, palier2 } = PLANTA;
  const medio = (x1 + x2) / 2;
  const frente: Hueco[] = [
    { letra: "A", caja: [x1, palier2, medio, y2], orientacion: "Noroeste" },
    { letra: "B", caja: [medio, palier2, x2, y2], orientacion: "Noreste" },
  ];
  const fondo: Hueco[] =
    cantidad === 5
      ? [
          { letra: "C", caja: [x1, y1, 460, palier1], orientacion: "Suroeste" },
          { letra: "D", caja: [460, y1, 740, palier1], orientacion: "Sur" },
          { letra: "E", caja: [740, y1, x2, palier1], orientacion: "Sureste" },
        ]
      : [
          { letra: "C", caja: [x1, y1, medio, palier1], orientacion: "Suroeste" },
          { letra: "D", caja: [medio, y1, x2, palier1], orientacion: "Sureste" },
        ];
  return [...frente, ...fondo];
}

function svgPlanta(cantidad: 4 | 5) {
  const { lado, x1, x2, y1, y2, palier1, palier2 } = PLANTA;
  const cajas = huecos(cantidad)
    .map(({ caja: [a, b, c, d] }) => `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}" fill="#ffffff" stroke="#1f2937" stroke-width="10"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" fill="#f8fafc"/>
  <rect x="${x1}" y="${palier1}" width="${x2 - x1}" height="${palier2 - palier1}" fill="#e2e8f0"/>
  ${cajas}
  <rect x="540" y="${palier1 + 8}" width="120" height="${palier2 - palier1 - 16}" fill="#94a3b8"/>
  <path d="M552 ${palier1 + 16} H648 M552 ${palier1 + 32} H648 M552 ${palier1 + 48} H648 M552 ${palier1 + 64} H648" stroke="#f8fafc" stroke-width="4"/>
  <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="none" stroke="#1f2937" stroke-width="16"/>
  <text x="${lado / 2}" y="${y2 + 70}" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#64748b" text-anchor="middle">Frente · calle</text>
  <text x="${lado / 2}" y="${y1 - 40}" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#64748b" text-anchor="middle">Contrafrente</text>
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

type Render = { nombre: string; pano: string; yaw: number };
type Tipologia = Pick<TablesInsert<"unit_types">, "nombre" | "ambientes" | "dormitorios" | "banos"> & {
  clave: "mono" | "dos" | "tres";
  maqueta: Ambiente[];
  renders: Render[];
  cubierta: number;
  total: number;
  precio: number;
};

const TIPOLOGIAS: Tipologia[] = [
  {
    clave: "mono",
    nombre: "Monoambiente",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    cubierta: 34,
    total: 38,
    precio: 48000,
    maqueta: [
      { caja: [80, 80, 1120, 560], piso: MADERA, muebles: cama(820, 130) + sillon(160, 130) + mesa(520, 400) },
      { caja: [80, 560, 640, 820], piso: CERAMICA, muebles: cocina(110, 730, 500) },
      { caja: [640, 560, 1120, 820], piso: CERAMICA, muebles: bano(700, 600) },
    ],
    renders: [
      { nombre: "Ambiente principal", pano: "hotel_room", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
      { nombre: "Balcón", pano: "veranda", yaw: 0 },
    ],
  },
  {
    clave: "dos",
    nombre: "2 ambientes",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    cubierta: 52,
    total: 58,
    precio: 72000,
    maqueta: [
      { caja: [80, 80, 640, 520], piso: MADERA, muebles: sillon(140, 120) + mesa(470, 400) },
      { caja: [80, 520, 380, 820], piso: CERAMICA, muebles: cocina(100, 740, 260) },
      { caja: [380, 520, 640, 820], piso: CERAMICA, muebles: bano(410, 570) },
      { caja: [640, 80, 1120, 820], piso: MADERA, muebles: cama(780, 130) },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 20 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Dormitorio", pano: "lythwood_room", yaw: 90 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
      { nombre: "Balcón", pano: "veranda", yaw: 0 },
    ],
  },
  {
    clave: "tres",
    nombre: "3 ambientes",
    ambientes: 3,
    dormitorios: 2,
    banos: 1,
    cubierta: 78,
    total: 86,
    precio: 105000,
    maqueta: [
      { caja: [80, 80, 620, 560], piso: MADERA, muebles: sillon(130, 120) + mesa(460, 420) },
      { caja: [80, 560, 400, 820], piso: CERAMICA, muebles: cocina(100, 740, 280) },
      { caja: [400, 560, 620, 820], piso: CERAMICA, muebles: bano(412, 600) },
      { caja: [620, 80, 1120, 450], piso: MADERA, muebles: cama(860, 100) },
      { caja: [620, 450, 1120, 820], piso: MADERA, muebles: cama(660, 520) },
    ],
    renders: [
      { nombre: "Living comedor", pano: "glasshouse_interior", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Dormitorio principal", pano: "hotel_room", yaw: 0 },
      { nombre: "Segundo dormitorio", pano: "lythwood_room", yaw: 270 },
      { nombre: "Baño", pano: "bathroom", yaw: 0 },
    ],
  },
];

/** Qué tipología va en cada lugar de la planta y si es la versión espejada. */
const REPARTO: Record<4 | 5, Record<string, { tipo: Tipologia["clave"]; espejada: boolean }>> = {
  5: {
    A: { tipo: "tres", espejada: false },
    B: { tipo: "tres", espejada: true },
    C: { tipo: "dos", espejada: false },
    D: { tipo: "mono", espejada: false },
    E: { tipo: "dos", espejada: true },
  },
  4: {
    A: { tipo: "tres", espejada: false },
    B: { tipo: "tres", espejada: true },
    C: { tipo: "dos", espejada: false },
    D: { tipo: "dos", espejada: true },
  },
};

const ESTADOS: Record<string, Enums<"estado_unidad">> = {
  "1A": "vendida", "1B": "vendida", "1C": "reservada", "1D": "vendida", "1E": "vendida",
  "2A": "vendida", "2C": "reservada", "2D": "vendida",
  "3B": "reservada", "3D": "vendida",
  "4A": "reservada", "4C": "vendida",
  "5B": "reservada",
};

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

  // El admin de la plataforma entra a su panel (ADMIN_EMAIL de .env.local).
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 200 });
    const usuario = usuarios?.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) {
      const { error } = await db.from("agency_members").upsert({ user_id: usuario.id, agency_id: agencyId, rol: "admin" }, { onConflict: "user_id,agency_id" });
      fallar("No se pudo sumar al admin", error);
      log(`${email} es admin de Desarrollos Demo`);
    }
  }

  // 2. Proyecto de ejemplo: se borra y se vuelve a crear (cascada a pisos, tipologías y unidades)
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
        descripcion: "Departamentos de 1, 2 y 3 ambientes en pozo, a pasos del centro. Entrega estimada: diciembre de 2028.",
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
  for (const [orden, t] of TIPOLOGIAS.entries()) {
    const id = randomUUID();
    idTipo.set(t.clave, id);
    const { nombre, ambientes, dormitorios, banos, maqueta, renders: lista } = t;
    const datos = { nombre, ambientes, dormitorios, banos };
    fallar(
      `Tipología ${t.nombre}`,
      (await db.from("unit_types").insert({ ...datos, id, project_id: projectId, orden, maqueta_url: await subir(carpeta, await webp(svgMaqueta(maqueta), 1200)), maqueta_ancho: 1200, maqueta_alto: 900 })).error,
    );
    const filas: TablesInsert<"unit_type_rooms">[] = [];
    for (const [i, r] of lista.entries()) {
      const llave = `${r.pano}:${r.yaw}`;
      if (!renders.has(llave)) {
        const foto = await fotoDesdePanorama(panos.get(r.pano)!, { pano: r.pano, yaw: r.yaw });
        renders.set(llave, await subir(carpeta, await sharp(foto.grande).resize(1600).webp({ quality: 74 }).toBuffer()));
      }
      filas.push({ unit_type_id: id, nombre: r.nombre, render_url: renders.get(llave)!, orden: i });
    }
    fallar(`Ambientes de ${t.nombre}`, (await db.from("unit_type_rooms").insert(filas)).error);
    log(`Tipología ${t.nombre}: maqueta y ${lista.length} renders`);
  }

  // 4. Pisos y unidades
  const plantas = new Map<number, string>();
  let unidades = 0;
  for (const numero of [1, 2, 3, 4, 5]) {
    const cantidad = numero <= 3 ? 5 : 4;
    if (!plantas.has(cantidad)) plantas.set(cantidad, await subir(carpeta, await webp(svgPlanta(cantidad), PLANTA.lado)));
    const floorId = randomUUID();
    const y = yPiso(numero);
    fallar(
      `Piso ${numero}`,
      (
        await db.from("project_floors").insert({
          id: floorId,
          project_id: projectId,
          numero,
          nombre: `Piso ${numero}`,
          planta_url: plantas.get(cantidad)!,
          planta_ancho: PLANTA.lado,
          planta_alto: PLANTA.lado,
          poligono: rect(FACHADA.x1 - 14, y, FACHADA.x2 + 14, y + FACHADA.altoPiso, FACHADA.ancho, FACHADA.alto),
        })
      ).error,
    );
    const filas = huecos(cantidad).map(({ letra, caja, orientacion }): TablesInsert<"units"> => {
      const codigo = `${numero}${letra}`;
      const { tipo, espejada } = REPARTO[cantidad][letra];
      const t = TIPOLOGIAS.find((x) => x.clave === tipo)!;
      // Los 2 ambientes de los pisos de 4 unidades son más grandes; los del último piso van "a consultar".
      const extra = cantidad === 4 && tipo === "dos" ? 9 : 0;
      return {
        project_id: projectId,
        floor_id: floorId,
        unit_type_id: idTipo.get(tipo)!,
        codigo,
        superficie_cubierta: t.cubierta + extra,
        superficie_total: t.total + extra + (extra ? 3 : 0),
        orientacion,
        precio: numero === 5 ? null : Math.round((t.precio * (1 + 0.02 * (numero - 1)) * (1 + extra / 60)) / 500) * 500,
        estado: ESTADOS[codigo] ?? "disponible",
        espejada,
        poligono: rect(...caja, PLANTA.lado, PLANTA.lado),
      };
    });
    fallar(`Unidades del piso ${numero}`, (await db.from("units").insert(filas)).error);
    unidades += filas.length;
  }
  log(`5 pisos y ${unidades} unidades`);
  console.log(`\nListo. Web de prueba: /proyecto/${SLUG}?agencia=desarrollos-demo`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
