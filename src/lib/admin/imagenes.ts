/**
 * Procesamiento de imágenes en el navegador antes de subirlas: HEIC → JPG, compresión,
 * miniaturas y conversión de PDF a imágenes. Solo se usa en componentes cliente.
 */
import { esPanoramica } from "./propiedad";

/** Límite de área de canvas de Safari en iPhone (16,7 millones de píxeles). */
const MAX_PIXELES = 16_000_000;

export type Procesada = { grande: Blob; mini: Blob; extension: "webp" | "jpg"; ancho: number; alto: number };

export class ErrorImagen extends Error {}

const esHeic = (f: File) => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/.test(f.type);

/** Convierte HEIC (fotos de iPhone copiadas a la compu) a JPG. La librería se carga solo si hace falta. */
async function normalizar(archivo: File): Promise<Blob> {
  if (!esHeic(archivo)) return archivo;
  try {
    const { heicTo } = await import("heic-to/next");
    return await heicTo({ blob: archivo, type: "image/jpeg", quality: 0.92 });
  } catch {
    throw new ErrorImagen(`No pudimos convertir ${archivo.name} (HEIC). Probá exportarla como JPG desde el celular.`);
  }
}

async function decodificar(blob: Blob, nombre: string) {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new ErrorImagen(`${nombre} no parece una imagen válida o está dañada.`);
  }
}

/** Dimensiones que entran en `maxLado` y en el límite de píxeles, manteniendo la proporción. */
function medidas(ancho: number, alto: number, maxLado: number) {
  let escala = Math.min(1, maxLado / Math.max(ancho, alto));
  if (ancho * alto * escala * escala > MAX_PIXELES) escala = Math.sqrt(MAX_PIXELES / (ancho * alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

function dibujar(fuente: CanvasImageSource, ancho: number, alto: number) {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ErrorImagen("Tu navegador no pudo procesar la imagen. Probá con otro navegador.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  return canvas;
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

/** WebP si el navegador lo sabe codificar (Safari viejo no), si no JPG. */
async function comprimir(canvas: HTMLCanvasElement, calidad: number, preferirWebp = true) {
  if (preferirWebp) {
    const webp = await aBlob(canvas, "image/webp", calidad);
    if (webp?.type === "image/webp") return { blob: webp, extension: "webp" as const };
  }
  const jpg = await aBlob(canvas, "image/jpeg", calidad);
  if (!jpg) throw new ErrorImagen("No se pudo comprimir la imagen. Probá con una más chica.");
  return { blob: jpg, extension: "jpg" as const };
}

async function procesar(archivo: File, maxLado: number, maxMini: number, calidad: number, preferirWebp: boolean): Promise<Procesada> {
  const bitmap = await decodificar(await normalizar(archivo), archivo.name);
  try {
    const grande = medidas(bitmap.width, bitmap.height, maxLado);
    const canvas = dibujar(bitmap, grande.ancho, grande.alto);
    const { blob, extension } = await comprimir(canvas, calidad, preferirWebp);
    const mini = medidas(bitmap.width, bitmap.height, maxMini);
    // Miniatura en JPG: la leen la imagen para compartir y las vistas previas de WhatsApp.
    const { blob: blobMini } = await comprimir(dibujar(canvas, mini.ancho, mini.alto), 0.75, false);
    return { grande: blob, mini: blobMini, extension, ...grande };
  } finally {
    bitmap.close();
  }
}

/** Foto de la propiedad: máx. 2400 px (WebP o JPG ~80) + miniatura de 800 px. */
export function procesarFoto(archivo: File) {
  return procesar(archivo, 2400, 800, 0.8, true);
}

/** Plano en imagen: más resolución para que se lean los textos al hacer zoom. */
export function procesarPlano(archivo: File) {
  return procesar(archivo, 3200, 600, 0.85, true);
}

/**
 * Panorámica 360°: exige relación 2:1 y la lleva a máx. 6000 px de ancho (menos si el
 * celular no admite canvas tan grandes). JPG para máxima compatibilidad con WebGL.
 */
export async function procesarPanoramica(archivo: File): Promise<Procesada> {
  const bitmap = await decodificar(await normalizar(archivo), archivo.name);
  const { width: ancho, height: alto } = bitmap;
  bitmap.close();
  if (!esPanoramica(ancho, alto)) {
    throw new ErrorImagen(
      `“${archivo.name}” no es una foto 360°: mide ${ancho}×${alto} y tiene que ser el doble de ancha que de alta (por ejemplo 6000×3000). ` +
        "Sacala con una cámara 360° o con el modo “foto esférica/360°” del celular, no con el modo panorámico común.",
    );
  }
  return procesar(archivo, 6000, 480, 0.85, false);
}

/** Cada página de un PDF como imagen (pdf.js se carga solo al usarlo). */
export async function pdfAImagenes(archivo: File, alAvanzar?: (pagina: number, total: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  // Worker en el hilo principal: evita configurar un archivo aparte (los PDF de planos son chicos).
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker ??= await import("pdfjs-dist/build/pdf.worker.min.mjs");
  const tarea = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) });
  let documento;
  try {
    documento = await tarea.promise;
  } catch {
    throw new ErrorImagen(`No pudimos abrir ${archivo.name}. Si tiene contraseña, sacásela y probá de nuevo.`);
  }
  const paginas: Procesada[] = [];
  const total = Math.min(documento.numPages, 20);
  for (let n = 1; n <= total; n++) {
    alAvanzar?.(n, total);
    const pagina = await documento.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const { ancho } = medidas(base.width * 10, base.height * 10, 3200);
    const viewport = pagina.getViewport({ scale: ancho / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvas, canvasContext: ctx, viewport }).promise;
    const { blob, extension } = await comprimir(canvas, 0.85, true);
    const mini = medidas(canvas.width, canvas.height, 600);
    const { blob: blobMini } = await comprimir(dibujar(canvas, mini.ancho, mini.alto), 0.75, false);
    paginas.push({ grande: blob, mini: blobMini, extension, ancho: canvas.width, alto: canvas.height });
  }
  await tarea.destroy();
  return paginas;
}

/** Logo: máx. 600 px, WebP o PNG (nunca JPG, para no perder la transparencia). */
export async function procesarLogo(archivo: File): Promise<{ blob: Blob; extension: "webp" | "png" }> {
  const bitmap = await decodificar(await normalizar(archivo), archivo.name);
  try {
    const { ancho, alto } = medidas(bitmap.width, bitmap.height, 600);
    const canvas = dibujar(bitmap, ancho, alto);
    const webp = await aBlob(canvas, "image/webp", 0.9);
    if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };
    const png = await aBlob(canvas, "image/png", 1);
    if (!png) throw new ErrorImagen("No se pudo procesar el logo.");
    return { blob: png, extension: "png" };
  } finally {
    bitmap.close();
  }
}
