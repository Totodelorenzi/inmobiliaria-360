"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { registrar } from "@/lib/tracking/cliente";

/** Registra la vista de la ficha (una vez por montaje). */
export function RastreoVista({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    registrar({ tipo: "view_property", propertyId });
  }, [propertyId]);
  return null;
}

/** Compartir la propiedad (menú nativo del celular o copiar el link). */
export function BotonCompartir({ propertyId, titulo, url }: { propertyId: string; titulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartir() {
    registrar({ tipo: "share", propertyId });
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // la persona canceló el menú de compartir
    }
  }
  return (
    <button type="button" onClick={compartir} className={buttonStyles({ variant: "outline" })}>
      {copiado ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copiado ? "¡Link copiado!" : "Compartir"}
    </button>
  );
}
