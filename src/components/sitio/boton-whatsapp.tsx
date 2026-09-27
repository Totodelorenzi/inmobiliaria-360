"use client";

import type { ReactNode } from "react";
import { buttonStyles, type ButtonSize } from "@/components/ui/button";
import { WhatsappIcon } from "./iconos-marca";

type Props = {
  href: string;
  agencyId: string;
  propertyId?: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

/** Link a WhatsApp que registra la consulta ('whatsapp_click') sin demorar la apertura. */
export function BotonWhatsapp({ href, agencyId, propertyId, size = "md", fullWidth, className, children, ...rest }: Props) {
  function registrar() {
    const cuerpo = JSON.stringify({ agencyId, propertyId: propertyId ?? null });
    try {
      if (!navigator.sendBeacon?.("/api/whatsapp", cuerpo)) {
        void fetch("/api/whatsapp", { method: "POST", body: cuerpo, keepalive: true });
      }
    } catch {
      // Registrar el click nunca debe impedir abrir WhatsApp.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={registrar}
      className={buttonStyles({ variant: "whatsapp", size, fullWidth, className })}
      {...rest}
    >
      <WhatsappIcon className="size-5" />
      {children}
    </a>
  );
}
