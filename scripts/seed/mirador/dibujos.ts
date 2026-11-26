/**
 * Dibujos provisorios del Edificio Mirador en SVG (hasta que lleguen los renders): dos vistas de la
 * fachada en perspectiva (cámara a la altura de la vereda, verticales rectas), los cuadros del giro
 * entre una y otra, las plantas y las maquetas. Plantas y maquetas van sobre el mismo fondo liso de
 * la página, así se funden. Las zonas de pisos y unidades salen de la misma geometría: coinciden.
 */
import type { Punto } from "@/lib/edificio";
import {
  ALTO_EDIFICIO,
  ALTURA,
  BLOQUE,
  COCHERAS,
  ESPACIOS,
  LADO_X,
  LADO_Y,
  LOBBY,
  NUCLEO,
  NUCLEO_PB,
  PISOS,
  RETIRO,
  TIPOLOGIAS,
  UNIDADES,
  Y_FRENTE,
  altoPiso,
  zPiso,
  type Ambiente,
  type ClavePlanta,
  type Forma,
  type Mueble,
  type Rect,
  type Tipologia,
} from "./edificio.ts";

/** Fondo liso de plantas y maquetas (la página usa el mismo). */
export const FONDO = "#0f1115";
const FUENTE = "Arial, Helvetica, sans-serif";
const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (v: number, total: number) => Math.round((v / total) * 10000) / 100;

// ---------------------------------------------------------------------------
// Plantas: 1600 × 1200, 62 px por metro (a la izquierda entra el retiro lateral con la rampa)
// ---------------------------------------------------------------------------
export const PLANTA = { ancho: 1600, alto: 1200, escala: 62, x0: 290, y0: 135 };
const px = (x: number) => r1(PLANTA.x0 + x * PLANTA.escala);
const py = (y: number) => r1(PLANTA.y0 + y * PLANTA.escala);
const m = (v: number) => r1(v * PLANTA.escala);

/** Zona en porcentajes de la planta. */
export const enPlanta = (forma: Forma): Punto[] => forma.map(([x, y]) => [pct(px(x), PLANTA.ancho), pct(py(y), PLANTA.alto)]);
export const puntoEnPlanta = ([x, y]: Punto): Punto => [pct(px(x), PLANTA.ancho), pct(py(y), PLANTA.alto)];

const rectSvg = ([x1, y1, x2, y2]: Rect, extra: string) => `<rect x="${px(x1)}" y="${py(y1)}" width="${m(x2 - x1)}" height="${m(y2 - y1)}" ${extra}/>`;
const formaSvg = (f: Forma, extra: string, a = px, b = py) => `<polygon points="${f.map(([x, y]) => `${a(x)},${b(y)}`).join(" ")}" ${extra}/>`;

