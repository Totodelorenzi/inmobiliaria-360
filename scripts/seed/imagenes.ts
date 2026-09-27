/**
 * Imágenes del seed: descarga panorámicas CC0 de Poly Haven (con caché local), las prepara
 * para el tour, genera "fotos" en perspectiva a partir de ellas y dibuja planos y fachada en SVG.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import type { Vista } from "./datos.ts";

const CACHE = new URL("../.cache/polyhaven/", import.meta.url);
const UA = { "User-Agent": "inmobiliaria-360-seed (datos de ejemplo)" };

export type Imagen = { grande: Buffer; mini: Buffer; extGrande: "jpg" | "webp" | "png" };

/** Tonemapped JPG de una HDRI de Poly Haven (CC0). Se descarga una sola vez. */
export async function descargarPanorama(id: string): Promise<Buffer> {
  const archivo = new URL(`${id}.jpg`, CACHE);
  try {
    return await readFile(archivo);
  } catch {
    // no está en caché
  }
  const info = (await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA })).json()) as { tonemapped?: { url: string } };
  if (!info.tonemapped?.url) throw new Error(`Poly Haven no tiene JPG para ${id}`);
  const res = await fetch(info.tonemapped.url, { headers: UA });
  if (!res.ok) throw new Error(`No se pudo descargar ${id}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(CACHE, { recursive: true });
  await writeFile(archivo, buffer);
  return buffer;
}

/** Panorámica para el tour: 5656×2828 (≤16 M píxeles, igual que el panel) + miniatura. */
export async function panoramaTour(original: Buffer): Promise<Imagen> {
  const base = sharp(original).rotate();
  const [grande, mini] = await Promise.all([
    base.clone().resize(5656, 2828, { fit: "fill" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    base.clone().resize(480, 240, { fit: "fill" }).jpeg({ quality: 72, mozjpeg: true }).toBuffer(),
  ]);
  return { grande, mini, extGrande: "jpg" };
}

const cacheRaw = new Map<string, Promise<{ data: Buffer; ancho: number; alto: number }>>();

function panoramaRaw(id: string, original: Buffer) {
  if (!cacheRaw.has(id)) {
    cacheRaw.set(
      id,
      sharp(original)
        .resize(4096, 2048, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => ({ data, ancho: info.width, alto: info.height })),
    );
  }
  return cacheRaw.get(id)!;
}

/**
 * "Foto" rectilínea desde una panorámica equirectangular (proyección gnomónica con
 * interpolación bilineal): las líneas rectas salen rectas, como con una cámara común.
 */
export async function fotoDesdePanorama(original: Buffer, vista: Vista): Promise<Imagen> {
  const { data, ancho: W, alto: H } = await panoramaRaw(vista.pano, original);
  const salidaW = 2400;
  const salidaH = 1800;
  const rad = Math.PI / 180;
  const tanH = Math.tan(((vista.hfov ?? 80) * rad) / 2);
  const tanV = (tanH * salidaH) / salidaW;
  const [cy, sy] = [Math.cos(vista.yaw * rad), Math.sin(vista.yaw * rad)];
  const p = (vista.pitch ?? 0) * rad;
  const [cp, sp] = [Math.cos(p), Math.sin(p)];
  const salida = Buffer.alloc(salidaW * salidaH * 3);

  for (let j = 0; j < salidaH; j++) {
    const y = (1 - (2 * (j + 0.5)) / salidaH) * tanV;
    for (let i = 0; i < salidaW; i++) {
      const x = ((2 * (i + 0.5)) / salidaW - 1) * tanH;
      // Rayo de la cámara rotado por pitch (eje X) y yaw (eje Y).
      const y1 = y * cp + sp;
      const z1 = -y * sp + cp;
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;
      const lon = Math.atan2(x2, z2);
      const lat = Math.atan2(y1, Math.hypot(x2, z2));
      const u = (lon / (2 * Math.PI) + 0.5) * W - 0.5;
      const v = Math.min(H - 1.001, Math.max(0, (0.5 - lat / Math.PI) * H - 0.5));
      const u0 = Math.floor(u);
      const v0 = Math.floor(v);
      const fu = u - u0;
      const fv = v - v0;
      const ua = ((u0 % W) + W) % W;
      const ub = (ua + 1) % W;
      const o = (j * salidaW + i) * 3;
      for (let c = 0; c < 3; c++) {
        const a = data[(v0 * W + ua) * 3 + c];
        const b = data[(v0 * W + ub) * 3 + c];
        const d = data[((v0 + 1) * W + ua) * 3 + c];
        const e = data[((v0 + 1) * W + ub) * 3 + c];
        salida[o + c] = (a * (1 - fu) + b * fu) * (1 - fv) + (d * (1 - fu) + e * fu) * fv;
      }
    }
  }
  const imagen = sharp(salida, { raw: { width: salidaW, height: salidaH, channels: 3 } });
  const [grande, mini] = await Promise.all([
    imagen.clone().webp({ quality: 80 }).toBuffer(),
    imagen.clone().resize(800, 600).jpeg({ quality: 75, mozjpeg: true }).toBuffer(),
  ]);
  return { grande, mini, extGrande: "webp" };
}

/** SVG → imagen grande (WebP) + miniatura (JPG), como las que genera el panel. */
export async function desdeSvg(svg: string, ancho: number, anchoMini: number): Promise<Imagen> {
  const base = sharp(Buffer.from(svg), { density: 144 }).resize(ancho).flatten({ background: "#ffffff" });
  const [grande, mini] = await Promise.all([
    base.clone().webp({ quality: 88 }).toBuffer(),
    base.clone().resize(anchoMini).jpeg({ quality: 78, mozjpeg: true }).toBuffer(),
  ]);
  return { grande, mini, extGrande: "webp" };
}

export async function logoPng(svg: string) {
  return sharp(Buffer.from(svg), { density: 144 }).resize(600).png().toBuffer();
}

// ---------------------------------------------------------------------------
// Dibujos en SVG
// ---------------------------------------------------------------------------

const TEXTO = `font-family="Arial, Helvetica, sans-serif"`;

function etiqueta(x: number, y: number, titulo: string, detalle: string) {
  return `<text x="${x}" y="${y}" ${TEXTO} font-size="34" font-weight="700" fill="#1f2937" text-anchor="middle">${titulo}</text>
  <text x="${x}" y="${y + 40}" ${TEXTO} font-size="26" fill="#4b5563" text-anchor="middle">${detalle}</text>`;
}

/** El dibujo ocupa los primeros 1200 px de alto; abajo va una franja con el título. */
export const PROPORCION_DIBUJO = 1200 / 1320;

function marco(titulo: string, contenido: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1320" viewBox="0 0 1600 1320">
  <rect width="1600" height="1320" fill="#ffffff"/>
  <defs><pattern id="grilla" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#eef2f7" stroke-width="2"/></pattern></defs>
  <rect width="1600" height="1200" fill="url(#grilla)"/>
  <line x1="0" y1="1216" x2="1600" y2="1216" stroke="#e5e7eb" stroke-width="3"/>
  ${contenido}
  <g transform="translate(1500 1268) scale(0.8)"><circle r="44" fill="#fff" stroke="#1f2937" stroke-width="3"/><path d="M0 -34 L14 10 L0 2 L-14 10Z" fill="#1f2937"/><text y="-50" ${TEXTO} font-size="26" font-weight="700" text-anchor="middle">N</text></g>
  <text x="80" y="1262" ${TEXTO} font-size="30" font-weight="700" fill="#1f2937">${titulo}</text>
  <text x="80" y="1298" ${TEXTO} font-size="22" fill="#6b7280">Plano ilustrativo · medidas aproximadas</text>
</svg>`;
}

