import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RADIO_ZONA_M, type Ubicacion } from "@/lib/geo";

const PIN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="var(--brand)" stroke="#fff" stroke-width="1.5"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg>';

/** Crea el mapa (se carga solo cuando el bloque entra en pantalla). Devuelve la función de limpieza. */
export function crearMapa(el: HTMLElement, { lat, lng, exacta }: Ubicacion) {
  const brand = getComputedStyle(el).getPropertyValue("--brand").trim() || "#1f3a5f";
  const mapa = L.map(el, {
    center: [lat, lng],
    zoom: exacta ? 16 : 15,
    scrollWheelZoom: false,
    // En el celular, arrastrar con un dedo tiene que seguir scrolleando la página.
    dragging: !L.Browser.mobile,
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  if (exacta) {
    L.marker([lat, lng], {
      icon: L.divIcon({ html: PIN, className: "", iconSize: [36, 36], iconAnchor: [18, 34] }),
      keyboard: false,
      interactive: false,
    }).addTo(mapa);
  } else {
    L.circle([lat, lng], { radius: RADIO_ZONA_M, color: brand, weight: 2, fillColor: brand, fillOpacity: 0.15 }).addTo(mapa);
  }
  return () => mapa.remove();
}
