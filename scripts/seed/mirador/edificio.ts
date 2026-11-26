/**
 * Edificio Mirador (demo de Desarrollos Demo): esquina de 20 × 15 m con subsuelo de cocheras,
 * planta baja con lobby y local, pisos 1 a 7 de departamentos y piso 8 de amenities.
 * Todo en metros sobre la planta: x de 0 a 20 a lo largo de Av. Colón (izquierda → derecha, la
 * esquina con Rivadavia a la derecha) e y de 0 a 15 desde el contrafrente hasta la línea municipal
 * de Av. Colón (abajo en la planta). De acá salen los dibujos, los polígonos y las filas del seed.
 * Puro: sin base ni archivos (lo usan el seed y el entorno de prueba local).
 */
import type { Punto } from "@/lib/edificio";

export const LADO_X = 20;
export const LADO_Y = 15;

export type Rect = [x1: number, y1: number, x2: number, y2: number];
/** Polígono en metros (vértices en orden). */
export type Forma = Punto[];

export const rectAForma = ([x1, y1, x2, y2]: Rect): Forma => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];

// Bloques que se apilan en todos los pisos: cada planta combina los mismos cuatro.
export const BLOQUE = {
  /** Contrafrente, a la izquierda: 6,4 × 8,75 = 56 m². */
  b1: [0, 0, 6.4, 8.75] as Rect,
  /** Frente a Av. Colón, a la izquierda: 8 × 6,25 = 50 m². */
  b2: [0, 8.75, 8, 15] as Rect,
  /** Esquina: 12 × 6,25 = 75 m². */
  b3: [8, 8.75, 20, 15] as Rect,
  /** Sobre Rivadavia: 5,8 × 6,375 = 37 m². */
  b4: [14.2, 2.375, 20, 8.75] as Rect,
};
/** Núcleo: escalera, ascensores y palier. */
export const NUCLEO: Rect = [6.4, 0, 14.2, 8.75];
export const PATIO: Rect = [14.2, 0, 20, 2.375];

const F = {
  b1: rectAForma(BLOQUE.b1),
  b2: rectAForma(BLOQUE.b2),
  b3: rectAForma(BLOQUE.b3),
  b4: rectAForma(BLOQUE.b4),
  /** b1 + b2 (semipiso de la izquierda). */
  b12: [
    [0, 0],
    [6.4, 0],
    [6.4, 8.75],
    [8, 8.75],
    [8, 15],
    [0, 15],
  ] as Forma,
  /** b3 + b4 (esquina en L). */
  b34: [
    [14.2, 2.375],
    [20, 2.375],
    [20, 15],
    [8, 15],
    [8, 8.75],
    [14.2, 8.75],
  ] as Forma,
  /** Local de planta baja en L: frente de 13,5 m y todo Rivadavia (150 m²). */
  local: [
    [12.5, 0],
    [20, 0],
    [20, 15],
    [6.5, 15],
    [6.5, 8.75],
    [12.5, 8.75],
  ] as Forma,
};

// ---------------------------------------------------------------------------
// Ambientes y muebles de cada tipología (en metros de la planta; cada tipología está siempre
// en el mismo lugar, así la maqueta coincide con su recorte de la planta)
// ---------------------------------------------------------------------------

export type Mueble =
  | { tipo: "cama"; r: Rect; plazas: 1 | 2 }
  | { tipo: "sillon"; r: Rect }
  | { tipo: "mesa"; r: Rect; sillas: number }
  | { tipo: "redonda"; c: Punto; radio: number; sillas: number }
  | { tipo: "mesada"; r: Rect }
  | { tipo: "bacha"; r: Rect }
  | { tipo: "ducha"; r: Rect }
  | { tipo: "inodoro"; c: Punto; giro: 0 | 90 | 180 | 270 }
  | { tipo: "placard"; r: Rect }
  | { tipo: "planta"; c: Punto; radio: number }
  | { tipo: "alfombra"; r: Rect }
  | { tipo: "escritorio"; r: Rect }
  | { tipo: "aparato"; r: Rect }
  | { tipo: "reposera"; r: Rect }
  | { tipo: "agua"; r: Rect }
  | { tipo: "auto"; r: Rect };