const pared = `fill="none" stroke="#1f2937" stroke-width="14" stroke-linejoin="round"`;
const tabique = `stroke="#1f2937" stroke-width="8"`;
const puerta = (x: number, y: number, r: number, rot: number) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 L${r} 0 A${r} ${r} 0 0 1 0 ${r}" fill="none" stroke="#6b7280" stroke-width="3" stroke-dasharray="6 6"/><line x1="0" y1="0" x2="0" y2="${r}" stroke="#1f2937" stroke-width="5"/></g>`;
const ventana = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="10"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#60a5fa" stroke-width="4"/>`;

/** Unidad tipo de 2 ambientes (coincide con los puntos definidos en datos.ts). */
export function svgUnidad2Amb() {
  // Coordenadas en % del plano 1600×1200 → px.
  const X = (p: number) => (p / 100) * 1600;
  const Y = (p: number) => (p / 100) * 1200;
  return marco(
    "Unidad tipo · 2 ambientes · 52 m²",
    `
  <rect x="${X(8)}" y="${Y(2)}" width="${X(84)}" height="${Y(12)}" fill="#ecfdf5" stroke="#1f2937" stroke-width="6" stroke-dasharray="14 8"/>
  ${etiqueta(X(50), Y(7), "Balcón aterrazado", "8,4 × 1,6 m")}
  <rect x="${X(5)}" y="${Y(16)}" width="${X(90)}" height="${Y(80)}" ${pared}/>
  <line x1="${X(55)}" y1="${Y(16)}" x2="${X(55)}" y2="${Y(96)}" ${tabique}/>
  <line x1="${X(55)}" y1="${Y(58)}" x2="${X(95)}" y2="${Y(58)}" ${tabique}/>
  <line x1="${X(5)}" y1="${Y(62)}" x2="${X(30)}" y2="${Y(62)}" stroke="#9ca3af" stroke-width="4" stroke-dasharray="10 8"/>
  ${ventana(X(12), Y(16), X(48), Y(16))}${ventana(X(62), Y(16), X(88), Y(16))}
  ${puerta(X(55), Y(26), 90, 0)}${puerta(X(55), Y(64), 80, 0)}${puerta(X(5), Y(84), 90, -90)}
  <rect x="${X(8)}" y="${Y(86)}" width="${X(44)}" height="${Y(7)}" fill="#f3f4f6" stroke="#9ca3af" stroke-width="3"/>
  <rect x="${X(12)}" y="${Y(30)}" width="${X(18)}" height="${Y(10)}" rx="16" fill="#f3f4f6" stroke="#9ca3af" stroke-width="3"/>
  <rect x="${X(66)}" y="${Y(24)}" width="${X(20)}" height="${Y(22)}" rx="10" fill="#f3f4f6" stroke="#9ca3af" stroke-width="3"/>
  <rect x="${X(80)}" y="${Y(64)}" width="${X(12)}" height="${Y(26)}" rx="20" fill="#eff6ff" stroke="#9ca3af" stroke-width="3"/>
  ${etiqueta(X(30), Y(46), "Living comedor", "5,2 × 4,0 m")}
  ${etiqueta(X(30), Y(72), "Cocina integrada", "5,2 × 2,4 m")}
  ${etiqueta(X(72), Y(50), "Dormitorio", "3,6 × 3,3 m")}
  ${etiqueta(X(66), Y(78), "Baño", "2,0 × 2,6 m")}`,
  );
}

