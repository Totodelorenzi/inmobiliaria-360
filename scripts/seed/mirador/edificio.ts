/**
 * Edificio Mirador (demo de Desarrollos Demo): torre de perímetro libre en esquina, de 20 × 15 m.
 * Subsuelo con 14 cocheras (rampa por el retiro lateral), planta baja de 4,5 m con lobby y dos
 * locales en alquiler, pisos 1 a 7 de departamentos (22 en venta) y piso 8 de amenities. Pisos de
 * 3,2 m; altura total 30,4 m.
 * Todo en metros sobre la planta: x de 0 a 20 a lo largo de Av. Colón (la esquina con Rivadavia a la
 * derecha) e y de 0 a 15 desde el contrafrente hasta la línea de Av. Colón (abajo en la planta).
 * Puro: sin base ni archivos (lo usan el seed y el entorno de prueba local).
 */
import type { Punto } from "@/lib/edificio";

export const LADO_X = 20;
export const LADO_Y = 15;
/** Ancho del retiro lateral izquierdo, por donde baja la rampa a las cocheras. */
export const RETIRO = 3.6;

export type Rect = [x1: number, y1: number, x2: number, y2: number];
/** Polígono en metros (vértices en orden). */
export type Forma = Punto[];

export const rectAForma = ([x1, y1, x2, y2]: Rect): Forma => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];

/** Fila de frente (Av. Colón) desde y = 6,85 m antes de la línea; contrafrente detrás. */
export const Y_FRENTE = 8.15;

// Bloques que se apilan en los pisos de departamentos (las plantas los combinan).
export const BLOQUE = {
  /** Esquina frente izquierda: 8,18 × 6,85 = 56 m². */
  a: [0, Y_FRENTE, 8.18, LADO_Y] as Rect,
  /** Frente al medio: 3,64 × 6,85 = 25 m². */
  b: [8.18, Y_FRENTE, 11.82, LADO_Y] as Rect,
  /** Esquina frente derecha (Rivadavia): 56 m². */
  c: [11.82, Y_FRENTE, LADO_X, LADO_Y] as Rect,
  /** Esquina contrafrente izquierda: 6,87 × 8,15 = 56 m². */
  d: [0, 0, 6.87, Y_FRENTE] as Rect,
  /** Esquina contrafrente derecha: 56 m². */
  e: [13.13, 0, LADO_X, Y_FRENTE] as Rect,
};
/** Núcleo de los pisos altos: escalera, ascensores y palier (51 m²). */
export const NUCLEO: Rect = [6.87, 0, 13.13, Y_FRENTE];
/** Núcleo de planta baja (el hall se suma al lobby). */
export const NUCLEO_PB: Rect = [8.2, 0, 11.8, 6.2];
/** Lobby de planta baja sobre Av. Colón (50 m²). */
export const LOBBY: Rect = [6.35, Y_FRENTE, 13.65, LADO_Y];

const F = {
  a: rectAForma(BLOQUE.a),
  b: rectAForma(BLOQUE.b),
  c: rectAForma(BLOQUE.c),
  d: rectAForma(BLOQUE.d),
  e: rectAForma(BLOQUE.e),
  /** 3 dormitorios en esquina: frente al medio + esquina frente + contrafrente derecho (137 m²). */
  bce: [
    [8.18, Y_FRENTE],
    [13.13, Y_FRENTE],
    [13.13, 0],
    [LADO_X, 0],
    [LADO_X, LADO_Y],
    [8.18, LADO_Y],
  ] as Forma,
  /** Semipiso oeste (125 m²); el este es su espejo. */
  semiOeste: [
    [0, 0],
    [6.87, 0],
    [6.87, Y_FRENTE],
    [10, Y_FRENTE],
    [10, LADO_Y],
    [0, LADO_Y],
  ] as Forma,
  semiEste: [
    [13.13, 0],
    [LADO_X, 0],
    [LADO_X, LADO_Y],
    [10, LADO_Y],
    [10, Y_FRENTE],
    [13.13, Y_FRENTE],
  ] as Forma,
  /** Local 1, en la esquina con Rivadavia (112 m²); el 2 es su espejo. */
  local1: [
    [11.8, 0],
    [LADO_X, 0],
    [LADO_X, LADO_Y],
    [13.65, LADO_Y],
    [13.65, Y_FRENTE],
    [11.8, Y_FRENTE],
  ] as Forma,
  local2: [
    [0, 0],
    [8.2, 0],
    [8.2, Y_FRENTE],
    [6.35, Y_FRENTE],
    [6.35, LADO_Y],
    [0, LADO_Y],
  ] as Forma,
};

