"use client";

import { LocateFixed, MapPin, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  lat: number | null;
  lng: number | null;
  /** Arma el texto a buscar con los campos de dirección actuales del formulario. */
  consulta: () => string;
  onCambio: (lat: number | null, lng: number | null) => void;
};

type Mapa = { mover(lat: number, lng: number): void; destruir(): void };

/** Ubica la propiedad buscando la dirección en OpenStreetMap y permite ajustar el punto a mano. */
export function SelectorUbicacion({ lat, lng, consulta, onCambio }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<Mapa | null>(null);
  const [punto, setPunto] = useState(lat != null && lng != null ? { lat, lng } : null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const cambioRef = useRef(onCambio);
  useEffect(() => {
    cambioRef.current = onCambio;
  }, [onCambio]);

  const hayPunto = punto !== null;
  useEffect(() => {
    if (!hayPunto || !ref.current || mapaRef.current) return;
    let cancelado = false;
    const inicio = punto;
    import("@/components/sitio/mapa-leaflet").then(({ crearMapaEditable }) => {
      if (cancelado || !ref.current) return;
      mapaRef.current = crearMapaEditable(ref.current, inicio, (la, ln) => {
        setPunto({ lat: la, lng: ln });
        cambioRef.current(la, ln);
      });
    });
    return () => {
      cancelado = true;
      mapaRef.current?.destruir();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el mapa se crea una vez; después se mueve con mover()
  }, [hayPunto]);

  async function buscar() {
    const q = consulta();
    if (!q.trim()) {
      setAviso("Primero completá la dirección, el barrio o la ciudad.");
      return;
    }
    setBuscando(true);
    setAviso(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "es" } });
      const [resultado] = (await res.json()) as { lat: string; lon: string }[];
      if (!resultado) {
        setAviso("No encontramos esa dirección. Probá escribirla distinto o tocá el mapa para marcarla a mano.");
        if (!punto) setPunto({ lat: -34.6037, lng: -58.3816 });
        return;
      }
      const nuevo = { lat: Number(resultado.lat), lng: Number(resultado.lon) };
      setPunto(nuevo);
      mapaRef.current?.mover(nuevo.lat, nuevo.lng);
      onCambio(nuevo.lat, nuevo.lng);
      setAviso("Revisá que el pin esté en el lugar correcto. Si no, arrastralo.");
    } catch {
      setAviso("No se pudo buscar la dirección (¿sin conexión?). Probá de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={buscar} loading={buscando}>
          {!buscando && <LocateFixed className="size-4" aria-hidden />} {punto ? "Buscar de nuevo" : "Ubicar en el mapa"}
        </Button>
        {punto && (
          <Button
            variant="ghost"
            onClick={() => {
              mapaRef.current?.destruir();
              mapaRef.current = null;
              setPunto(null);
              onCambio(null, null);
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Quitar del mapa
          </Button>
        )}
      </div>
      {aviso && (
        <p className="text-sm text-muted" role="status">
          {aviso}
        </p>
      )}
      {punto ? (
        <div ref={ref} className="isolate aspect-[4/3] w-full overflow-hidden rounded-xl border border-border sm:aspect-[16/9]" aria-label="Mapa: arrastrá el pin o tocá para mover la ubicación" />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <MapPin className="size-4" aria-hidden /> Sin ubicación en el mapa: en la ficha no se va a mostrar el mapa.
        </p>
      )}
    </div>
  );
}