/** Muebles en trazo fino (planta) o con relleno y sombra (maqueta). */
function muebles(lista: Mueble[], estilo: "trazo" | "maqueta", X: (x: number) => number, Y: (y: number) => number, M: (v: number) => number) {
  const t = estilo === "trazo";
  const linea = t ? `fill="none" stroke="#5d6068" stroke-width="2"` : "";
  const caja = (r: Rect, color: string, radio = 0.08, otro = "") =>
    `<rect x="${X(r[0])}" y="${Y(r[1])}" width="${M(r[2] - r[0])}" height="${M(r[3] - r[1])}" rx="${M(radio)}" ${t ? linea : `fill="${color}" ${otro}`}/>`;
  const circulo = ([cx, cy]: Punto, radio: number, color: string) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${M(radio)}" ${t ? linea : `fill="${color}"`}/>`;
  const sombra = (r: Rect, radio = 0.08) => (t ? "" : `<rect x="${X(r[0] + 0.08)}" y="${Y(r[1] + 0.12)}" width="${M(r[2] - r[0])}" height="${M(r[3] - r[1])}" rx="${M(radio)}" fill="#000" opacity="0.35" filter="url(#difuso)"/>`);
  return lista
    .map((x) => {
      switch (x.tipo) {
        case "cama": {
          const [x1, y1, x2] = x.r;
          const ancho = x2 - x1;
          const almohada = (a: number) => caja([a, y1 + 0.12, a + (x.plazas === 2 ? ancho / 2 - 0.15 : ancho - 0.2), y1 + 0.55], "#e8e4dc", 0.1);
          return (
            sombra(x.r, 0.1) +
            caja(x.r, "#f4f1ea", 0.1) +
            caja([x1, y1 + 0.75, x2, x.r[3]], "#56677d", 0.08) +
            (x.plazas === 2 ? almohada(x1 + 0.1) + almohada(x1 + ancho / 2 + 0.05) : almohada(x1 + 0.1))
          );
        }
        case "sillon": {
          const [x1, y1, x2, y2] = x.r;
          const horizontal = x2 - x1 > y2 - y1;
          const respaldo: Rect = horizontal ? [x1, y2 - 0.25, x2, y2] : [x2 - 0.25, y1, x2, y2];
          return sombra(x.r, 0.15) + caja(x.r, "#6a737c", 0.15) + caja(respaldo, "#545c65", 0.1);
        }
        case "mesa": {
          const [x1, y1, x2, y2] = x.r;
          const sillas: string[] = [];
          const porLado = Math.ceil(x.sillas / 2);
          for (let i = 0; i < porLado; i++) {
            const cx = x1 + ((i + 0.5) * (x2 - x1)) / porLado;
            sillas.push(caja([cx - 0.22, y1 - 0.5, cx + 0.22, y1 - 0.08], "#3d4249", 0.08));
            if (i < x.sillas - porLado) sillas.push(caja([cx - 0.22, y2 + 0.08, cx + 0.22, y2 + 0.5], "#3d4249", 0.08));
          }
          return sombra(x.r) + sillas.join("") + caja(x.r, "#8b6743", 0.06);
        }
        case "redonda": {
          const [cx, cy] = x.c;
          const sillas = Array.from({ length: x.sillas }, (_, i) => {
            const a = (i / x.sillas) * Math.PI * 2;
            return circulo([cx + Math.cos(a) * (x.radio + 0.3), cy + Math.sin(a) * (x.radio + 0.3)], 0.2, "#3d4249");
          }).join("");
          return sillas + circulo(x.c, x.radio, "#8b6743");
        }
        case "mesada":
          return sombra(x.r, 0.02) + caja(x.r, "#d9d5ce", 0.02) + (t ? "" : `<circle cx="${X(x.r[0] + 0.5)}" cy="${Y((x.r[1] + x.r[3]) / 2)}" r="${M(0.14)}" fill="#8f949b"/>`);
        case "bacha":
          return caja(x.r, "#e9e7e2", 0.12) + (t ? "" : `<ellipse cx="${X((x.r[0] + x.r[2]) / 2)}" cy="${Y((x.r[1] + x.r[3]) / 2)}" rx="${M(0.22)}" ry="${M(0.14)}" fill="#b8c2c8"/>`);
        case "ducha":
          return caja(x.r, "#9fb3bf", 0.04) + (t ? `<line x1="${X(x.r[0])}" y1="${Y(x.r[1])}" x2="${X(x.r[2])}" y2="${Y(x.r[3])}" stroke="#5d6068" stroke-width="2"/>` : "");
        case "inodoro": {
          const [cx, cy] = x.c;
          return caja([cx - 0.2, cy - 0.3, cx + 0.2, cy - 0.12], "#eceae5", 0.05) + `<ellipse cx="${X(cx)}" cy="${Y(cy + 0.08)}" rx="${M(0.19)}" ry="${M(0.24)}" ${t ? linea : `fill="#f4f2ee"`}/>`;
        }
        case "placard":
          return caja(x.r, "#4a4038", 0.02);
        case "planta":
          return t ? circulo(x.c, x.radio, "") : `<circle cx="${X(x.c[0] + 0.06)}" cy="${Y(x.c[1] + 0.1)}" r="${M(x.radio)}" fill="#000" opacity="0.35"/>` + circulo(x.c, x.radio, "#4f7a45") + circulo([x.c[0] - x.radio * 0.3, x.c[1] - x.radio * 0.3], x.radio * 0.55, "#6a9a5b");
        case "alfombra":
          return t ? "" : caja(x.r, "#c9bca7", 0.05, `opacity="0.55"`);
        case "escritorio":
          return sombra(x.r, 0.03) + caja(x.r, "#7a5b3d", 0.03);
        case "aparato":
          return sombra(x.r, 0.05) + caja(x.r, "#2f343a", 0.05);
        case "reposera":
          return sombra(x.r, 0.1) + caja(x.r, "#e8e2d6", 0.1);
        case "agua":
          return `<rect x="${X(x.r[0])}" y="${Y(x.r[1])}" width="${M(x.r[2] - x.r[0])}" height="${M(x.r[3] - x.r[1])}" rx="${M(0.15)}" ${t ? `fill="#1b2a33" stroke="#4d7d93" stroke-width="2"` : `fill="url(#agua)"`}/>`;
        case "auto":
          return caja(x.r, "#2b2f35", 0.35) + caja([x.r[0] + 0.2, x.r[1] + 1.2, x.r[2] - 0.2, x.r[3] - 1.4], "#3a4048", 0.2);
      }
    })
    .join("");
}

const textoPlanta = (x: number, y: number, texto: string, tam = 22, color = "#8b8d93", extra = "") =>
  `<text x="${px(x)}" y="${py(y)}" font-family="${FUENTE}" font-size="${tam}" fill="${color}" text-anchor="middle" dominant-baseline="middle" ${extra}>${texto}</text>`;

/** Espejo respecto del eje x = 10 (las unidades de la derecha son el espejo de las de la izquierda). */
const ex = (x: number) => LADO_X - x;
const espejarRect = ([x1, y1, x2, y2]: Rect): Rect => [ex(x2), y1, ex(x1), y2];
function espejarMueble(mu: Mueble): Mueble {
  if ("r" in mu) return { ...mu, r: espejarRect(mu.r) } as Mueble;
  return { ...mu, c: [ex(mu.c[0]), mu.c[1]] } as Mueble;
}
export const espejarAmbiente = (a: Ambiente): Ambiente => ({ ...a, r: espejarRect(a.r), muebles: a.muebles.map(espejarMueble) });

/** Ambientes de cada unidad de una planta, en su lugar (dados vuelta si la unidad es espejada). */
function ambientesDePlanta(clave: ClavePlanta): Ambiente[] {
  const numero = PISOS.find((p) => p.planta === clave)!.numero;
  return UNIDADES.filter((u) => u.piso === numero && u.tipo !== "cochera").flatMap((u) => {
    const interior = TIPOLOGIAS.find((t) => t.clave === u.tipo)?.interior ?? [];
    return u.espejada ? interior.map(espejarAmbiente) : interior;
  });
}

