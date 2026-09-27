"use client";

import { ArrowDown, ArrowUp, Camera, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eliminarFoto, marcarPrincipal, registrarFoto, reordenar } from "@/lib/admin/acciones";
import type { Foto } from "@/lib/admin/datos";
import { procesarFoto } from "@/lib/admin/imagenes";
import { rutaNueva, subirArchivo } from "@/lib/admin/subida";
import { BotonConfirmar, MostrarAviso, useAccion } from "./acciones-ui";
import { ListaCola, useColaSubida } from "./cola-subida";
import { Panel } from "./ui";

type Props = { propertyId: string; agencyId: string; fotos: Foto[] };

export function PasoFotos({ propertyId, agencyId, fotos }: Props) {
  const router = useRouter();
  const elegirRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const { ejecutar, pendiente, aviso } = useAccion();

  const tarea = useCallback(
    async (archivo: File, progreso: (f: number, e?: "subiendo") => void) => {
      const foto = await procesarFoto(archivo);
      progreso(0, "subiendo");
      const base = rutaNueva(agencyId, propertyId, foto.extension);
      const url = await subirArchivo({ bucket: "fotos", ruta: base, archivo: foto.grande, alAvanzar: (f) => progreso(f * 0.9, "subiendo") });
      const thumb_url = await subirArchivo({ bucket: "fotos", ruta: base.replace(/\.\w+$/, "-800.jpg"), archivo: foto.mini });
      const r = await registrarFoto(propertyId, { url, thumb_url });
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    },
    [agencyId, propertyId, router],
  );
  const cola = useColaSubida(tarea);

  const mover = (indice: number, delta: -1 | 1) => {
    const ids = fotos.map((f) => f.id);
    [ids[indice], ids[indice + delta]] = [ids[indice + delta], ids[indice]];
    ejecutar(() => reordenar("property_photos", propertyId, ids));
  };

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) cola.agregar(e.target.files);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel titulo="Agregar fotos">
        <p className="mb-4 text-sm text-muted">
          Elegí varias a la vez. Se achican automáticamente para que la web cargue rápido (las fotos del iPhone también funcionan).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="accent" size="lg" fullWidth onClick={() => elegirRef.current?.click()}>
            <ImagePlus className="size-6" aria-hidden /> Elegir fotos
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={() => camaraRef.current?.click()}>
            <Camera className="size-6" aria-hidden /> Sacar una foto
          </Button>
        </div>
        <input ref={elegirRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={alElegir} />
        <input ref={camaraRef} type="file" accept="image/*" capture="environment" hidden onChange={alElegir} />
        <div className="mt-4">
          <ListaCola items={cola.items} reintentar={cola.reintentar} descartar={cola.descartar} />
        </div>
      </Panel>

      <Panel titulo={`Fotos cargadas (${fotos.length})`}>
        <MostrarAviso aviso={aviso} />
        {fotos.length === 0 ? (
          <p className="text-muted">Todavía no hay fotos. La primera que subas va a ser la principal (la de las tarjetas).</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy={pendiente}>
            {fotos.map((foto, i) => (
              <li key={foto.id} className="overflow-hidden rounded-xl border border-border bg-bg">
                <div className="relative aspect-[4/3] bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage */}
                  <img src={foto.thumb_url ?? foto.url} alt={`Foto ${i + 1}`} className="size-full object-cover" loading="lazy" />
                  {foto.es_principal && (
                    <Badge tone="accent" className="absolute top-2 left-2">
                      <Star aria-hidden /> Principal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-1">
                  <div className="flex">
                    <Button variant="ghost" size="icon" disabled={i === 0 || pendiente} onClick={() => mover(i, -1)} aria-label={`Mover foto ${i + 1} antes`}>
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={i === fotos.length - 1 || pendiente} onClick={() => mover(i, 1)} aria-label={`Mover foto ${i + 1} después`}>
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="flex">
                    {!foto.es_principal && (
                      <Button variant="ghost" size="icon" disabled={pendiente} onClick={() => ejecutar(() => marcarPrincipal(foto.id, propertyId))} aria-label={`Usar la foto ${i + 1} como principal`}>
                        <Star className="size-4" aria-hidden />
                      </Button>
                    )}
                    <BotonConfirmar
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar foto ${i + 1}`}
                      titulo="¿Eliminar esta foto?"
                      onConfirmar={() => ejecutar(() => eliminarFoto(foto.id, propertyId))}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden />
                    </BotonConfirmar>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
