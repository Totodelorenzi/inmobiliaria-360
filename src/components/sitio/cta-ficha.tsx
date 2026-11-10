"use client";

import { CalendarCheck, Rotate3d } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonStyles } from "@/components/ui/button";
import { etapaRecorrido, leerAvance, suscribirAvance } from "@/lib/tracking/avance";
import type { Enums } from "@/types/database";
import { BotonWhatsapp } from "./boton-whatsapp";
import { PedirVisita } from "./pedir-visita";

export type WhatsappFicha = { numero: string; mensaje: string; mensajeVisita: string; mensajeRecorrido: string; mensajeVisitaRecorrido: string };

type Props = {
  propertyId: string;
  slug: string;
  titulo: string;
  operacion: Enums<"operacion">;
  /** Hay tour y el switch del 360 está activo. */
  tour: boolean;
  /** Vendida o alquilada: ya no se pide visita, se consulta por parecidas. */
  cerrada: boolean;
  whatsapp: WhatsappFicha | null;
  donde: "panel" | "barra";
};

/** Etapa del recorrido en este navegador ("sin_empezar" en el servidor y antes de hidratar). */
function useEtapa(propertyId: string) {
  const vistas = useSyncExternalStore(
    suscribirAvance,
    () => JSON.stringify(leerAvance(propertyId)),
    () => "null",
  );
  return etapaRecorrido(JSON.parse(vistas));
}

/**
 * Llamados a la acción de la ficha. El contacto nunca se bloquea: lo que cambia con el recorrido es
 * cuál es el primario (sin tour: coordinar visita; tour sin hacer: hacer el recorrido; tour
 * completo: coordinar visita, y WhatsApp avisa que ya lo recorrió).
 */
export function CtaFicha({ propertyId, slug, titulo, operacion, tour, cerrada, whatsapp, donde }: Props) {
  const etapa = useEtapa(propertyId);
  const barra = donde === "barra";
  const tamano = barra ? "md" : "lg";
  const recorrer = tour && etapa !== "completo" && !cerrada;
  const ws = (accion: "info" | "visita") =>
    whatsapp && {
      numero: whatsapp.numero,
      mensaje: accion === "visita" ? whatsapp.mensajeVisita : whatsapp.mensaje,
      mensajeRecorrido: accion === "visita" ? whatsapp.mensajeVisitaRecorrido : whatsapp.mensajeRecorrido,
      propertyId,
      ubicacion: barra ? "barra" : "ficha",
    };

  if (cerrada) {
    const datos = ws("info");
    return datos ? (
      <BotonWhatsapp {...datos} size={tamano} fullWidth={!barra}>
        Consultar por parecidas
      </BotonWhatsapp>
    ) : null;
  }

  const coordinar = (
    <PedirVisita
      propertyId={propertyId}
      operacion={operacion}
      titulo={titulo}
      size={tamano}
      fullWidth={!barra}
      whatsapp={
        !barra &&
        whatsapp && (
          <BotonWhatsapp {...ws("visita")!} fullWidth>
            ¿Lo adelantamos por WhatsApp?
          </BotonWhatsapp>
        )
      }
    >
      <CalendarCheck className="size-5" aria-hidden /> Coordinar visita
    </PedirVisita>
  );

  const recorrido = (
    <Link
      href={`/propiedad/${slug}/tour?origen=boton`}
      className={buttonStyles({ variant: "accent", size: tamano, fullWidth: !barra, className: barra ? "" : "text-lg" })}
    >
      <Rotate3d className={barra ? "size-5" : "size-6"} aria-hidden /> Hacer el recorrido
    </Link>
  );

  if (barra) {
    return (
      <>
        {recorrer ? recorrido : coordinar}
        {whatsapp && <BotonWhatsapp {...ws("info")!} size="icon" aria-label="Consultar por WhatsApp" />}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recorrer ? recorrido : coordinar}
      {whatsapp && (
        <BotonWhatsapp {...ws("info")!} fullWidth>
          Consultar por WhatsApp
        </BotonWhatsapp>
      )}
      {recorrer && (
        <PedirVisita propertyId={propertyId} operacion={operacion} titulo={titulo} variant="ghost" size="md" className="self-center underline">
          Coordinar visita
        </PedirVisita>
      )}
    </div>
  );
}