function nucleo([x1, y1, x2, y2]: Rect, etiqueta: string | null) {
  const escalera: Rect = [x1 + 0.2, y1 + 0.2, x1 + 2.5, y1 + 5];
  const peldaños = Array.from({ length: 9 }, (_, i) => `<line x1="${px(escalera[0])}" y1="${py(escalera[1] + 0.5 + i * 0.5)}" x2="${px(escalera[2])}" y2="${py(escalera[1] + 0.5 + i * 0.5)}" stroke="#3d4047" stroke-width="2"/>`).join("");
  const ascensor = (x: number) =>
    rectSvg([x, y1 + 0.2, x + 1.35, y1 + 1.9], `fill="#1c1f25" stroke="#4a4d55" stroke-width="2"`) +
    `<line x1="${px(x)}" y1="${py(y1 + 0.2)}" x2="${px(x + 1.35)}" y2="${py(y1 + 1.9)}" stroke="#3d4047" stroke-width="2"/><line x1="${px(x + 1.35)}" y1="${py(y1 + 0.2)}" x2="${px(x)}" y2="${py(y1 + 1.9)}" stroke="#3d4047" stroke-width="2"/>`;
  const ancho = x2 - x1;
  return (
    rectSvg([x1, y1, x2, y2], `fill="#14161b"`) +
    rectSvg(escalera, `fill="none" stroke="#4a4d55" stroke-width="2"`) +
    peldaños +
    (ancho > 5 ? ascensor(x1 + 2.8) + ascensor(x1 + 4.35) : ascensor(x1 + 2.6 > x2 - 1.4 ? x2 - 1.45 : x1 + 2.6)) +
    (etiqueta ? textoPlanta((x1 + x2) / 2, y2 - 1.3, etiqueta, 20) : "")
  );
}

/** Rampa a las cocheras por el retiro lateral izquierdo. */
function rampa(texto: string) {
  const r: Rect = [-RETIRO + 0.3, 0, -0.3, LADO_Y];
  let s = rectSvg(r, `fill="#191c22" stroke="#3a3d44" stroke-width="2"`);
  for (let i = 0; i < 11; i++) s += `<line x1="${px(r[0] + 0.3)}" y1="${py(1 + i * 1.25)}" x2="${px(r[2] - 0.3)}" y2="${py(1.4 + i * 1.25)}" stroke="#3d4047" stroke-width="3"/>`;
  return s + textoPlanta(-RETIRO / 2, LADO_Y / 2, texto, 19, "#8b8d93", `transform="rotate(-90 ${px(-RETIRO / 2)} ${py(LADO_Y / 2)})"`);
}

