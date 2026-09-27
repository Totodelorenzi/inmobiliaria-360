/** Radio del círculo de zona aproximada, en metros. */
export const RADIO_ZONA_M = 500;

export type Ubicacion = { lat: number; lng: number; exacta: boolean };

/** Hash FNV-1a de 32 bits: estable para el mismo texto. */
function hash(texto: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Ubicación que se manda al navegador. Si la dirección exacta está oculta, el centro se
 * desplaza entre 120 y 350 m en una dirección fija por propiedad: siempre el mismo punto
 * (no se puede promediar recargando) y la propiedad queda dentro del círculo de 500 m.
 */
export function ubicacionPublica(
  id: string,
  lat: number | null,
  lng: number | null,
  mostrarExacta: boolean,
): Ubicacion | null {
  if (lat == null || lng == null) return null;
  if (mostrarExacta) return { lat, lng, exacta: true };

  const h = hash(id);
  const angulo = ((h % 360) * Math.PI) / 180;
  const distancia = 120 + ((h >>> 9) % 231);
  const dLat = (distancia * Math.cos(angulo)) / 111_320;
  const dLng = (distancia * Math.sin(angulo)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  // Redondeo a 4 decimales (~11 m): no filtra más precisión que la necesaria.
  const redondear = (n: number) => Math.round(n * 1e4) / 1e4;
  return { lat: redondear(lat + dLat), lng: redondear(lng + dLng), exacta: false };
}

/** Distancia en metros entre dos puntos (haversine). */
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
