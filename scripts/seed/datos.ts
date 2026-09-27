/**
 * Datos de ejemplo: una inmobiliaria y 9 propiedades (4 alquiler, 3 venta terminadas, 2 en pozo o
 * construcción). Precios de referencia 2026 en ARS y USD. Panorámicas CC0 de Poly Haven.
 */
import type { TablesInsert } from "@/types/database";

/** Id fijo de la inmobiliaria de ejemplo (el seed la crea si no hay AGENCY_ID). */
export const AGENCIA_DEMO_ID = "a9c0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0c11";

export const AGENCIA: TablesInsert<"agencies"> = {
  id: AGENCIA_DEMO_ID,
  nombre: "Horizonte Propiedades",
  color_primario: "#1f4e5f",
  whatsapp: "5491100000000",
  email: "hola@horizonte.example",
  telefono: "011 4000-0000",
  direccion: "Av. Cabildo 2000, CABA",
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
};

/** Vista de una panorámica usada como foto común (yaw/pitch/campo visual en grados). */
export type Vista = { pano: string; yaw: number; pitch?: number; hfov?: number };

export type EscenaDemo = { pano: string; nombre: string; yaw?: number; pitch?: number };

export type PropiedadDemo = Omit<TablesInsert<"properties">, "agency_id" | "slug"> & {
  fotos: (Vista | { svg: "fachada" })[];
  escenas?: EscenaDemo[];
  /** Hotspots entre escenas por índice: [desde, hacia, yaw, pitch]. */
  hotspots?: [number, number, number, number][];
  planos?: { svg: "unidad-2-amb" | "amenities"; nombre: string; puntos: { x: number; y: number; texto: string }[] }[];
};

const demo = { es_demo: true, publicada: true } as const;