/** Planta de un piso, vista desde arriba, sin las zonas (las pinta la web encima). */
export function svgPlanta(clave: ClavePlanta, fondo = FONDO) {
  const pared = `fill="none" stroke="#d6d1c8" stroke-linejoin="round"`;
  const partes: string[] = [];
  const contorno: Rect = [0, 0, LADO_X, LADO_Y];
  const unidadesDelPiso = UNIDADES.filter((x) => x.piso === PISOS.find((p) => p.planta === clave)!.numero);

  if (clave === "subsuelo") {
    partes.push(rectSvg(contorno, `fill="#14161b"`));
    partes.push(rampa("Rampa por el retiro lateral"));
    partes.push(nucleo([17.5, 0, LADO_X, 5], null) + textoPlanta(18.75, 3.9, "Ascensores", 16));
    partes.push(rectSvg([17.5, 10, LADO_X, LADO_Y], `fill="#191c22" stroke="#4a4d55" stroke-width="2"`) + textoPlanta(18.75, 12.5, "Máquinas", 16));
    for (const c of COCHERAS) {
      partes.push(rectSvg(c.r, `fill="none" stroke="#6b6e75" stroke-width="3"`));
      partes.push(rectSvg([c.r[0] + 0.35, c.r[1] + 0.4, c.r[2] - 0.35, c.r[3] - 0.4], `fill="none" stroke="#3a3d44" stroke-width="2" rx="${m(0.35)}"`));
    }
    partes.push(textoPlanta(9, 7.5, "Circulación", 20, "#5d6068"));
    partes.push(`<path d="M${px(1)} ${py(6.6)} h${m(5)} m-${m(0.6)} -${m(0.4)} l${m(0.6)} ${m(0.4)} l-${m(0.6)} ${m(0.4)}" stroke="#3d4047" stroke-width="3" fill="none"/>`);
  } else if (clave === "pb") {
    partes.push(rectSvg(contorno, `fill="#14161b"`));
    partes.push(rampa("Rampa a cocheras"));
    for (const u of unidadesDelPiso) partes.push(formaSvg(u.forma, `fill="#17191e"`));
    for (const a of ambientesDePlanta("pb")) partes.push(rectSvg(a.r, `fill="none" stroke="#3a3d44" stroke-width="2"`) + muebles(a.muebles, "trazo", px, py, m));
    partes.push(nucleo(NUCLEO_PB, null));
    partes.push(rectSvg(LOBBY, `fill="#1a1c21"`) + rectSvg([NUCLEO_PB[0], NUCLEO_PB[3], NUCLEO_PB[2], LOBBY[1]], `fill="#1a1c21"`));
    partes.push(rectSvg([8.6, 9.4, 11.4, 10.1], `fill="none" stroke="#5d6068" stroke-width="2" rx="6"`));
    partes.push(`<circle cx="${px(7.2)}" cy="${py(14.1)}" r="${m(0.35)}" fill="none" stroke="#5d6068" stroke-width="2"/><circle cx="${px(12.8)}" cy="${py(14.1)}" r="${m(0.35)}" fill="none" stroke="#5d6068" stroke-width="2"/>`);
    partes.push(textoPlanta(16.6, 12.6, "Local 1", 24, "#a3a5ab") + textoPlanta(3.4, 12.6, "Local 2", 24, "#a3a5ab") + textoPlanta(10, 13.6, "Lobby", 18));
    for (const u of unidadesDelPiso) partes.push(formaSvg(u.forma, `${pared} stroke-width="5"`));
    // Vidrieras sobre las dos calles y el lado oeste (perímetro libre)
    partes.push(
      `<line x1="${px(0.2)}" y1="${py(LADO_Y)}" x2="${px(6.2)}" y2="${py(LADO_Y)}" stroke="#7fa7bd" stroke-width="5"/>` +
        `<line x1="${px(13.8)}" y1="${py(LADO_Y)}" x2="${px(19.8)}" y2="${py(LADO_Y)}" stroke="#7fa7bd" stroke-width="5"/>` +
        `<line x1="${px(LADO_X)}" y1="${py(0.2)}" x2="${px(LADO_X)}" y2="${py(14.8)}" stroke="#7fa7bd" stroke-width="5"/>` +
        `<line x1="${px(6.6)}" y1="${py(LADO_Y)}" x2="${px(13.4)}" y2="${py(LADO_Y)}" stroke="#c9b48c" stroke-width="5"/>`,
    );
  } else if (clave === "p8") {
    partes.push(rectSvg(contorno, `fill="#131519"`));
    const terraza: Forma = [
      [13.13, 0],
      [LADO_X, 0],
      [LADO_X, LADO_Y],
      [11.82, LADO_Y],
      [11.82, Y_FRENTE],
      [13.13, Y_FRENTE],
    ];
    partes.push(formaSvg(terraza, `fill="#16191d"`));
    for (let x = 12.2; x < LADO_X; x += 0.6) partes.push(`<line x1="${px(x)}" y1="${py(Y_FRENTE + 0.15)}" x2="${px(x)}" y2="${py(LADO_Y - 0.15)}" stroke="#1d2026" stroke-width="2"/>`);
    partes.push(muebles([{ tipo: "agua", r: [13.8, 9.2, 19.3, 12.9] }], "trazo", px, py, m));
    partes.push(
      muebles(
        [
          { tipo: "reposera", r: [14.2, 1.0, 14.9, 2.8] },
          { tipo: "reposera", r: [15.5, 1.0, 16.2, 2.8] },
          { tipo: "reposera", r: [16.8, 1.0, 17.5, 2.8] },
          { tipo: "reposera", r: [18.1, 1.0, 18.8, 2.8] },
          { tipo: "planta", c: [19.3, 6.5], radio: 0.5 },
          { tipo: "planta", c: [12.5, 14.2], radio: 0.45 },
        ],
        "trazo",
        px,
        py,
        m,
      ),
    );
    // SUM con parrilla (81 m²), gimnasio (56 m²) y vestuarios en el núcleo
    partes.push(rectSvg([0, Y_FRENTE, 11.82, LADO_Y], `fill="#17191e"`) + rectSvg(BLOQUE.d, `fill="#17191e"`));
    partes.push(nucleo([6.87, 0, 13.13, 5.0], null));
    partes.push(rectSvg([6.87, 5.0, 10, Y_FRENTE], `fill="#17191e" stroke="#3a3d44" stroke-width="2"`) + rectSvg([10, 5.0, 13.13, Y_FRENTE], `fill="#17191e" stroke="#3a3d44" stroke-width="2"`));
    partes.push(muebles([{ tipo: "mesa", r: [2.0, 10.3, 7.2, 11.4], sillas: 10 }, { tipo: "mesada", r: [0.15, 13.9, 4.6, 14.5] }, { tipo: "sillon", r: [8.8, 9.0, 11.5, 9.9] }, { tipo: "alfombra", r: [8.6, 10.2, 11.6, 12.8] }], "trazo", px, py, m));
    partes.push(rectSvg([4.9, 13.8, 6.3, 14.7], `fill="none" stroke="#a0623f" stroke-width="3"`));
    const gimnasio: Mueble[] = [0.6, 2.3, 4.0].map((x) => ({ tipo: "aparato", r: [x, 5.9, x + 0.9, 7.6] }));
    gimnasio.push({ tipo: "aparato", r: [0.5, 0.6, 2.4, 1.3] }, { tipo: "alfombra", r: [3.0, 0.6, 6.4, 3.6] });
    partes.push(muebles(gimnasio, "trazo", px, py, m));
    partes.push(textoPlanta(5.9, 9.0, "SUM y parrilla", 20) + textoPlanta(3.4, 4.6, "Gimnasio", 20) + textoPlanta(9.97, 6.6, "Vestuarios", 16) + textoPlanta(16.5, 14.2, "Pileta", 20, "#7fa7bd") + textoPlanta(16.5, 4.2, "Solárium", 20));
    partes.push(rectSvg([0, Y_FRENTE, 11.82, LADO_Y], `${pared} stroke-width="5"`) + rectSvg(BLOQUE.d, `${pared} stroke-width="5"`));
    partes.push(formaSvg(terraza, `fill="none" stroke="#7fa7bd" stroke-width="3" stroke-dasharray="10 6"`));
  } else {
    partes.push(rectSvg(contorno, `fill="#14161b"`));
    partes.push(nucleo(NUCLEO, "Palier"));
    for (const a of ambientesDePlanta(clave)) {
      partes.push(rectSvg(a.r, `fill="${a.piso === "exterior" ? "#121418" : "#17191e"}" stroke="#3a3d44" stroke-width="2"`));
      partes.push(muebles(a.muebles, "trazo", px, py, m));
    }
    for (const u of unidadesDelPiso) partes.push(formaSvg(u.forma, `${pared} stroke-width="6"`));
  }
  partes.push(rectSvg(contorno, `${pared} stroke-width="10"`));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PLANTA.ancho}" height="${PLANTA.alto}" viewBox="0 0 ${PLANTA.ancho} ${PLANTA.alto}">
  <defs><linearGradient id="agua" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d7fa0"/><stop offset="1" stop-color="#18506a"/></linearGradient></defs>
  <rect width="${PLANTA.ancho}" height="${PLANTA.alto}" fill="${fondo}"/>
  ${partes.join("\n  ")}
  ${clave === "subsuelo" ? "" : `<text x="${px(LADO_X / 2)}" y="${py(LADO_Y) + 56}" font-family="${FUENTE}" font-size="26" letter-spacing="4" fill="#6f7178" text-anchor="middle">AV. COLÓN</text>
  <text x="${px(LADO_X) + 44}" y="${py(LADO_Y / 2)}" font-family="${FUENTE}" font-size="26" letter-spacing="4" fill="#6f7178" text-anchor="middle" transform="rotate(90 ${px(LADO_X) + 44} ${py(LADO_Y / 2)})">RIVADAVIA</text>`}
