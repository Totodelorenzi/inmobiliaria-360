"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { buttonStyles, type ButtonSize } from "@/components/ui/button";
import { whatsappLink } from "@/lib/format";
import { codigoReferencia, registrar } from "@/lib/tracking/cliente";
import { WhatsappIcon } from "./iconos-marca";

type Props = {
  /** Número de la inmobiliaria (solo dígitos con código de país). */
  numero: string;
  mensaje: string;
  propertyId?: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

const conReferencia = (mensaje: string) => {
  const ref = codigoReferencia();
  return ref ? `${mensaje} (Ref. ${ref})` : mensaje;
};

/**
 * Link a WhatsApp. El mensaje lleva el código de referencia del visitante ("Ref. A7K2"):
 * al tocarlo se registra el click y el servidor crea el lead provisorio con ese código.
 */
export function BotonWhatsapp({ numero, mensaje, propertyId, size = "md", fullWidth, className, children, ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  // Con la cookie ya presente, el link queda armado (sirve también para copiar o mantener apretado).
  useEffect(() => {
    if (ref.current) ref.current.href = whatsappLink(numero, conReferencia(mensaje));
  }, [numero, mensaje]);

  return (
    <a
      ref={ref}
      href={whatsappLink(numero, mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.currentTarget.href = whatsappLink(numero, conReferencia(mensaje));
        registrar({ tipo: "whatsapp_click", ...(propertyId ? { propertyId } : {}) }, { inmediato: true });
      }}
      className={buttonStyles({ variant: "whatsapp", size, fullWidth, className })}
      {...rest}
    >
      <WhatsappIcon className="size-5" />
      {children}
    </a>
  );
}