/** Terraza de amenities (coincide con los puntos definidos en datos.ts). */
export function svgAmenities() {
  const X = (p: number) => (p / 100) * 1600;
  const Y = (p: number) => (p / 100) * 1200;
  return marco(
    "Terraza de amenities · piso 12",
    `
  <rect x="${X(5)}" y="${Y(5)}" width="${X(90)}" height="${Y(90)}" ${pared}/>
  <rect x="${X(12)}" y="${Y(18)}" width="${X(36)}" height="${Y(40)}" rx="18" fill="#bae6fd" stroke="#0284c7" stroke-width="6"/>
  <path d="M${X(16)} ${Y(30)} q40 -20 80 0 t80 0 t80 0 t80 0 M${X(16)} ${Y(42)} q40 -20 80 0 t80 0 t80 0 t80 0" fill="none" stroke="#7dd3fc" stroke-width="5"/>
  ${etiqueta(X(30), Y(66), "Pileta", "10 × 5 m")}
  <rect x="${X(58)}" y="${Y(10)}" width="${X(35)}" height="${Y(42)}" fill="#fef3c7" stroke="#1f2937" stroke-width="8"/>
  <rect x="${X(84)}" y="${Y(14)}" width="${X(7)}" height="${Y(10)}" fill="#d1d5db" stroke="#6b7280" stroke-width="3"/>
  ${etiqueta(X(75), Y(34), "SUM con parrilla", "60 m²")}
  <rect x="${X(58)}" y="${Y(56)}" width="${X(35)}" height="${Y(34)}" fill="#ede9fe" stroke="#1f2937" stroke-width="8"/>
  ${etiqueta(X(75), Y(74), "Gimnasio", "40 m²")}
  <rect x="${X(10)}" y="${Y(74)}" width="${X(40)}" height="${Y(16)}" fill="#fde68a" opacity="0.5"/>
  ${[14, 22, 30, 38].map((x) => `<rect x="${X(x)}" y="${Y(84)}" width="70" height="30" rx="8" fill="#fff" stroke="#9ca3af" stroke-width="3"/>`).join("")}
  ${etiqueta(X(30), Y(79.5), "Solárium", "deck de madera")}`,
  );
}