</svg>`;
}

/** Zona de cada espacio común (punto) y de cada unidad, en % de su planta. */
export const zonasPlanta = () => ({
  unidades: Object.fromEntries(UNIDADES.map((u) => [u.codigo, enPlanta(u.forma)])),
  espacios: Object.fromEntries(ESPACIOS.map((e) => [e.slug, puntoEnPlanta(e.punto)])),
});

// ---------------------------------------------------------------------------
// Maquetas: la unidad recortada de la planta, con pisos, muebles y sombras
// ---------------------------------------------------------------------------
const MAQUETA_ESCALA = 110;
const COLOR_PISO: Record<Ambiente["piso"], string> = { madera: "#9c7653", ceramica: "#c6cbcd", exterior: "#6f6253", piedra: "#a9a49b" };

/** Maqueta de una tipología: misma caja que su recorte en la planta (así la transición calza). */
export function svgMaqueta(t: Tipologia, fondo = FONDO) {
  const xs = t.forma.map(([x]) => x);
  const ys = t.forma.map(([, y]) => y);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const ancho = Math.round((Math.max(...xs) - x0) * MAQUETA_ESCALA);
  const alto = Math.round((Math.max(...ys) - y0) * MAQUETA_ESCALA);
  const X = (x: number) => r1((x - x0) * MAQUETA_ESCALA);
  const Y = (y: number) => r1((y - y0) * MAQUETA_ESCALA);
  const M = (v: number) => r1(v * MAQUETA_ESCALA);
  const pisos = t.interior.map((a) => `<rect x="${X(a.r[0])}" y="${Y(a.r[1])}" width="${M(a.r[2] - a.r[0])}" height="${M(a.r[3] - a.r[1])}" fill="${a.piso === "madera" ? "url(#madera)" : COLOR_PISO[a.piso]}"/>`).join("");
  const tabiques = t.interior.map((a) => `<rect x="${X(a.r[0])}" y="${Y(a.r[1])}" width="${M(a.r[2] - a.r[0])}" height="${M(a.r[3] - a.r[1])}" fill="none" stroke="#f1ede6" stroke-width="${M(0.1)}"/>`).join("");
  const contorno = `points="${t.forma.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}"`;
  return {
    ancho,
    alto,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${M(0.06)}"/></filter>
    <pattern id="madera" width="${M(0.18)}" height="${M(1.2)}" patternUnits="userSpaceOnUse"><rect width="${M(0.18)}" height="${M(1.2)}" fill="#a07a56"/><rect width="${M(0.012)}" height="${M(1.2)}" fill="#8a6646"/><rect y="${M(0.7)}" width="${M(0.18)}" height="${M(0.012)}" fill="#8a6646"/></pattern>
    <linearGradient id="luz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient>
    <linearGradient id="agua" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a9cc0"/><stop offset="1" stop-color="#1d6283"/></linearGradient>
    <clipPath id="unidad"><polygon ${contorno}/></clipPath>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="${fondo}"/>
  <g clip-path="url(#unidad)">
    ${pisos}
    ${muebles(t.interior.flatMap((a) => a.muebles), "maqueta", X, Y, M)}
    <g filter="url(#difuso)" opacity="0.5" transform="translate(${M(0.06)} ${M(0.1)})">${tabiques.replace(/#f1ede6/g, "#000")}</g>
    ${tabiques}
    <rect width="${ancho}" height="${alto}" fill="url(#luz)"/>
  </g>
  <polygon ${contorno} fill="none" stroke="#f6f3ee" stroke-width="${M(0.24)}" stroke-linejoin="round"/>
</svg>`,
  };
}

/** Maqueta de una cochera (2,5 × 5 m): la misma para todas. */
export function svgMaquetaCochera(fondo = FONDO) {
  const e = MAQUETA_ESCALA;
  const [ancho, alto] = [Math.round(2.5 * e), Math.round(5 * e)];
  const M = (v: number) => r1(v * e);
  return {
    ancho,
    alto,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <defs>
    <filter id="difuso" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${M(0.08)}"/></filter>
    <linearGradient id="chapa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b3a4a"/><stop offset="0.5" stop-color="#4c6075"/><stop offset="1" stop-color="#2b3a4a"/></linearGradient>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="${fondo}"/>
  <rect x="0" y="0" width="${ancho}" height="${alto}" fill="#5b5d61"/>
  <rect x="${M(0.06)}" y="${M(0.06)}" width="${ancho - M(0.12)}" height="${alto - M(0.12)}" fill="none" stroke="#f1ede6" stroke-width="${M(0.08)}" stroke-dasharray="${M(0.5)} ${M(0.25)}"/>
  <rect x="${M(0.43)}" y="${M(0.62)}" width="${M(1.64)}" height="${M(3.9)}" rx="${M(0.45)}" fill="#000" opacity="0.45" filter="url(#difuso)"/>
  <rect x="${M(0.38)}" y="${M(0.52)}" width="${M(1.64)}" height="${M(3.9)}" rx="${M(0.45)}" fill="url(#chapa)"/>
  <rect x="${M(0.55)}" y="${M(1.35)}" width="${M(1.3)}" height="${M(0.75)}" rx="${M(0.15)}" fill="#1a232c"/>
  <rect x="${M(0.6)}" y="${M(2.2)}" width="${M(1.2)}" height="${M(1.15)}" rx="${M(0.12)}" fill="#3a4b5e"/>
  <rect x="${M(0.6)}" y="${M(3.45)}" width="${M(1.2)}" height="${M(0.55)}" rx="${M(0.12)}" fill="#1a232c"/>
  <circle cx="${M(0.62)}" cy="${M(0.72)}" r="${M(0.09)}" fill="#f3e3b5"/><circle cx="${M(1.78)}" cy="${M(0.72)}" r="${M(0.09)}" fill="#f3e3b5"/>
</svg>`,
  };
}

// ---------------------------------------------------------------------------
// Fachada: perspectiva de dos puntos (cámara nivelada a 1,6 m)
// ---------------------------------------------------------------------------
type V3 = [number, number, number];
export const FACHADA = { ancho: 1920, alto: 1080 };

/** Cámara en coordenadas polares alrededor del centro de la planta (ángulo en grados, distancia en m). */
export type Camara = { angulo: number; distancia: number };
/** Vista 1 desde Av. Colón (el frente domina) y vista 2 desde Rivadavia (domina el lateral). */
export const CAMARAS: [Camara, Camara] = [
  { angulo: 62, distancia: 52 },
  { angulo: 22, distancia: 50 },
];

function proyeccion(cam: Camara) {
  const a = (cam.angulo * Math.PI) / 180;
  const centro: V3 = [LADO_X / 2, LADO_Y / 2, 0];
  const pos: V3 = [centro[0] + Math.cos(a) * cam.distancia, centro[1] + Math.sin(a) * cam.distancia, 1.6];
  const f = [centro[0] - pos[0], centro[1] - pos[1]];
  const largo = Math.hypot(f[0], f[1]);
  const [fx, fy] = [f[0] / largo, f[1] / largo];
  const [rx, ry] = [-fy, fx];
  const crudo = ([x, y, z]: V3): Punto => {
    const dx = x - pos[0];
    const dy = y - pos[1];
    const prof = Math.max(0.1, dx * fx + dy * fy);
    return [(dx * rx + dy * ry) / prof, -(z - pos[2]) / prof];
  };
  // Encaje: el edificio ocupa el 84 % del alto, centrado (verticales rectas: solo escala y traslación).
  const esquinas: V3[] = [];
  for (const x of [0, LADO_X]) for (const y of [0, LADO_Y]) for (const z of [0, ALTO_EDIFICIO]) esquinas.push([x, y, z]);
  const p = esquinas.map(crudo);
  const [minX, maxX] = [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0]))];
  const [minY, maxY] = [Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[1]))];
  const escala = (FACHADA.alto * 0.8) / (maxY - minY);
  const dx = FACHADA.ancho / 2 - ((minX + maxX) / 2) * escala;
  const dy = FACHADA.alto * 0.07 - minY * escala;
  const proy = (v: V3): Punto => {
    const [x, y] = crudo(v);
    return [r1(x * escala + dx), r1(y * escala + dy)];
  };
  return { proy, horizonte: r1(dy), pos };
}