export const PROPIEDADES: PropiedadDemo[] = [
  // ------------------------------------------------------------------ Alquiler
  {
    ...demo,
    titulo: "Luminoso 3 ambientes con balcón en Palermo",
    operacion: "alquiler",
    tipo: "departamento",
    precio: 1150000,
    moneda: "ARS",
    expensas: 185000,
    direccion: "Gorriti 4800",
    mostrar_direccion_exacta: false,
    barrio: "Palermo",
    ciudad: "CABA",
    lat: -34.5889,
    lng: -58.4306,
    ambientes: 3,
    dormitorios: 2,
    banos: 1,
    superficie_total: 72,
    superficie_cubierta: 65,
    amenities: ["Balcón", "Lavadero", "Aire acondicionado", "Ascensor"],
    destacada: true,
    descripcion:
      "Departamento de 3 ambientes al frente, muy luminoso, a dos cuadras de Plaza Serrano.\n\nLiving comedor con salida al balcón, cocina separada con lavadero, dos dormitorios con placard y baño completo. Pisos de madera, aire acondicionado frío/calor en living y dormitorio principal.\n\nEdificio con ascensor y encargado. Cerca de subte D, colectivos y toda la movida de Palermo Soho.",
    fotos: [
      { pano: "lythwood_lounge", yaw: 20 },
      { pano: "lythwood_lounge", yaw: 160 },
      { pano: "kiara_interior", yaw: 0 },
      { pano: "lythwood_room", yaw: 90 },
      { pano: "modern_bathroom", yaw: 0 },
    ],
    escenas: [
      { pano: "lythwood_lounge", nombre: "Living" },
      { pano: "kiara_interior", nombre: "Cocina" },
      { pano: "lythwood_room", nombre: "Dormitorio" },
      { pano: "modern_bathroom", nombre: "Baño" },
    ],
    hotspots: [
      [0, 1, 110, -8],
      [1, 0, -70, -8],
      [0, 2, -120, -8],
      [2, 0, 60, -8],
      [2, 3, -30, -8],
      [3, 2, 150, -8],
    ],
  },
  {
    ...demo,
    titulo: "Monoambiente a estrenar con amenities en Núñez",
    operacion: "alquiler",
    tipo: "departamento",
    precio: 540000,
    moneda: "ARS",
    expensas: 95000,
    direccion: "Av. Congreso 3200",
    mostrar_direccion_exacta: true,
    barrio: "Núñez",
    ciudad: "CABA",
    lat: -34.5462,
    lng: -58.4697,
    ambientes: 1,
    dormitorios: 0,
    banos: 1,
    superficie_total: 34,
    superficie_cubierta: 32,
    amenities: ["Pileta", "SUM", "Gimnasio", "Seguridad 24 h"],
    descripcion:
      "Monoambiente a estrenar en edificio con amenities completos: pileta, gimnasio y SUM. Cocina integrada con anafe eléctrico y horno, baño completo con ducha. Ideal primera vivienda o estudiante. A metros de la estación Núñez del tren Mitre.",
    fotos: [
      { pano: "small_empty_room_2", yaw: 0 },
      { pano: "small_empty_room_2", yaw: 180 },
      { pano: "small_empty_room_3", yaw: 45 },
    ],
  },
  {
    ...demo,
    titulo: "PH 2 ambientes con patio propio en Villa Crespo",
    operacion: "alquiler",
    tipo: "ph",
    precio: 790000,
    moneda: "ARS",
    expensas: null,
    direccion: "Loyola 900",
    mostrar_direccion_exacta: false,
    barrio: "Villa Crespo",
    ciudad: "CABA",
    lat: -34.5985,
    lng: -58.4402,
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    superficie_total: 55,
    superficie_cubierta: 44,
    amenities: ["Patio", "Parrilla", "Apto mascotas"],
    descripcion:
      "PH al fondo, sin expensas, con patio propio y parrilla. Living con estufa, dormitorio amplio con placard, cocina renovada. Apto mascotas. A 4 cuadras del subte B.",
    fotos: [
      { pano: "wooden_lounge", yaw: 0 },
      { pano: "wooden_lounge", yaw: 200 },
      { pano: "combination_room", yaw: 30 },
    ],
  },
  {
    ...demo,
    titulo: "Casa 4 ambientes con jardín en Olivos",
    operacion: "alquiler",
    tipo: "casa",
    precio: 2100000,
    moneda: "ARS",
    expensas: null,
    direccion: "Maipú 2500",
    mostrar_direccion_exacta: false,
    barrio: "Olivos",
    ciudad: "Vicente López",
    lat: -34.5087,
    lng: -58.4913,
    ambientes: 4,
    dormitorios: 3,
    banos: 2,
    superficie_total: 240,
    superficie_cubierta: 165,
    cochera: 1,
    amenities: ["Jardín", "Parrilla", "Lavadero"],
    descripcion:
      "Casa en dos plantas sobre lote propio, con jardín y parrilla. Planta baja: living comedor, cocina con comedor diario y toilette. Planta alta: tres dormitorios (uno en suite) y baño completo. Cochera cubierta. Barrio tranquilo, cerca del Paseo de la Costa.",
    fotos: [
      { pano: "small_empty_house", yaw: 0 },
      { pano: "pine_attic", yaw: 90 },
      { pano: "small_empty_house", yaw: 180 },
    ],
  },
  // ------------------------------------------------------------------ Venta terminadas
  {
    ...demo,
    titulo: "Casa con galería y jardín en Vicente López",
    operacion: "venta",
    tipo: "casa",
    precio: 385000,
    moneda: "USD",
    expensas: null,
    direccion: "Carlos Villate 1500",
    mostrar_direccion_exacta: false,
    barrio: "Vicente López",
    ciudad: "Vicente López",
    lat: -34.5268,
    lng: -58.4795,
    ambientes: 5,
    dormitorios: 3,
    banos: 3,
    superficie_total: 320,
    superficie_cubierta: 210,
    cochera: 2,
    apto_credito: true,
    amenities: ["Jardín", "Pileta", "Parrilla", "Calefacción"],
    destacada: true,
    descripcion:
      "Casa luminosa con galería semicubierta, jardín y pileta. Living comedor integrado con cocina, tres dormitorios (el principal en suite) y escritorio. Calefacción por radiadores. Cochera para dos autos. Apta crédito. Recorrela entera en 360° antes de visitarla.",
    fotos: [
      { pano: "glasshouse_interior", yaw: 0 },
      { pano: "glasshouse_interior", yaw: 120 },
      { pano: "veranda", yaw: 0 },
      { pano: "hotel_room", yaw: 0 },
      { pano: "bathroom", yaw: 0 },
    ],
    escenas: [
      { pano: "glasshouse_interior", nombre: "Living comedor" },
      { pano: "veranda", nombre: "Galería" },
      { pano: "hotel_room", nombre: "Dormitorio principal" },
      { pano: "bathroom", nombre: "Baño" },
    ],
    hotspots: [
      [0, 1, 90, -6],
      [1, 0, -90, -6],
      [0, 2, -100, -6],
      [2, 0, 80, -6],
      [2, 3, 170, -6],
      [3, 2, 10, -6],
    ],
  },
  {
    ...demo,
    titulo: "3 ambientes con cochera en Belgrano",
    operacion: "venta",
    tipo: "departamento",
    precio: 189000,
    moneda: "USD",
    expensas: 210000,
    direccion: "Juramento 2100",
    mostrar_direccion_exacta: true,
    barrio: "Belgrano",
    ciudad: "CABA",
    lat: -34.5614,
    lng: -58.4561,
    ambientes: 3,
    dormitorios: 2,
    banos: 2,
    superficie_total: 85,
    superficie_cubierta: 78,
    cochera: 1,
    apto_credito: true,
    amenities: ["Balcón", "Baulera", "Seguridad 24 h", "Ascensor"],
    descripcion:
      "Semipiso de 3 ambientes con balcón corrido, a metros de Av. Cabildo. Dos dormitorios con placard, dos baños, cocina con lavadero. Cochera fija y baulera. Edificio con seguridad 24 h. Apto crédito.",
    fotos: [
      { pano: "cayley_interior", yaw: 0 },
      { pano: "cayley_interior", yaw: 150 },
      { pano: "reading_room", yaw: 0 },
    ],
  },
  {
    ...demo,
    titulo: "2 ambientes reciclado con balcón en San Telmo",
    operacion: "venta",
    tipo: "departamento",
    precio: 98000,
    moneda: "USD",
    expensas: 95000,
    direccion: "Defensa 900",
    mostrar_direccion_exacta: false,
    barrio: "San Telmo",
    ciudad: "CABA",
    lat: -34.6181,
    lng: -58.3717,
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    superficie_total: 48,
    superficie_cubierta: 45,
    amenities: ["Balcón"],
    descripcion:
      "Departamento reciclado a nuevo en edificio de época: techos altos, pisos de pinotea y balcón francés a la calle. Cocina integrada y baño completo. A dos cuadras de Plaza Dorrego.",
    fotos: [
      { pano: "old_room", yaw: 0 },
      { pano: "entrance_hall", yaw: 0 },
      { pano: "old_room", yaw: 180 },
    ],
  },
  // ------------------------------------------------------------------ En pozo / en construcción
  {
    ...demo,
    titulo: "Alto Caballito: 2 ambientes en pozo con amenities",
    operacion: "venta",
    tipo: "departamento",
    estado_obra: "en_pozo",
    fecha_entrega: "2028-06-01",
    avance_obra_pct: 15,
    precio: 118000,
    moneda: "USD",
    expensas: null,
    acepta_financiacion: true,
    detalle_financiacion: "30% de anticipo y saldo en 36 cuotas en pesos ajustadas por índice CAC.",
    direccion: "Av. Pedro Goyena 1100",
    mostrar_direccion_exacta: false,
    barrio: "Caballito",
    ciudad: "CABA",
    lat: -34.6268,
    lng: -58.4461,
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    superficie_total: 52,
    superficie_cubierta: 46,
    amenities: ["Pileta", "SUM", "Solárium", "Parrilla", "Gimnasio"],
    descripcion:
      "Emprendimiento de 12 pisos en Caballito. Unidades de 2 ambientes con balcón aterrazado, cocina integrada y terminaciones de primera. Amenities en terraza: pileta, solárium, SUM con parrilla y gimnasio.\n\nMirá los planos navegables: tocá cada ambiente para ver sus medidas.",
    fotos: [{ svg: "fachada" }],
    planos: [
      {
        svg: "unidad-2-amb",
        nombre: "Unidad tipo 2 ambientes",
        puntos: [
          { x: 30, y: 38, texto: "Living comedor" },
          { x: 30, y: 78, texto: "Cocina integrada" },
          { x: 72, y: 36, texto: "Dormitorio" },
          { x: 72, y: 75, texto: "Baño" },
          { x: 50, y: 8, texto: "Balcón aterrazado" },
        ],
      },
      {
        svg: "amenities",
        nombre: "Terraza de amenities",
        puntos: [
          { x: 30, y: 40, texto: "Pileta" },
          { x: 75, y: 30, texto: "SUM con parrilla" },
          { x: 75, y: 72, texto: "Gimnasio" },
          { x: 30, y: 80, texto: "Solárium" },
        ],
      },
    ],
  },
  {
    ...demo,
    titulo: "Torre Parque Chas: 3 ambientes en construcción",
    operacion: "venta",
    tipo: "departamento",
    estado_obra: "en_construccion",
    fecha_entrega: "2027-09-01",
    avance_obra_pct: 60,
    precio: 176000,
    moneda: "USD",
    expensas: null,
    acepta_financiacion: true,
    detalle_financiacion: "40% de anticipo y saldo en 24 cuotas en dólares sin interés.",
    direccion: "Av. de los Incas 4600",
    mostrar_direccion_exacta: false,
    barrio: "Parque Chas",
    ciudad: "CABA",
    lat: -34.5842,
    lng: -58.4795,
    ambientes: 3,
    dormitorios: 2,
    banos: 2,
    superficie_total: 81,
    superficie_cubierta: 72,
    cochera: 1,
    amenities: ["Balcón", "SUM", "Parrilla", "Baulera"],
    descripcion:
      "Obra con 60% de avance y entrega estimada en septiembre de 2027. Unidades de 3 ambientes con dos baños, balcón y opción de cochera. Visitá la obra: las fotos muestran el avance real.",
    fotos: [
      { pano: "interior_construction", yaw: 0 },
      { pano: "unfinished_office", yaw: 0 },
      { pano: "interior_construction", yaw: 160 },
    ],
  },
];

/** Todas las panorámicas de Poly Haven que usa el seed. */
export function panoramasUsadas() {
  const ids = new Set<string>();
  for (const p of PROPIEDADES) {
    for (const f of p.fotos) if ("pano" in f) ids.add(f.pano);
    for (const e of p.escenas ?? []) ids.add(e.pano);
  }
  return [...ids];
}