// ---------------------------------------------------------------------------
// Ambientes y muebles de cada tipología (en metros de la planta). Cada tipología se dibuja en su
// posición de referencia; las espejadas (C, E, B de los semipisos, local 2) dan vuelta la maqueta.
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

export type ClaveTipologia = "t1" | "t2" | "t3" | "t4" | "t5" | "local";

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

const living = (r: Rect, muebles: Mueble[] = []): Ambiente => ({ nombre: "Living comedor", r, piso: "madera", muebles });
const bano = (nombre: string, [x1, y1, x2, y2]: Rect): Ambiente => ({
  nombre,
  r: [x1, y1, x2, y2],
  piso: "ceramica",
  muebles: [
    { tipo: "ducha", r: [x1 + 0.15, y1 + 0.15, x1 + 1.1, y1 + 1.1] },
    { tipo: "inodoro", c: [x2 - 0.5, y1 + 0.55], giro: 0 },
    { tipo: "bacha", r: [x1 + 0.2, y2 - 0.6, x1 + 1.2, y2 - 0.1] },
  ],
});

export const TIPOLOGIAS: Tipologia[] = [
  {
    clave: "t1",
    nombre: "Monoambiente",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    total: 25,
    cubierta: 25,
    forma: F.b,
    interior: [
      bano("Baño", [8.18, 8.15, 10.2, 10.2]),
      { nombre: "Cocina", r: [10.2, 8.15, 11.82, 10.2], piso: "ceramica", muebles: [{ tipo: "mesada", r: [11.2, 8.3, 11.7, 10.0] }] },
      {
        nombre: "Ambiente principal",
        r: [8.18, 10.2, 11.82, 15],
        piso: "madera",
        muebles: [
          { tipo: "cama", r: [8.4, 12.6, 9.8, 14.6], plazas: 2 },
          { tipo: "sillon", r: [10.85, 11.0, 11.65, 12.9] },
          { tipo: "redonda", c: [10.0, 11.2], radio: 0.35, sillas: 2 },
        ],
      },
    ],
    renders: [
      { nombre: "Ambiente principal", pano: "lythwood_room", yaw: 180 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 270 },
      { nombre: "Baño", pano: "bathroom", yaw: 180 },
    ],
  },
  {
    clave: "t2",
    nombre: "1 dormitorio esquina frente",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    total: 56,
    cubierta: 52,
    forma: F.a,
    interior: [
      bano("Baño", [0, 8.15, 2.3, 10.4]),
      { nombre: "Cocina", r: [2.3, 8.15, 8.18, 9.7], piso: "ceramica", muebles: [{ tipo: "mesada", r: [2.5, 8.3, 6.4, 8.9] }] },
      { nombre: "Dormitorio", r: [0, 10.4, 3.6, 15], piso: "madera", muebles: [{ tipo: "cama", r: [0.9, 12.6, 2.5, 14.6], plazas: 2 }, { tipo: "placard", r: [0.15, 10.55, 3.4, 11.0] }] },
      living([3.6, 9.7, 8.18, 15], [
        { tipo: "mesa", r: [4.4, 10.3, 6.0, 11.2], sillas: 4 },
        { tipo: "sillon", r: [4.5, 13.9, 7.4, 14.75] },
        { tipo: "alfombra", r: [4.3, 12.2, 7.6, 13.7] },
        { tipo: "planta", c: [7.6, 10.4], radio: 0.35 },
      ]),
    ],
    renders: [
      { nombre: "Living comedor", pano: "wooden_lounge", yaw: 0 },
      { nombre: "Dormitorio", pano: "hotel_room", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 0 },
    ],
  },
  {
    clave: "t3",
    nombre: "1 dormitorio esquina contrafrente",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    total: 56,
    cubierta: 52,
    forma: F.d,
    interior: [
      { nombre: "Dormitorio", r: [0, 0, 3.4, 4.0], piso: "madera", muebles: [{ tipo: "cama", r: [0.9, 0.4, 2.5, 2.4], plazas: 2 }, { tipo: "placard", r: [0.15, 3.4, 3.2, 3.85] }] },
      living([3.4, 0, 6.87, 5.2], [
        { tipo: "sillon", r: [3.7, 0.35, 6.6, 1.2] },
        { tipo: "alfombra", r: [3.8, 1.4, 6.5, 2.9] },
        { tipo: "mesa", r: [4.3, 3.6, 5.9, 4.5], sillas: 4 },
      ]),
      bano("Baño", [0, 4.0, 2.2, 6.4]),
      { nombre: "Cocina", r: [2.2, 5.2, 6.87, 8.15], piso: "ceramica", muebles: [{ tipo: "mesada", r: [2.4, 7.5, 6.7, 8.0] }] },
      { nombre: "Entrada", r: [0, 6.4, 2.2, 8.15], piso: "madera", muebles: [{ tipo: "planta", c: [0.55, 7.6], radio: 0.3 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 20 },
      { nombre: "Dormitorio", pano: "lythwood_room", yaw: 90 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 0 },
      { nombre: "Baño", pano: "bathroom", yaw: 0 },
    ],
  },
  {
    clave: "t4",
    nombre: "3 dormitorios en esquina",
    ambientes: 4,
    dormitorios: 3,
    banos: 2,
    total: 137,
    cubierta: 126,
    forma: F.bce,
    interior: [
      { nombre: "Dormitorio principal", r: [13.13, 0, 20, 4.6], piso: "madera", muebles: [{ tipo: "cama", r: [15.8, 0.5, 17.4, 2.5], plazas: 2 }, { tipo: "placard", r: [13.3, 0.2, 13.8, 4.4] }] },
      bano("Baño en suite", [13.13, 4.6, 16.4, 8.15]),
      { nombre: "Cocina", r: [16.4, 4.6, 20, 8.15], piso: "ceramica", muebles: [{ tipo: "mesada", r: [16.6, 4.75, 19.85, 5.35] }, { tipo: "mesada", r: [17.0, 7.0, 19.4, 7.6] }] },
      bano("Baño", [8.18, 8.15, 10.2, 10.4]),
      { nombre: "Entrada", r: [10.2, 8.15, 11.82, 10.4], piso: "madera", muebles: [] },
      { nombre: "Dormitorio", r: [8.18, 10.4, 11.82, 15], piso: "madera", muebles: [{ tipo: "cama", r: [9.5, 12.6, 10.5, 14.6], plazas: 1 }, { tipo: "placard", r: [8.3, 10.55, 11.7, 10.95] }] },
      { nombre: "Escritorio", r: [11.82, 8.15, 15.2, 11.3], piso: "madera", muebles: [{ tipo: "escritorio", r: [12.1, 8.4, 14.0, 9.0] }] },
      { nombre: "Dormitorio", r: [11.82, 11.3, 15.2, 15], piso: "madera", muebles: [{ tipo: "cama", r: [12.8, 12.8, 13.8, 14.7], plazas: 1 }, { tipo: "placard", r: [14.75, 11.5, 15.1, 14.8] }] },
      living([15.2, 8.15, 20, 15], [
        { tipo: "mesa", r: [16.0, 8.9, 17.8, 9.8], sillas: 6 },
        { tipo: "sillon", r: [16.6, 13.9, 19.6, 14.75] },
        { tipo: "alfombra", r: [16.4, 11.6, 19.7, 13.6] },
        { tipo: "planta", c: [19.4, 8.8], radio: 0.4 },
      ]),
    ],
    renders: [
      { nombre: "Living comedor", pano: "glasshouse_interior", yaw: 0 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 90 },
      { nombre: "Dormitorio principal", pano: "hotel_room", yaw: 120 },
      { nombre: "Dormitorio", pano: "lythwood_room", yaw: 270 },
      { nombre: "Baño", pano: "modern_bathroom", yaw: 180 },
    ],
  },
  {
    clave: "t5",
    nombre: "Semipiso de 3 dormitorios",
    ambientes: 4,
    dormitorios: 3,
    banos: 2,
    total: 125,
    cubierta: 116,
    forma: F.semiOeste,
    interior: [
      { nombre: "Dormitorio principal", r: [0, 0, 3.6, 4.3], piso: "madera", muebles: [{ tipo: "cama", r: [1.0, 0.4, 2.6, 2.4], plazas: 2 }, { tipo: "placard", r: [0.15, 3.7, 3.4, 4.15] }] },
      { nombre: "Dormitorio", r: [3.6, 0, 6.87, 4.3], piso: "madera", muebles: [{ tipo: "cama", r: [4.7, 0.4, 5.7, 2.3], plazas: 1 }, { tipo: "placard", r: [3.75, 3.7, 6.7, 4.15] }] },
      bano("Baño en suite", [0, 4.3, 2.4, 6.4]),
      bano("Baño", [2.4, 4.3, 4.6, 6.4]),
      { nombre: "Pasillo", r: [4.6, 4.3, 6.87, 6.4], piso: "madera", muebles: [] },
      { nombre: "Cocina", r: [0, 6.4, 6.87, 8.15], piso: "ceramica", muebles: [{ tipo: "mesada", r: [0.15, 6.55, 5.2, 7.15] }] },
      { nombre: "Dormitorio", r: [0, 8.15, 3.4, 12.0], piso: "madera", muebles: [{ tipo: "cama", r: [0.9, 9.6, 1.9, 11.5], plazas: 1 }, { tipo: "placard", r: [2.9, 8.3, 3.3, 11.8] }] },
      living([3.4, 8.15, 10, 15], [
        { tipo: "mesa", r: [4.2, 8.9, 6.4, 9.8], sillas: 6 },
        { tipo: "sillon", r: [6.2, 13.9, 9.4, 14.75] },
        { tipo: "alfombra", r: [6.0, 11.4, 9.6, 13.6] },
        { tipo: "planta", c: [9.5, 8.8], radio: 0.4 },
      ]),
      { nombre: "Escritorio", r: [0, 12.0, 3.4, 15], piso: "madera", muebles: [{ tipo: "escritorio", r: [0.3, 14.2, 2.2, 14.8] }, { tipo: "planta", c: [2.9, 12.6], radio: 0.3 }] },
    ],
    renders: [
      { nombre: "Living comedor", pano: "lythwood_lounge", yaw: 90 },
      { nombre: "Cocina", pano: "kiara_interior", yaw: 180 },
      { nombre: "Dormitorio principal", pano: "hotel_room", yaw: 0 },
      { nombre: "Dormitorio", pano: "lythwood_room", yaw: 180 },
      { nombre: "Baño en suite", pano: "modern_bathroom", yaw: 270 },
      { nombre: "Vista desde el living", pano: "veranda", yaw: 270 },
    ],
  },
  {
    clave: "local",
    nombre: "Local comercial",
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    total: 112,
    cubierta: 112,
    forma: F.local1,
    interior: [
      { nombre: "Salón", r: [13.65, 8.15, 20, 15], piso: "piedra", muebles: [{ tipo: "mesa", r: [15.0, 11.0, 17.6, 12.0], sillas: 0 }, { tipo: "planta", c: [19.3, 14.3], radio: 0.45 }] },
      { nombre: "Salón", r: [11.8, 2.4, 20, 8.15], piso: "piedra", muebles: [{ tipo: "mesada", r: [19.3, 3.0, 19.85, 7.6] }] },
      { nombre: "Depósito", r: [11.8, 0, 16.6, 2.4], piso: "ceramica", muebles: [] },
      { nombre: "Baño", r: [16.6, 0, 20, 2.4], piso: "ceramica", muebles: [{ tipo: "inodoro", c: [19.3, 0.6], giro: 0 }, { tipo: "bacha", r: [16.8, 1.7, 17.8, 2.25] }] },
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

/** Altura de cada nivel (m): planta baja 4,5, pisos de 3,2 y parapeto; total 30,4 m. */
export const ALTURA = { pb: 4.5, piso: 3.2, amenities: 3.2, parapeto: 0.3 };
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
  /** Versión espejada de su tipología (la maqueta y los renders se dan vuelta). */
  espejada: boolean;
};

type Lugar = [letra: string, tipo: ClaveTipologia, forma: keyof typeof F, orientacion: string, espejada: boolean];
/** Distribución de cada planta de departamentos. */
const PLANTAS_TIPO: Record<"p12" | "p34" | "p57", Lugar[]> = {
  p12: [
    ["A", "t2", "a", "Norte y oeste (esquina frente)", false],
    ["B", "t1", "b", "Norte (frente)", false],
    ["C", "t2", "c", "Norte y este (esquina frente)", true],
    ["D", "t3", "d", "Sur y oeste (esquina contrafrente)", false],
    ["E", "t3", "e", "Sur y este (esquina contrafrente)", true],
  ],
  p34: [
    ["A", "t2", "a", "Norte y oeste (esquina frente)", false],
    ["B", "t4", "bce", "Norte, este y sur (esquina)", false],
    ["C", "t3", "d", "Sur y oeste (esquina contrafrente)", false],
  ],
  p57: [
    ["A", "t5", "semiOeste", "Oeste, norte y sur (semipiso)", false],
    ["B", "t5", "semiEste", "Este, norte y sur (semipiso)", true],
  ],
};

/** Cocheras de 2,5 × 5 m: C1 a C7 contra el fondo, C8 a C14 hacia Av. Colón. */
export const COCHERAS: { codigo: string; r: Rect }[] = Array.from({ length: 14 }, (_, i) => {
  const x = (i % 7) * 2.5;
  const y = i < 7 ? 0 : 10;
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
    espejada: false,
  })),
  { codigo: "Local 1", piso: 0, tipo: "local", categoria: "local", operacion: "alquiler", forma: F.local1, orientacion: "Norte y este (esquina)", total: 112, cubierta: 112, espejada: false },
  { codigo: "Local 2", piso: 0, tipo: "local", categoria: "local", operacion: "alquiler", forma: F.local2, orientacion: "Norte y oeste", total: 112, cubierta: 112, espejada: true },
  ...PISOS.filter((p) => p.planta === "p12" || p.planta === "p34" || p.planta === "p57").flatMap((p) =>
    PLANTAS_TIPO[p.planta as "p12" | "p34" | "p57"].map(([letra, tipo, forma, orientacion, espejada]) => {
      const t = tipologia(tipo);
      return {
        codigo: `${p.numero}${letra}`,
        piso: p.numero,
        tipo,
        categoria: "departamento" as const,
        operacion: "venta" as const,
        forma: F[forma],
        orientacion,
        total: t.total,
        cubierta: t.cubierta,
        espejada,
      };
    }),
  ),
];

/** Estados mezclados: más vendidas arriba y en las esquinas; el resto disponibles. */
export const ESTADOS: Record<string, "reservada" | "vendida" | "alquilada"> = {
  "7B": "vendida",
  "6B": "vendida",
  "5A": "vendida",
  "4B": "vendida",
  "3A": "vendida",
  "2C": "vendida",
  "1E": "vendida",
  "7A": "reservada",
  "3C": "reservada",
  "2B": "reservada",
  "1D": "reservada",
  C1: "vendida",
  C2: "vendida",
  C9: "vendida",
  C5: "reservada",
  C12: "reservada",
  "Local 2": "alquilada",
};
/** Precio "a consultar". */
export const CONSULTAR = new Set(["6A", "5B", "Local 1", "Local 2"]);

/** USD por m² total: cada piso un 2,5 % más caro; esquinas grandes y semipisos un 6 % más. */
export function precioUnidad(u: UnidadDef) {
  if (u.categoria === "cochera") return 18000 + (Number(u.codigo.slice(1)) > 7 ? 1500 : 0);
  if (u.categoria === "local") return null;
  const base = 1850 * u.total * (1 + 0.025 * (u.piso - 1));
  const extra = u.tipo === "t4" || u.tipo === "t5" ? 1.06 : u.tipo === "t3" ? 0.95 : u.tipo === "t1" ? 1.08 : 1;
  return Math.round((base * extra) / 500) * 500;
}

export type EspacioDef = { slug: string; nombre: string; piso: number; punto: Punto; descripcion: string; imagenes: { nombre: string; pano: string; yaw: number }[] };

/** Espacios comunes con un punto sobre su planta (en metros). */
export const ESPACIOS: EspacioDef[] = [
  {
    slug: "lobby",
    nombre: "Lobby",
    piso: 0,
    punto: [10, 11.6],
    descripcion: "50 m² sobre Av. Colón, con doble altura y control de ingreso.",
    imagenes: [
      { nombre: "Lobby", pano: "entrance_hall", yaw: 0 },
      { nombre: "Hall de ascensores", pano: "newman_lobby", yaw: 90 },
    ],
  },
  {
    slug: "sum",
    nombre: "SUM con parrilla",
    piso: 8,
    punto: [5.9, 11.6],
    descripcion: "81 m² con parrilla y vista a la ciudad.",
    imagenes: [
      { nombre: "SUM", pano: "warm_restaurant", yaw: 0 },
      { nombre: "Parrilla", pano: "wooden_lounge", yaw: 180 },
    ],
  },
  {
    slug: "gimnasio",
    nombre: "Gimnasio",
    piso: 8,
    punto: [3.4, 4.1],
    descripcion: "56 m² equipados, con ventanales a dos frentes.",
    imagenes: [
      { nombre: "Gimnasio", pano: "gym_01", yaw: 0 },
      { nombre: "Sala de entrenamiento", pano: "crossfit_gym", yaw: 90 },
    ],
  },
  {
    slug: "pileta",
    nombre: "Pileta y solárium",
    piso: 8,
    punto: [16.6, 10.2],
    descripcion: "Terraza en la esquina con pileta descubierta, solárium y deck.",
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
  descripcion: "Torre de perímetro libre en esquina: 22 departamentos de monoambiente a semipisos de 3 dormitorios, amenities en el último piso, locales comerciales y cocheras.",
  vista1: "Av. Colón",
  vista2: "Rivadavia",
  sobreTitulo: "Somos Desarrollos Demo",
  sobreTexto:
    "Proyectamos, construimos y vendemos nuestros edificios con el mismo equipo, de la primera línea del plano a la entrega de llaves. Mirador es una torre libre en sus cuatro lados: cada departamento tiene esquina o semipiso, y el último piso es de todos.",
  entrega: "Diciembre de 2028",
  amenities: ["SUM con parrilla", "Gimnasio", "Pileta y solárium", "Vestuarios"],
};