/** Zona de cada piso sobre la fachada, en % de la imagen (franja del frente y el lateral). */
function franja(proy: (v: V3) => Punto, z1: number, z2: number, desdeY: number): Punto[] {
  return (
    [
      [0, LADO_Y, z1],
      [LADO_X, LADO_Y, z1],
      [LADO_X, desdeY, z1],
      [LADO_X, desdeY, z2],
      [LADO_X, LADO_Y, z2],
      [0, LADO_Y, z2],
    ] as V3[]
  ).map((v) => {
    const [x, y] = proy(v);
    return [pct(x, FACHADA.ancho), pct(y, FACHADA.alto)];
  });
}

/** Número pseudoaleatorio estable (las luces encendidas no cambian entre corridas). */
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function svgFachada(cam: Camara) {
  const { proy, horizonte, pos } = proyeccion(cam);
  const poly = (pts: V3[], extra: string) => `<polygon points="${pts.map((v) => proy(v).join(",")).join(" ")}" ${extra}/>`;
  /** Cuadrilátero sobre un plano y = cte (frente) o x = cte (lateral). */
  const frente = (x1: number, x2: number, z1: number, z2: number, extra: string, y = LADO_Y) =>
    poly(
      [
        [x1, y, z1],
        [x2, y, z1],
        [x2, y, z2],
        [x1, y, z2],
      ],
      extra,
    );
  const lateral = (y1: number, y2: number, z1: number, z2: number, extra: string, x = LADO_X) =>
    poly(
      [
        [x, y1, z1],
        [x, y2, z1],
        [x, y2, z2],
        [x, y1, z2],
      ],
      extra,
    );
  const rnd = azar(2811);
  // Cada cara con sus detalles se dibuja entera; las caras van de la más lejana a la más cercana.
  const caras: { centro: V3; dibujo: string }[] = [];
  const cara = (centro: V3, ...dibujo: string[]) => caras.push({ centro, dibujo: dibujo.join("") });
  const luz = (prendida: boolean, lado: "frente" | "lateral") =>
    prendida ? `fill="${lado === "frente" ? "#c99a66" : "#b98c5c"}" opacity="${(0.45 + rnd() * 0.3).toFixed(2)}"` : `fill="${lado === "frente" ? "#1a222d" : "#151b24"}"`;

  const fondo: string[] = [];
  // Suelo: vereda y calzada hasta el horizonte
  fondo.push(`<rect y="${horizonte}" width="${FACHADA.ancho}" height="${FACHADA.alto - horizonte}" fill="#0c0d10"/>`);
  fondo.push(poly([[-60, LADO_Y, 0], [LADO_X + 3.5, LADO_Y, 0], [LADO_X + 3.5, LADO_Y + 3.5, 0], [-60, LADO_Y + 3.5, 0]], `fill="#17181c"`));
  fondo.push(poly([[LADO_X, -60, 0], [LADO_X + 3.5, -60, 0], [LADO_X + 3.5, LADO_Y + 3.5, 0], [LADO_X, LADO_Y + 3.5, 0]], `fill="#17181c"`));
  // Vecinos oscuros: dan escala y hacen leer la esquina
  fondo.push(frente(-28, -9, 0, 14, `fill="#14161b"`) + frente(-6, 26, 0, 18, `fill="#111318"`, -12) + lateral(-26, -12, 0, 18, `fill="#0f1114"`, 26));
  for (let i = 0; i < 9; i++) {
    const x = -27 + (i % 3) * 4.6;
    const z = 2.5 + Math.floor(i / 3) * 3.8;
    if (rnd() > 0.45) fondo.push(frente(x, x + 2.2, z, z + 1.5, `fill="#d9a974" opacity="${(0.1 + rnd() * 0.15).toFixed(2)}"`));
  }

  const zTop = zPiso(8);
  const y4 = 0;
  const y3 = Y_FRENTE;

  // Frente (Av. Colón): pisos 1 a 7 con losas, vidrios y barandas
  const detallesFrente: string[] = [frente(0, LADO_X, ALTURA.pb, zTop + 0.35, `fill="#3f4246"`)];
  const detallesLateral: string[] = [lateral(y4, LADO_Y, ALTURA.pb, zTop + 0.35, `fill="#34373b"`)];
  for (let n = 1; n <= 7; n++) {
    const z1 = zPiso(n);
    const z2 = z1 + ALTURA.piso;
    for (const [a, b] of [
      [0, BLOQUE.a[2]],
      [BLOQUE.b[0], BLOQUE.b[2]],
      [BLOQUE.c[0], LADO_X],
    ]) {
      const prendida = rnd() > 0.4;
      detallesFrente.push(frente(a + 0.15, b - 0.15, z1 + 0.35, z2, luz(prendida, "frente")));
      for (let x = a + 1.5; x < b - 0.5; x += 1.5) detallesFrente.push(frente(x - 0.04, x + 0.04, z1 + 0.35, z2, `fill="#25282d"`));
      detallesFrente.push(frente(a + 0.15, b - 0.15, z1 + 0.35, z1 + 1.35, `fill="#a8bccb" opacity="0.14"`));
    }
    for (const [a, b] of [
      [y4, y3],
      [y3, LADO_Y],
    ]) {
      const prendida = rnd() > 0.45;
      detallesLateral.push(lateral(a + 0.15, b - 0.15, z1 + 0.35, z2, luz(prendida, "lateral")));
      for (let y = a + 1.6; y < b - 0.5; y += 1.6) detallesLateral.push(lateral(y - 0.04, y + 0.04, z1 + 0.35, z2, `fill="#222529"`));
      detallesLateral.push(lateral(a + 0.15, b - 0.15, z1 + 0.35, z1 + 1.35, `fill="#a8bccb" opacity="0.1"`));
    }
    detallesFrente.push(frente(-0.05, LADO_X + 0.05, z1, z1 + 0.35, `fill="#d3cdc2"`));
    detallesLateral.push(lateral(y4, LADO_Y, z1, z1 + 0.35, `fill="#a59f95"`));
  }
  detallesFrente.push(frente(-0.05, LADO_X + 0.05, zTop, zTop + 0.35, `fill="#d3cdc2"`));
  detallesLateral.push(lateral(0, LADO_Y, zTop, zTop + 0.35, `fill="#a59f95"`));

  // Planta baja: rampa, lobby iluminado y el local con vidrieras en las dos calles
  detallesFrente.unshift(
    frente(0, LADO_X, 0, ALTURA.pb, `fill="#26292e"`),
    frente(0.15, LOBBY[0] - 0.15, 0.2, 3.9, `fill="#d9b886" opacity="0.6"`),
    frente(LOBBY[0] + 0.15, LOBBY[2] - 0.15, 0, 3.9, `fill="#e9c995" opacity="0.82"`),
    frente(9.4, 10.6, 0, 2.5, `fill="#3b2f22" opacity="0.6"`),
    frente(LOBBY[0] - 0.3, LOBBY[2] + 0.3, 3.9, 4.15, `fill="#e9e3d8"`),
    frente(LOBBY[2] + 0.15, LADO_X - 0.15, 0.2, 3.9, `fill="#d9b886" opacity="0.62"`),
  );
  for (const x of [2.1, 4.2, 15.8, 17.9]) detallesFrente.push(frente(x - 0.06, x + 0.06, 0.2, 3.9, `fill="#2a2d32"`));
  detallesFrente.push(frente(-0.05, LADO_X + 0.05, 4.15, ALTURA.pb, `fill="#bdb6ab"`));
  detallesLateral.unshift(lateral(0, LADO_Y, 0, ALTURA.pb, `fill="#212428"`), lateral(0.15, LADO_Y - 0.15, 0.2, 3.9, `fill="#c7a676" opacity="0.55"`));
  for (let y = 1.9; y < LADO_Y; y += 1.9) detallesLateral.push(lateral(y - 0.06, y + 0.06, 0.2, 3.9, `fill="#26292e"`));
  detallesLateral.push(lateral(0, LADO_Y, 4.15, ALTURA.pb, `fill="#97918a"`));

  cara([LADO_X / 2, LADO_Y, zTop / 2], ...detallesFrente);
  cara([LADO_X, (y4 + LADO_Y) / 2, zTop / 2], ...detallesLateral);

  // Piso 8: gimnasio y SUM cerrados, terraza con pileta en la esquina
  const z8 = zTop + 0.35;
  const z8b = zTop + ALTURA.amenities;
  const zp = z8b + ALTURA.parapeto;
  cara([11.82, (y3 + LADO_Y) / 2, z8], lateral(y3, LADO_Y, z8, zp, `fill="#2c3035"`, 11.82), lateral(y3 + 0.3, LADO_Y - 0.3, z8 + 0.2, z8b - 0.3, `fill="#b98c5c" opacity="0.55"`, 11.82), lateral(y3, LADO_Y, z8b, zp, `fill="#9d978d"`, 11.82));
  cara([12.5, y3, z8], frente(11.82, 13.13, z8, zp, `fill="#30343a"`, y3), frente(11.82, 13.13, z8b, zp, `fill="#b9b2a7"`, y3));
  cara([13.13, y3 / 2, z8], lateral(0, y3, z8, zp, `fill="#2a2d32"`, 13.13), lateral(0.5, y3 - 0.5, z8 + 0.2, z8b - 0.4, `fill="#b98c5c" opacity="0.4"`, 13.13), lateral(0, y3, z8b, zp, `fill="#98928a"`, 13.13));
  const vidriosGym = [frente(0, 11.82, z8, zp, `fill="#3f4246"`), frente(0.3, 11.82 - 0.3, z8 + 0.2, z8b - 0.3, `fill="#d8aa70" opacity="0.75"`)];
  for (let x = 1.6; x < 11.82 - 0.4; x += 1.6) vidriosGym.push(frente(x - 0.05, x + 0.05, z8 + 0.2, z8b - 0.3, `fill="#2a2d32"`));
  vidriosGym.push(frente(-0.1, 11.82 + 0.1, z8b, zp, `fill="#d3cdc2"`));
  cara([5.9, LADO_Y, z8], ...vidriosGym);
  // Barandas de vidrio (lo más cercano)
  cara([16, LADO_Y + 0.2, z8], frente(11.82, LADO_X, z8, z8 + 1.1, `fill="#a9c6d6" opacity="0.25"`), frente(11.82, LADO_X, z8 + 1.04, z8 + 1.12, `fill="#d3cdc2"`));
  cara([LADO_X + 0.2, LADO_Y / 2, z8], lateral(0, LADO_Y, z8, z8 + 1.1, `fill="#a9c6d6" opacity="0.2"`), lateral(0, LADO_Y, z8 + 1.04, z8 + 1.12, `fill="#a59f95"`));

  const dist = ([x, y, z]: V3) => Math.hypot(x - pos[0], y - pos[1], z - pos[2]);
  caras.sort((a, b) => dist(b.centro) - dist(a.centro));

  // Árboles en las veredas, lejos de la fachada (no tapan pisos)
  const arbol = (x: number, y: number, alto: number) => {
    const [bx, by] = proy([x, y, 0]);
    const [, ty] = proy([x, y, alto]);
    const radio = (by - ty) * 0.32;
    return `<rect x="${r1(bx - 3)}" y="${r1(ty + radio)}" width="6" height="${r1(by - ty - radio)}" fill="#14110d"/><circle cx="${bx}" cy="${r1(ty + radio * 0.6)}" r="${r1(radio)}" fill="#0d1410"/><circle cx="${r1(bx - radio * 0.45)}" cy="${r1(ty + radio * 0.9)}" r="${r1(radio * 0.7)}" fill="#101912"/>`;
  };

  const aPct = (v: V3): Punto => {
    const [x, y] = proy(v);
    return [pct(x, FACHADA.ancho), pct(y, FACHADA.alto)];
  };
  const zonas: Record<number, Punto[]> = {};
  for (const p of PISOS.filter((x) => x.numero >= 0 && x.numero < 8)) {
    const z1 = zPiso(p.numero);
    zonas[p.numero] = franja(proy, z1, z1 + altoPiso(p.numero), 0);
  }
  // Piso 8: la losa, la baranda de la terraza y el contorno de los volúmenes cerrados (gimnasio, SUM y núcleo).
  zonas[8] = (
    [
      [0, LADO_Y, zTop],
      [LADO_X, LADO_Y, zTop],
      [LADO_X, 0, zTop],
      [LADO_X, 0, z8 + 1.1],
      [13.13, 0, zp],
      [13.13, y3, zp],
      [11.82, y3, zp],
      [11.82, LADO_Y, zp],
      [0, LADO_Y, zp],
    ] as V3[]
  ).map(aPct);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FACHADA.ancho}" height="${FACHADA.alto}" viewBox="0 0 ${FACHADA.ancho} ${FACHADA.alto}">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07090f"/><stop offset="0.62" stop-color="#111824"/><stop offset="1" stop-color="#262631"/></linearGradient>
    <radialGradient id="brillo" cx="0.5" cy="1" r="0.7"><stop offset="0" stop-color="#e8a868" stop-opacity="0.12"/><stop offset="1" stop-color="#e8a868" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${FACHADA.ancho}" height="${horizonte}" fill="url(#cielo)"/>
  <rect y="${r1(horizonte - 400)}" width="${FACHADA.ancho}" height="400" fill="url(#brillo)"/>
  ${fondo.join("\n  ")}
  ${caras.map((c) => c.dibujo).join("\n  ")}
  ${arbol(-9, LADO_Y + 2.2, 7)}${arbol(LADO_X + 2.2, -10, 7)}
</svg>`;
  return { svg, zonas };
}


/** Cámara intermedia para los cuadros del giro (0 = vista 1, 1 = vista 2). */
export const camaraEntre = (t: number): Camara => ({
  angulo: CAMARAS[0].angulo + (CAMARAS[1].angulo - CAMARAS[0].angulo) * t,
  distancia: CAMARAS[0].distancia + (CAMARAS[1].distancia - CAMARAS[0].distancia) * t,
});