export type Ambiente = { nombre: string; r: Rect; piso: "madera" | "ceramica" | "exterior" | "piedra"; muebles: Mueble[] };

export type ClaveTipologia = "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "local";

export type Tipologia = {
  clave: ClaveTipologia;
  nombre: string;
  ambientes: number;
  dormitorios: number;
  banos: number;
  total: number;
  cubierta: number;
  forma: Forma;
  interior: Ambiente[];
  /** Renders provisorios: panorámica CC0 de Poly Haven y hacia dónde mira. */
  renders: { nombre: string; pano: string; yaw: number }[];
};

const living = (r: Rect, extra: Mueble[] = []): Ambiente => ({ nombre: "Living comedor", r, piso: "madera", muebles: extra });

export const TIPOLOGIAS: Tipologia[] = [
  {
    clave: "t1",
    nombre: "Monoambiente",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    total: 50,
    cubierta: 44,
    forma: F.b2,
    interior: [
      { nombre: "Baño", r: [0, 8.75, 2.4, 11.1], piso: "ceramica", muebles: [{ tipo: "ducha", r: [0.15, 8.9, 1.1, 9.85] }, { tipo: "inodoro", c: [1.75, 9.25], giro: 0 }, { tipo: "bacha", r: [1.35, 10.45, 2.25, 10.95] }] },
      { nombre: "Cocina", r: [2.4, 8.75, 8, 10.2], piso: "ceramica", muebles: [{ tipo: "mesada", r: [2.6, 8.9, 6.6, 9.5] }, { tipo: "mesa", r: [4.2, 10.4, 5.6, 11.2], sillas: 4 }] },
      living([0, 11.1, 8, 14], [
        { tipo: "cama", r: [0.3, 11.5, 1.9, 13.5], plazas: 2 },
        { tipo: "placard", r: [0.2, 11.2, 2.4, 11.4] },
        { tipo: "sillon", r: [4.4, 12.9, 6.8, 13.75] },
        { tipo: "alfombra", r: [4.2, 11.6, 7, 12.8] },
      ]),
      { nombre: "Balcón", r: [0, 14, 8, 15], piso: "exterior", muebles: [{ tipo: "planta", c: [0.6, 14.5], radio: 0.35 }, { tipo: "redonda", c: [6.6, 14.5], radio: 0.32, sillas: 2 }] },
    ],
    renders: [
      { nombre: "Ambiente principal", pano: "lythwood_lounge", yaw: 20 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
      { nombre: "Balcón", pano: "veranda", yaw: 0 },
    ],
  },
  {
    clave: "t2",
    nombre: "1 dormitorio",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    total: 56,
    cubierta: 51,
    forma: F.b1,
    interior: [
      { nombre: "Dormitorio", r: [0, 0, 3.4, 3.9], piso: "madera", muebles: [{ tipo: "cama", r: [0.9, 0.35, 2.5, 2.35], plazas: 2 }, { tipo: "placard", r: [0.2, 3.3, 3.2, 3.75] }] },
      living([3.4, 0, 6.4, 5.4], [
        { tipo: "sillon", r: [3.75, 0.35, 6.05, 1.2] },
        { tipo: "alfombra", r: [3.8, 1.4, 6, 2.8] },
        { tipo: "mesa", r: [4.3, 3.6, 5.5, 4.6], sillas: 4 },
      ]),
      { nombre: "Baño", r: [0, 3.9, 2.2, 6.2], piso: "ceramica", muebles: [{ tipo: "ducha", r: [0.15, 4.05, 1.1, 5.0] }, { tipo: "inodoro", c: [1.65, 4.45], giro: 0 }, { tipo: "bacha", r: [0.2, 5.5, 1.2, 6.05] }] },
      { nombre: "Cocina", r: [2.2, 5.4, 6.4, 7.2], piso: "ceramica", muebles: [{ tipo: "mesada", r: [2.35, 6.6, 6.25, 7.1] }] },
      { nombre: "Entrada", r: [0, 7.2, 6.4, 8.75], piso: "madera", muebles: [{ tipo: "placard", r: [0.2, 7.4, 2.2, 7.9] }, { tipo: "planta", c: [0.6, 8.3], radio: 0.3 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "wooden_lounge", yaw: 0 },
      { nombre: "Dormitorio", pano: "hotel_room", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Baño", pano: "bathroom", yaw: 0 },
    ],
  },
  {
    clave: "t3",
    nombre: "2 dormitorios en esquina",
    ambientes: 3,
    dormitorios: 2,
    banos: 1,
    total: 75,
    cubierta: 66,
    forma: F.b3,
    interior: [
      { nombre: "Baño", r: [8, 8.75, 10.2, 10.9], piso: "ceramica", muebles: [{ tipo: "ducha", r: [8.15, 8.9, 9.1, 9.85] }, { tipo: "inodoro", c: [9.7, 9.3], giro: 0 }, { tipo: "bacha", r: [8.2, 10.25, 9.2, 10.8] }] },
      { nombre: "Entrada", r: [10.2, 8.75, 11.6, 10.9], piso: "madera", muebles: [] },
      { nombre: "Cocina", r: [11.6, 8.75, 14.2, 10.9], piso: "ceramica", muebles: [{ tipo: "mesada", r: [11.75, 8.9, 14.05, 9.5] }] },
      { nombre: "Dormitorio", r: [8, 10.9, 11.1, 14], piso: "madera", muebles: [{ tipo: "cama", r: [8.75, 11.3, 10.35, 13.3], plazas: 2 }, { tipo: "placard", r: [8.15, 11.05, 8.55, 13.85] }] },
      { nombre: "Dormitorio", r: [11.1, 10.9, 14.2, 14], piso: "madera", muebles: [{ tipo: "cama", r: [12.2, 11.4, 13.2, 13.3], plazas: 1 }, { tipo: "escritorio", r: [11.3, 13.0, 11.9, 13.85] }, { tipo: "placard", r: [13.75, 11.05, 14.1, 13.0] }] },
      living([14.2, 8.75, 20, 14], [
        { tipo: "mesa", r: [15.0, 9.4, 16.8, 10.3], sillas: 6 },
        { tipo: "sillon", r: [16.9, 12.9, 19.6, 13.8] },
        { tipo: "alfombra", r: [16.6, 11.0, 19.7, 12.7] },
        { tipo: "planta", c: [19.4, 9.3], radio: 0.4 },
      ]),
      { nombre: "Balcón", r: [8, 14, 20, 15], piso: "exterior", muebles: [{ tipo: "reposera", r: [18.2, 14.15, 19.8, 14.75] }, { tipo: "planta", c: [8.6, 14.5], radio: 0.35 }, { tipo: "redonda", c: [15.6, 14.5], radio: 0.32, sillas: 2 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "glasshouse_interior", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 90 },
      { nombre: "Dormitorio principal", pano: "lythwood_room", yaw: 90 },
      { nombre: "Segundo dormitorio", pano: "lythwood_room", yaw: 270 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 180 },
      { nombre: "Balcón", pano: "veranda", yaw: 90 },
    ],
  },
  {
    clave: "t4",
    nombre: "Monoambiente compacto",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    total: 37,
    cubierta: 34,
    forma: F.b4,
    interior: [
      { nombre: "Baño", r: [14.2, 2.375, 16.3, 4.5], piso: "ceramica", muebles: [{ tipo: "ducha", r: [14.35, 2.5, 15.3, 3.45] }, { tipo: "inodoro", c: [15.85, 2.9], giro: 0 }, { tipo: "bacha", r: [14.4, 3.85, 15.4, 4.35] }] },
      { nombre: "Cocina", r: [16.3, 2.375, 20, 4.0], piso: "ceramica", muebles: [{ tipo: "mesada", r: [16.45, 2.5, 19.85, 3.1] }] },
      { nombre: "Ambiente principal", r: [14.2, 4.5, 20, 8.75], piso: "madera", muebles: [
        { tipo: "cama", r: [14.5, 6.4, 16.1, 8.4], plazas: 2 },
        { tipo: "sillon", r: [19.0, 5.2, 19.85, 7.6] },
        { tipo: "redonda", c: [17.4, 5.4], radio: 0.45, sillas: 2 },
      ] },
    ],
    renders: [
      { nombre: "Ambiente principal", pano: "lythwood_room", yaw: 180 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 270 },
      { nombre: "Baño", pano: "bathroom", yaw: 180 },
    ],
  },
  {
    clave: "t5",
    nombre: "3 dormitorios en esquina",
    ambientes: 4,
    dormitorios: 3,
    banos: 2,
    total: 112,
    cubierta: 98,
    forma: F.b34,
    interior: [
      { nombre: "Dormitorio principal", r: [14.2, 2.375, 20, 6.2], piso: "madera", muebles: [{ tipo: "cama", r: [16.6, 2.9, 18.2, 4.9], plazas: 2 }, { tipo: "placard", r: [14.35, 2.5, 14.85, 5.9] }] },
      { nombre: "Baño en suite", r: [17.6, 6.2, 20, 8.75], piso: "ceramica", muebles: [{ tipo: "ducha", r: [18.9, 6.35, 19.85, 7.3] }, { tipo: "inodoro", c: [18.2, 6.7], giro: 0 }, { tipo: "bacha", r: [17.8, 8.0, 19.1, 8.6] }] },
      { nombre: "Cocina", r: [14.2, 6.2, 17.6, 8.75], piso: "ceramica", muebles: [{ tipo: "mesada", r: [14.35, 6.35, 17.45, 6.95] }, { tipo: "mesada", r: [15.2, 7.8, 17.0, 8.4] }] },
      { nombre: "Baño", r: [8, 8.75, 10.2, 10.9], piso: "ceramica", muebles: [{ tipo: "ducha", r: [8.15, 8.9, 9.1, 9.85] }, { tipo: "inodoro", c: [9.7, 9.3], giro: 0 }, { tipo: "bacha", r: [8.2, 10.25, 9.2, 10.8] }] },
      { nombre: "Entrada", r: [10.2, 8.75, 12.2, 10.9], piso: "madera", muebles: [] },
      { nombre: "Lavadero", r: [12.2, 8.75, 14.2, 10.9], piso: "ceramica", muebles: [{ tipo: "mesada", r: [12.35, 8.9, 14.05, 9.5] }] },
      { nombre: "Dormitorio", r: [8, 10.9, 11.1, 14], piso: "madera", muebles: [{ tipo: "cama", r: [9.0, 11.4, 10.0, 13.3], plazas: 1 }, { tipo: "placard", r: [8.15, 11.05, 8.55, 13.85] }] },
      { nombre: "Dormitorio", r: [11.1, 10.9, 14.2, 14], piso: "madera", muebles: [{ tipo: "cama", r: [12.2, 11.4, 13.2, 13.3], plazas: 1 }, { tipo: "placard", r: [13.75, 11.05, 14.1, 13.85] }] },
      living([14.2, 8.75, 20, 14], [
        { tipo: "mesa", r: [15.0, 9.4, 16.8, 10.3], sillas: 6 },
        { tipo: "sillon", r: [16.9, 12.9, 19.6, 13.8] },
        { tipo: "alfombra", r: [16.6, 11.0, 19.7, 12.7] },
        { tipo: "planta", c: [19.4, 9.3], radio: 0.4 },
      ]),
      { nombre: "Balcón terraza", r: [8, 14, 20, 15], piso: "exterior", muebles: [{ tipo: "reposera", r: [18.2, 14.15, 19.8, 14.75] }, { tipo: "reposera", r: [16.4, 14.15, 18.0, 14.75] }, { tipo: "planta", c: [8.6, 14.5], radio: 0.35 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 200 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Dormitorio principal", pano: "hotel_room", yaw: 120 },
      { nombre: "Dormitorio", pano: "lythwood_room", yaw: 0 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 90 },
      { nombre: "Balcón terraza", pano: "veranda", yaw: 180 },
    ],
  },
  {
    clave: "t6",
    nombre: "Semipiso de 2 dormitorios en suite",
    ambientes: 3,
    dormitorios: 2,
    banos: 2,
    total: 106,
    cubierta: 94,
    forma: F.b12,
    interior: [
      { nombre: "Suite", r: [0, 0, 3.4, 4.6], piso: "madera", muebles: [{ tipo: "cama", r: [0.9, 0.4, 2.5, 2.4], plazas: 2 }, { tipo: "placard", r: [0.2, 4.0, 2.2, 4.45] }] },
      { nombre: "Suite", r: [3.4, 0, 6.4, 4.6], piso: "madera", muebles: [{ tipo: "cama", r: [4.1, 0.4, 5.7, 2.4], plazas: 2 }, { tipo: "placard", r: [4.4, 4.0, 6.25, 4.45] }] },
      { nombre: "Baño en suite", r: [0, 4.6, 2.2, 6.6], piso: "ceramica", muebles: [{ tipo: "ducha", r: [0.15, 4.75, 1.1, 5.7] }, { tipo: "inodoro", c: [1.7, 5.1], giro: 0 }, { tipo: "bacha", r: [0.2, 6.0, 1.3, 6.5] }] },
      { nombre: "Vestidor", r: [2.2, 4.6, 4.2, 6.6], piso: "madera", muebles: [{ tipo: "placard", r: [2.35, 4.75, 4.05, 5.2] }] },
      { nombre: "Baño en suite", r: [4.2, 4.6, 6.4, 6.6], piso: "ceramica", muebles: [{ tipo: "ducha", r: [5.3, 4.75, 6.25, 5.7] }, { tipo: "inodoro", c: [4.7, 5.1], giro: 0 }, { tipo: "bacha", r: [4.4, 6.0, 5.5, 6.5] }] },
      { nombre: "Cocina", r: [0, 6.6, 6.4, 8.75], piso: "ceramica", muebles: [{ tipo: "mesada", r: [0.15, 6.75, 4.6, 7.35] }, { tipo: "mesada", r: [1.2, 8.0, 4.0, 8.6] }] },
      living([0, 8.75, 8, 14], [
        { tipo: "mesa", r: [0.6, 9.4, 2.4, 10.4], sillas: 6 },
        { tipo: "sillon", r: [4.6, 12.9, 7.6, 13.8] },
        { tipo: "alfombra", r: [4.4, 10.6, 7.8, 12.7] },
        { tipo: "planta", c: [0.6, 13.4], radio: 0.4 },
      ]),
      { nombre: "Balcón", r: [0, 14, 8, 15], piso: "exterior", muebles: [{ tipo: "reposera", r: [5.9, 14.15, 7.6, 14.75] }, { tipo: "redonda", c: [1.6, 14.5], radio: 0.32, sillas: 2 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 90 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Suite principal", pano: "hotel_room", yaw: 0 },
      { nombre: "Baño en suite", pano: "modern_bathroom", yaw: 270 },
      { nombre: "Segunda suite", pano: "lythwood_room", yaw: 180 },
      { nombre: "Balcón", pano: "veranda", yaw: 270 },
    ],
  },
  {
    clave: "local",
    nombre: "Local comercial",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    total: 150,
    cubierta: 150,
    forma: F.local,
    interior: [
      { nombre: "Salón", r: [6.5, 8.75, 20, 15], piso: "piedra", muebles: [{ tipo: "mesa", r: [9.0, 10.8, 11.6, 11.8], sillas: 0 }, { tipo: "mesa", r: [13.4, 10.8, 16.0, 11.8], sillas: 0 }, { tipo: "planta", c: [19.2, 14.2], radio: 0.45 }] },
      { nombre: "Salón", r: [12.5, 2.2, 20, 8.75], piso: "piedra", muebles: [{ tipo: "mesada", r: [19.2, 3.0, 19.8, 8.0] }] },
      { nombre: "Depósito", r: [12.5, 0, 17.2, 2.2], piso: "ceramica", muebles: [] },
      { nombre: "Baño", r: [17.2, 0, 20, 2.2], piso: "ceramica", muebles: [{ tipo: "inodoro", c: [19.3, 0.6], giro: 0 }, { tipo: "bacha", r: [17.4, 1.5, 18.4, 2.05] }] },
    ],
    renders: [
      { nombre: "Salón", pano: "decor_shop", yaw: 0 },
      { nombre: "Vidriera", pano: "phone_shop", yaw: 0 },
    ],
  },
];

export const tipologia = (clave: ClaveTipologia) => TIPOLOGIAS.find((t) => t.clave === clave)!;

// ---------------------------------------------------------------------------
// Pisos, unidades, cocheras y espacios
// ---------------------------------------------------------------------------

/** Altura de cada nivel (m): la fachada y sus zonas salen de acá. */
export const ALTURA = { pb: 4.2, piso: 3, amenities: 3.4, parapeto: 0.7 };
export const zPiso = (n: number) => (n <= 0 ? 0 : ALTURA.pb + (n - 1) * ALTURA.piso);
export const altoPiso = (n: number) => (n === 0 ? ALTURA.pb : n === 8 ? ALTURA.amenities : ALTURA.piso);
export const ALTO_EDIFICIO = zPiso(8) + ALTURA.amenities + ALTURA.parapeto;

/** Qué planta usa cada piso (los iguales comparten imagen). */
export type ClavePlanta = "subsuelo" | "pb" | "p12" | "p34" | "p57" | "p8";
export const PISOS: { numero: number; nombre: string; planta: ClavePlanta }[] = [
  { numero: 8, nombre: "Piso 8", planta: "p8" },
  ...[7, 6, 5].map((n) => ({ numero: n, nombre: `Piso ${n}`, planta: "p57" as const })),
  ...[4, 3].map((n) => ({ numero: n, nombre: `Piso ${n}`, planta: "p34" as const })),
  ...[2, 1].map((n) => ({ numero: n, nombre: `Piso ${n}`, planta: "p12" as const })),
  { numero: 0, nombre: "Planta baja", planta: "pb" },
  { numero: -1, nombre: "Subsuelo", planta: "subsuelo" },
];

export type UnidadDef = {
  codigo: string;
  piso: number;
  tipo: ClaveTipologia | "cochera";
  categoria: "departamento" | "local" | "cochera";
  operacion: "venta" | "alquiler";
  forma: Forma;
  orientacion: string;
  total: number;
  cubierta: number;
};

const ORIENTACION: Record<string, string> = {
  b1: "Sur (contrafrente)",
  b2: "Norte (frente a Av. Colón)",
  b3: "Norte y oeste (esquina)",
  b4: "Oeste (sobre Rivadavia)",
  b12: "Norte y sur (frente y contrafrente)",
  b34: "Norte y oeste (esquina)",
};

/** Distribución de cada planta de departamentos: letra → tipología y bloque. */
const PLANTAS_TIPO: Record<"p12" | "p34" | "p57", [letra: string, tipo: ClaveTipologia, bloque: keyof typeof ORIENTACION][]> = {
  p12: [
    ["A", "t1", "b2"],
    ["B", "t2", "b1"],
    ["C", "t3", "b3"],
    ["D", "t4", "b4"],
  ],
  p34: [
    ["A", "t1", "b2"],
    ["B", "t2", "b1"],
    ["C", "t5", "b34"],
  ],
  p57: [
    ["A", "t6", "b12"],
    ["B", "t5", "b34"],
  ],
};

/** Cocheras de 2,5 × 5 m: C1 a C4 contra el fondo, C5 a C8 hacia Av. Colón. */
export const COCHERAS: { codigo: string; r: Rect }[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
  const x = 10 + (i % 4) * 2.5;
  const y = i < 4 ? 0 : 10;
  return { codigo: `C${i + 1}`, r: [x, y, x + 2.5, y + 5] };
});

export const UNIDADES: UnidadDef[] = [
  ...COCHERAS.map(({ codigo, r }) => ({
    codigo,
    piso: -1,
    tipo: "cochera" as const,
    categoria: "cochera" as const,
    operacion: "venta" as const,
    forma: rectAForma(r),
    orientacion: "",
    total: 12.5,
    cubierta: 12.5,
  })),
  { codigo: "Local", piso: 0, tipo: "local", categoria: "local", operacion: "alquiler", forma: F.local, orientacion: "Norte y oeste (esquina)", total: 150, cubierta: 150 },
  ...PISOS.filter((p) => p.planta === "p12" || p.planta === "p34" || p.planta === "p57").flatMap((p) =>
    PLANTAS_TIPO[p.planta as "p12" | "p34" | "p57"].map(([letra, tipo, bloque]) => {
      const t = tipologia(tipo);
      return {
        codigo: `${p.numero}${letra}`,
        piso: p.numero,
        tipo,
        categoria: "departamento" as const,
        operacion: "venta" as const,
        forma: F[bloque as keyof typeof F],
        orientacion: ORIENTACION[bloque],
        total: t.total,
        cubierta: t.cubierta,
      };
    }),
  ),
];

/** Estados mezclados: más vendidas arriba y en las esquinas; el resto disponibles. */
export const ESTADOS: Record<string, "reservada" | "vendida" | "alquilada"> = {
  "7B": "vendida",
  "6B": "vendida",
  "5A": "vendida",
  "4C": "vendida",
  "3A": "vendida",
  "2C": "vendida",
  "7A": "reservada",
  "3C": "reservada",
  "2B": "reservada",
  "1D": "reservada",
  C1: "vendida",
  C2: "vendida",
  C5: "reservada",
};
/** Precio "a consultar". */
export const CONSULTAR = new Set(["6A", "5B", "Local"]);

/** USD por m² total: cada piso un 2,5 % más caro; la esquina y los semipisos, un 6 % más. */
export function precioUnidad(u: UnidadDef) {
  if (u.categoria === "cochera") return 18000 + (Number(u.codigo.slice(1)) > 4 ? 1500 : 0);
  if (u.categoria === "local") return null;
  const base = 1850 * u.total * (1 + 0.025 * (u.piso - 1));
  const extra = u.tipo === "t3" || u.tipo === "t5" || u.tipo === "t6" ? 1.06 : u.tipo === "t2" ? 0.95 : 1;
  return Math.round((base * extra) / 500) * 500;
}

export type EspacioDef = { slug: string; nombre: string; piso: number; punto: Punto; descripcion: string; imagenes: { nombre: string; pano: string; yaw: number }[] };

/** Espacios comunes con un punto sobre su planta (en metros). */
export const ESPACIOS: EspacioDef[] = [
  {
    slug: "lobby",
    nombre: "Lobby",
    piso: 0,
    punto: [4.75, 11.9],
    descripcion: "Acceso por Av. Colón con doble altura y control de ingreso.",
    imagenes: [
      { nombre: "Lobby", pano: "entrance_hall", yaw: 0 },
      { nombre: "Hall de ascensores", pano: "newman_lobby", yaw: 90 },
    ],
  },
  {
    slug: "sum",
    nombre: "SUM con parrilla",
    piso: 8,
    punto: [3.2, 4.4],
    descripcion: "Salón de usos múltiples con parrilla y vista a la ciudad.",
    imagenes: [
      { nombre: "SUM", pano: "warm_restaurant", yaw: 0 },
      { nombre: "Parrilla", pano: "wooden_lounge", yaw: 180 },
    ],
  },
  {
    slug: "gimnasio",
    nombre: "Gimnasio",
    piso: 8,
    punto: [4, 11.9],
    descripcion: "Equipado, con ventanales a Av. Colón.",
    imagenes: [
      { nombre: "Gimnasio", pano: "gym_01", yaw: 0 },
      { nombre: "Sala de entrenamiento", pano: "crossfit_gym", yaw: 90 },
    ],
  },
  {
    slug: "pileta",
    nombre: "Pileta y solárium",
    piso: 8,
    punto: [14.2, 11.9],
    descripcion: "Pileta descubierta en la esquina, con solárium y deck.",
    imagenes: [
      { nombre: "Pileta", pano: "pool", yaw: 0 },
      { nombre: "Solárium", pano: "hotel_rooftop_balcony", yaw: 0 },
    ],
  },
];

export const PROYECTO = {
  nombre: "Edificio Mirador",
  slug: "edificio-mirador",
  ciudad: "Olavarría",
  direccion: "Av. Colón 2400, esquina Rivadavia",
  descripcion: "Departamentos de monoambiente a 3 dormitorios en una esquina de Olavarría, con amenities en el último piso, local comercial y cocheras.",
  vista1: "Av. Colón",
  vista2: "Rivadavia",
  sobreTitulo: "Somos Desarrollos Demo",
  sobreTexto:
    "Proyectamos, construimos y vendemos nuestros edificios con el mismo equipo, de la primera línea del plano a la entrega de llaves. Mirador nace en una esquina con luz de dos frentes: dibujamos cada planta para que los departamentos tengan vista abierta y el último piso sea de todos.",
  entrega: "Diciembre de 2028",
  amenities: ["SUM con parrilla", "Gimnasio", "Pileta y solárium", "Vestuarios"],
};
