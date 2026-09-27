"use client";

import { Check, Copy, ExternalLink, EyeOff, Rocket, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import { Button, buttonStyles } from "@/components/ui/button";
import { cambiarEstado } from "@/lib/admin/acciones";
import type { RequisitoPublicacion } from "@/lib/admin/propiedad";
import { MostrarAviso, useAccion } from "./acciones-ui";
import { Panel } from "./ui";

type Props = {
  propertyId: string;
  publicada: boolean;
  url: string;
  titulo: string;
  requisitos: (RequisitoPublicacion & { paso: string })[];
};

export function PasoPublicar({ propertyId, publicada, url, titulo, requisitos }: Props) {
  const { ejecutar, pendiente, aviso } = useAccion();
  const [copiado, setCopiado] = useState(false);
  const faltanObligatorios = requisitos.some((r) => r.obligatorio && !r.ok);

  return (
    <div className="flex flex-col gap-5">
      <Panel titulo="Antes de publicar">
        <ul className="flex flex-col gap-2">
          {requisitos.map((r) => (
            <li key={r.texto} className="flex items-center gap-3">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full ${r.ok ? "bg-success-bg text-success" : r.obligatorio ? "bg-danger-bg text-danger" : "bg-surface text-muted"}`}
              >
                {r.ok ? <Check className="size-4" aria-label="Listo" /> : <X className="size-4" aria-label="Falta" />}
              </span>
              <span className="flex-1">
                {r.texto}
                {r.obligatorio && !r.ok && <strong className="text-danger"> (obligatorio)</strong>}
              </span>
              {!r.ok && (
                <Link href={`?paso=${r.paso}`} className="shrink-0 text-sm font-semibold text-brand-ink underline">
                  Completar
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo={publicada ? "Publicada" : "Borrador"}>
        <MostrarAviso aviso={aviso} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          {publicada ? (
            <>
              <a href={url} target="_blank" className={buttonStyles({ variant: "brand", size: "lg", fullWidth: true })}>
                <ExternalLink className="size-5" aria-hidden /> Ver en la web
              </a>
              <Button variant="outline" size="lg" fullWidth loading={pendiente} onClick={() => ejecutar(() => cambiarEstado(propertyId, { publicada: false }))}>
                <EyeOff className="size-5" aria-hidden /> Despublicar
              </Button>
            </>
          ) : (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              loading={pendiente}
              disabled={faltanObligatorios}
              onClick={() => ejecutar(() => cambiarEstado(propertyId, { publicada: true }))}
            >
              <Rocket className="size-6" aria-hidden /> Publicar
            </Button>
          )}
        </div>
        {!publicada && faltanObligatorios && <p className="mt-2 text-sm text-muted">Completá lo obligatorio para poder publicar. Mientras tanto queda guardada como borrador.</p>}
      </Panel>

      {publicada && (
        <Panel titulo="Compartir">
          <p className="mb-3 truncate rounded-xl bg-surface px-3 py-2 font-mono text-sm">{url}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              }}
            >
              {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copiado ? "¡Copiado!" : "Copiar link"}
            </Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "whatsapp" })}>
              <WhatsappIcon className="size-5" /> Compartir por WhatsApp
            </a>
          </div>
        </Panel>
      )}
    </div>
  );
}