/** "Render" ilustrativo de la fachada para el emprendimiento en pozo. */
export function svgFachada(nombre: string) {
  const pisos = Array.from({ length: 11 }, (_, i) => i);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1800" viewBox="0 0 2400 1800">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4f0"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
    <linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fc9e6"/><stop offset="1" stop-color="#4b7ea8"/></linearGradient>
  </defs>
  <rect width="2400" height="1800" fill="url(#cielo)"/>
  <circle cx="1980" cy="260" r="110" fill="#fff7cc" opacity="0.9"/>
  <rect x="0" y="1560" width="2400" height="240" fill="#9ca3af"/>
  <rect x="0" y="1540" width="2400" height="30" fill="#d1d5db"/>
  <rect x="760" y="260" width="880" height="1300" fill="#f5f5f4"/>
  <rect x="1640" y="260" width="60" height="1300" fill="#d6d3d1"/>
  ${pisos
    .map((i) => {
      const y = 300 + i * 112;
      return `<rect x="800" y="${y}" width="800" height="80" fill="url(#vidrio)"/>
      <rect x="780" y="${y + 80}" width="840" height="14" fill="#e7e5e4"/>
      <line x1="780" y1="${y + 62}" x2="1620" y2="${y + 62}" stroke="#57534e" stroke-width="4"/>
      ${[1000, 1200, 1400].map((x) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 80}" stroke="#e7e5e4" stroke-width="8"/>`).join("")}`;
    })
    .join("")}
  <rect x="740" y="230" width="920" height="40" fill="#44403c"/>
  <rect x="1060" y="1420" width="280" height="140" fill="#292524"/>
  ${[260, 520, 1880, 2140].map((x) => `<rect x="${x - 12}" y="1380" width="24" height="170" fill="#78350f"/><circle cx="${x}" cy="1330" r="120" fill="#4d7c0f"/><circle cx="${x - 60}" cy="1380" r="80" fill="#65a30d"/>`).join("")}
  <rect x="60" y="1660" width="880" height="90" rx="16" fill="#000" opacity="0.55"/>
  <text x="100" y="1720" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#fff">${nombre} · Imagen ilustrativa</text>
</svg>`;
}

/** Logo simple: casa + nombre de la inmobiliaria. */
export function svgLogo(nombre: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140">
  <path d="M20 70 L70 28 L120 70 V120 H20Z" fill="${color}"/>
  <rect x="58" y="86" width="24" height="34" fill="#ffc83d"/>
  <text x="140" y="92" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="${color}">${nombre}</text>
</svg>`;
}
