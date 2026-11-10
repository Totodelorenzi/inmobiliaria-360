"use client";

import { DraftingCompass, Images, MapPin, Rotate3d } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Galeria } from "./galeria";

type Foto = { id: string; url: string; thumb_url: string | null; ambiente: string | null };

type Props = {
  fotos: Foto[];
  titulo: string;
  slug: string;
  propertyId: string;
  /** Cantidad de ambientes del tour; 0 o el 360 apagado: sin pestaña Recorrido. */
  ambientesTour: number;
  /** Nombre del primer ambiente del recorrido (para la portada). */
  primerAmbiente: string | null;
  planos: boolean;
  mapa: boolean;
};

const pestana = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition [&_svg]:size-4";

/**
 * Medios de la ficha en pestañas: solo las que existen. Con recorrido, su portada es la primera
 * vista (foto principal, "Hacer el recorrido" y cantidad de ambientes); el visor se descarga recién
 * al abrirlo, en su propia pantalla. Planos abre su visor y Mapa baja a la ubicación.
 */
export function MediosFicha({ fotos, titulo, slug, propertyId, ambientesTour, primerAmbiente, planos, mapa }: Props) {
  const conTour = ambientesTour > 0;
  const [vista, setVista] = useState<"recorrido" | "fotos">(conTour ? "recorrido" : "fotos");
  const portada = fotos[0];
  const hayPestanas = conTour || planos || mapa;

  return (
    <div className="flex flex-col gap-2">
      {vista === "recorrido" && conTour ? (
        <div id="medios-recorrido" role={hayPestanas ? "tabpanel" : undefined} className="relative aspect-[4/5] overflow-hidden bg-black sm:aspect-[21/9]">
          {portada && (
            // eslint-disable-next-line @next/next/no-img-element -- misma foto y srcset que la galería (ya precargada)
            <img
              src={portada.url}
              srcSet={portada.thumb_url ? `${portada.thumb_url} 800w, ${portada.url} 2400w` : undefined}
              sizes="(min-width: 768px) 50vw, 100vw"
              alt=""
              width={1600}
              height={1200}
              fetchPriority="high"
              decoding="sync"
              className="size-full object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 text-center text-white sm:justify-center">
            <p className="text-sm font-semibold">
              Recorrido 360° · {plural(ambientesTour, "ambiente")}
              {primerAmbiente && <span className="block font-normal opacity-90">Empieza en {primerAmbiente.toLowerCase()}</span>}
            </p>
            <Link
              href={`/propiedad/${slug}/tour?origen=portada`}
              className={buttonStyles({ variant: "accent", size: "lg", className: "text-lg" })}
            >
              <Rotate3d className="size-6" aria-hidden /> Hacer el recorrido
            </Link>
          </div>
        </div>
      ) : (
        <div id="medios-fotos" role={hayPestanas ? "tabpanel" : undefined}>
          <Galeria fotos={fotos} titulo={titulo} propertyId={propertyId} />
        </div>
      )}

      {hayPestanas && (
        <div className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-0">
          <div role="tablist" aria-label="Medios de la propiedad" className="flex gap-1">
          {conTour && (
            <button
              type="button"
              role="tab"
              aria-selected={vista === "recorrido"}
              aria-controls="medios-recorrido"
              onClick={() => setVista("recorrido")}
              className={cn(pestana, vista === "recorrido" ? "bg-fg text-bg" : "hover:bg-surface")}
            >
              <Rotate3d aria-hidden /> Recorrido
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={vista === "fotos"}
            aria-controls="medios-fotos"
            onClick={() => setVista("fotos")}
            className={cn(pestana, vista === "fotos" ? "bg-fg text-bg" : "hover:bg-surface")}
          >
            <Images aria-hidden /> Fotos ({fotos.length})
          </button>
          </div>
          {planos && (
            <Link href={`/propiedad/${slug}/planos`} className={cn(pestana, "hover:bg-surface")}>
              <DraftingCompass aria-hidden /> Planos
            </Link>
          )}
          {mapa && (
            <a href="#titulo-ubicacion" className={cn(pestana, "hover:bg-surface")}>
              <MapPin aria-hidden /> Mapa
            </a>
          )}
        </div>
      )}
    </div>
  );
}
