"use client";

import { ArrowDown, ArrowUp, CircleHelp, Eye, ImagePlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { actualizarEscena, eliminarEscena, registrarEscena, reordenar } from "@/lib/admin/acciones";
import type { Escena } from "@/lib/admin/datos";
import { procesarPanoramica } from "@/lib/admin/imagenes";
import { rutaNueva, subirArchivo } from "@/lib/admin/subida";
import { cn } from "@/lib/utils";
import { BotonConfirmar, MostrarAviso, useAccion } from "./acciones-ui";
import { ListaCola, useColaSubida } from "./cola-subida";
import { EditorEscena } from "./editor-escena";
import { Panel } from "./ui";

/** "living_comedor.jpg" → "Living comedor"; nombres de cámara (IMG_1234) → "Ambiente N". */
export function nombreDesdeArchivo(archivo: string, numero: number) {
  const base = archivo.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base || /^(img|pxl|dsc|r\d|photo|pano|vid|dji|gs|insta)/i.test(base) || /^\d[\d\s]*$/.test(base)) return `Ambiente ${numero}`;
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 60);
}

type Props = { propertyId: string; agencyId: string; escenas: Escena[] };

export function PasoTour({ propertyId, agencyId, escenas }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const contador = useRef(escenas.length);
  const [seleccionada, setSeleccionada] = useState<string | null>(escenas[0]?.id ?? null);
  const { ejecutar, pendiente, aviso } = useAccion();
  const actual = escenas.find((e) => e.id === seleccionada) ?? escenas[0];

  const tarea = useCallback(
    async (archivo: File, progreso: (f: number, e?: "subiendo") => void) => {
      const pano = await procesarPanoramica(archivo);
      progreso(0, "subiendo");
      const base = rutaNueva(agencyId, propertyId, "jpg");
      const panorama_url = await subirArchivo({ bucket: "panoramas", ruta: base, archivo: pano.grande, alAvanzar: (f) => progreso(f * 0.95, "subiendo") });
      const thumb_url = await subirArchivo({ bucket: "panoramas", ruta: base.replace(/\.jpg$/, "-mini.jpg"), archivo: pano.mini });
      contador.current += 1;
      const r = await registrarEscena(propertyId, { nombre_ambiente: nombreDesdeArchivo(archivo.name, contador.current), panorama_url, thumb_url });
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    },
    [agencyId, propertyId, router],
  );
  const cola = useColaSubida(tarea, { simultaneos: 1 });

  const mover = (indice: number, delta: -1 | 1) => {
    const ids = escenas.map((e) => e.id);
    [ids[indice], ids[indice + delta]] = [ids[indice + delta], ids[indice]];
    ejecutar(() => reordenar("tour_scenes", propertyId, ids));
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel titulo="Fotos 360°: una por ambiente">
        <p className="mb-4 text-sm text-muted">
          Tienen que ser fotos 360° (el doble de anchas que de altas). Subilas en el orden del recorrido: la primera es la que se ve al entrar.{" "}
          <Link href="/admin/ayuda#fotos-360" className="inline-flex items-center gap-1 font-semibold text-brand-ink underline">
            <CircleHelp className="size-4" aria-hidden /> Cómo sacarlas
          </Link>
        </p>
        <Button variant="accent" size="lg" fullWidth onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-6" aria-hidden /> Agregar ambientes
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) cola.agregar(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mt-4">
          <ListaCola items={cola.items} reintentar={cola.reintentar} descartar={cola.descartar} />
        </div>
      </Panel>

      {escenas.length > 0 && (
        <Panel
          titulo={`Ambientes (${escenas.length})`}
          acciones={
            <Link href={`/admin/vista-previa/${propertyId}`} className={buttonStyles({ variant: "outline" })}>
              <Eye className="size-4" aria-hidden /> Previsualizar tour
            </Link>
          }
        >
          <MostrarAviso aviso={aviso} />
          <ul className="flex flex-col gap-2" aria-busy={pendiente}>
            {escenas.map((escena, i) => (
              <li
                key={escena.id}
                className={cn("flex items-center gap-2 rounded-xl border p-2", escena.id === actual?.id ? "border-brand bg-surface" : "border-border")}
              >
                <button
                  type="button"
                  onClick={() => setSeleccionada(escena.id)}
                  className="h-12 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-black"
                  aria-label={`Editar puntos de paso de ${escena.nombre_ambiente}`}
                  aria-pressed={escena.id === actual?.id}
                >
                  {escena.thumb_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage
                    <img src={escena.thumb_url} alt="" className="size-full object-cover" loading="lazy" />
                  )}
                </button>
                <Input
                  key={escena.nombre_ambiente}
                  defaultValue={escena.nombre_ambiente}
                  aria-label={`Nombre del ambiente ${i + 1}`}
                  maxLength={60}
                  onBlur={(e) => {
                    const valor = e.target.value.trim();
                    if (valor && valor !== escena.nombre_ambiente) ejecutar(() => actualizarEscena(escena.id, propertyId, { nombre_ambiente: valor }));
                  }}
                />
                <span className="hidden shrink-0 text-xs text-muted sm:block">{escena.hotspots.length} puntos</span>
                <Button variant="ghost" size="icon" disabled={i === 0 || pendiente} onClick={() => mover(i, -1)} aria-label={`Subir ${escena.nombre_ambiente}`}>
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" disabled={i === escenas.length - 1 || pendiente} onClick={() => mover(i, 1)} aria-label={`Bajar ${escena.nombre_ambiente}`}>
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <BotonConfirmar
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${escena.nombre_ambiente}`}
                  titulo={`¿Eliminar “${escena.nombre_ambiente}”?`}
                  descripcion="También se borran los puntos de paso que llevan a este ambiente."
                  onConfirmar={() => ejecutar(() => eliminarEscena(escena.id, propertyId))}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden />
                </BotonConfirmar>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {actual && (
        <Panel titulo={`Puntos de paso: ${actual.nombre_ambiente}`}>
          <EditorEscena key={actual.id} escena={actual} escenas={escenas} propertyId={propertyId} />
        </Panel>
      )}
    </div>
  );
}
