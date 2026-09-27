"use client";

import { ArrowDown, ArrowUp, FileUp, MapPin, Rotate3d, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { eliminarPlano, eliminarPunto, guardarPunto, registrarPlano, renombrarPlano, reordenar } from "@/lib/admin/acciones";
import type { Escena, Plano } from "@/lib/admin/datos";
import { pdfAImagenes, procesarPlano } from "@/lib/admin/imagenes";
import { rutaNueva, subirArchivo } from "@/lib/admin/subida";
import { cn } from "@/lib/utils";
import { BotonConfirmar, Hoja, MostrarAviso, useAccion } from "./acciones-ui";
import { ListaCola, useColaSubida } from "./cola-subida";
import { Panel } from "./ui";

type Props = { propertyId: string; agencyId: string; planos: Plano[]; escenas: Pick<Escena, "id" | "nombre_ambiente">[] };

const nombreBase = (archivo: string) => archivo.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 50) || "Plano";

export function PasoPlanos({ propertyId, agencyId, planos, escenas }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(planos[0]?.id ?? null);
  const { ejecutar, pendiente, aviso } = useAccion();
  const actual = planos.find((p) => p.id === seleccionado) ?? planos[0];

  const tarea = useCallback(
    async (archivo: File, progreso: (f: number, e?: "subiendo") => void) => {
      const esPdf = archivo.type === "application/pdf" || /\.pdf$/i.test(archivo.name);
      const paginas = esPdf ? await pdfAImagenes(archivo, (n, total) => progreso((n - 1) / total / 2)) : [await procesarPlano(archivo)];
      for (const [i, pagina] of paginas.entries()) {
        progreso(0.5 + (i / paginas.length) * 0.5, "subiendo");
        const base = rutaNueva(agencyId, propertyId, pagina.extension);
        const url = await subirArchivo({ bucket: "planos", ruta: base, archivo: pagina.grande });
        const thumb_url = await subirArchivo({ bucket: "planos", ruta: base.replace(/\.\w+$/, "-mini.jpg"), archivo: pagina.mini });
        const nombre = paginas.length > 1 ? `${nombreBase(archivo.name)} (pág. ${i + 1})` : nombreBase(archivo.name);
        const r = await registrarPlano(propertyId, { nombre, url, thumb_url, tipo_original: esPdf ? "pdf" : "imagen" });
        if (!r.ok) throw new Error(r.error);
      }
      router.refresh();
    },
    [agencyId, propertyId, router],
  );
  const cola = useColaSubida(tarea, { simultaneos: 1 });

  const mover = (indice: number, delta: -1 | 1) => {
    const ids = planos.map((p) => p.id);
    [ids[indice], ids[indice + delta]] = [ids[indice + delta], ids[indice]];
    ejecutar(() => reordenar("property_plans", propertyId, ids));
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel titulo="Subir planos">
        <p className="mb-4 text-sm text-muted">
          Imágenes (JPG, PNG) o PDF. Si el PDF tiene varias páginas, cada una queda como un plano. Ideal para propiedades en pozo o en construcción.
        </p>
        <Button variant="accent" size="lg" fullWidth onClick={() => inputRef.current?.click()}>
          <FileUp className="size-6" aria-hidden /> Elegir planos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,application/pdf,.pdf"
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

      {planos.length > 0 && (
        <Panel titulo={`Planos (${planos.length})`}>
          <MostrarAviso aviso={aviso} />
          <ul className="flex flex-col gap-2" aria-busy={pendiente}>
            {planos.map((plano, i) => (
              <li key={plano.id} className={cn("flex items-center gap-2 rounded-xl border p-2", plano.id === actual?.id ? "border-brand bg-surface" : "border-border")}>
                <button
                  type="button"
                  onClick={() => setSeleccionado(plano.id)}
                  className="size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-white"
                  aria-label={`Editar puntos de ${plano.nombre}`}
                  aria-pressed={plano.id === actual?.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage */}
                  <img src={plano.thumb_url ?? plano.url} alt="" className="size-full object-contain" loading="lazy" />
                </button>
                <Input
                  key={plano.nombre}
                  defaultValue={plano.nombre}
                  aria-label={`Nombre del plano ${i + 1}`}
                  maxLength={60}
                  onBlur={(e) => {
                    const valor = e.target.value.trim();
                    if (valor && valor !== plano.nombre) ejecutar(() => renombrarPlano(plano.id, propertyId, valor));
                  }}
                />
                <span className="hidden shrink-0 text-xs text-muted sm:block">{plano.puntos.length} puntos</span>
                <Button variant="ghost" size="icon" disabled={i === 0 || pendiente} onClick={() => mover(i, -1)} aria-label={`Subir ${plano.nombre}`}>
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" disabled={i === planos.length - 1 || pendiente} onClick={() => mover(i, 1)} aria-label={`Bajar ${plano.nombre}`}>
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <BotonConfirmar
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${plano.nombre}`}
                  titulo={`¿Eliminar “${plano.nombre}”?`}
                  descripcion="Se borran también sus puntos."
                  onConfirmar={() => ejecutar(() => eliminarPlano(plano.id, propertyId))}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden />
                </BotonConfirmar>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {actual && (
        <Panel titulo={`Puntos: ${actual.nombre}`}>
          <EditorPuntos key={actual.id} plano={actual} escenas={escenas} propertyId={propertyId} />
        </Panel>
      )}
    </div>
  );
}

type PuntoEditable = { id?: string; x_pct: number; y_pct: number; texto: string; scene_id: string | null };

function EditorPuntos({ plano, escenas, propertyId }: { plano: Plano; escenas: Props["escenas"]; propertyId: string }) {
  const [editando, setEditando] = useState<PuntoEditable | null>(null);
  const { ejecutar, pendiente, aviso } = useAccion();

  function alTocar(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const redondear = (n: number) => Math.round(n * 100) / 100;
    setEditando({ x_pct: redondear(((e.clientX - r.left) / r.width) * 100), y_pct: redondear(((e.clientY - r.top) / r.height) * 100), texto: "", scene_id: null });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Tocá el plano para marcar un ambiente. Si ese ambiente tiene foto 360°, vinculalo: en la web va a aparecer el botón “Ver en 360°”.
      </p>
      <MostrarAviso aviso={aviso} />
      <div className="relative w-full cursor-crosshair overflow-hidden rounded-xl border border-border bg-white" onClick={alTocar}>
        {/* eslint-disable-next-line @next/next/no-img-element -- plano de Storage */}
        <img src={plano.url} alt={`Plano ${plano.nombre}`} className="block w-full select-none" draggable={false} />
        {plano.puntos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setEditando({ ...p })}
            className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center"
            style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
            aria-label={`Editar el punto ${p.texto}`}
          >
            <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-brand text-xs font-bold text-brand-fg shadow-lg">
              {p.scene_id ? <Rotate3d className="size-4" aria-hidden /> : i + 1}
            </span>
          </button>
        ))}
      </div>
      {plano.puntos.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {plano.puntos.map((p) => (
            <li key={p.id} className="flex items-center gap-1 rounded-full bg-surface px-3 py-1">
              <MapPin className="size-4 text-brand-ink" aria-hidden /> {p.texto}
              {p.scene_id && <span className="text-muted"> · 360°</span>}
            </li>
          ))}
        </ul>
      )}

      <Hoja titulo={editando?.id ? "Editar punto" : "Nuevo punto"} abierta={editando !== null} onCerrar={() => setEditando(null)}>
        {editando && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar(() => guardarPunto(propertyId, { ...editando, plan_id: plano.id }), () => setEditando(null));
            }}
          >
            <Field label="Nombre del ambiente">
              {(a) => (
                <Input {...a} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} maxLength={60} placeholder="Cocina" required autoFocus />
              )}
            </Field>
            <Field label="Vista 360° (opcional)" hint={escenas.length === 0 ? "Esta propiedad todavía no tiene tour 360°." : undefined}>
              {(a) => (
                <Select {...a} value={editando.scene_id ?? ""} onChange={(e) => setEditando({ ...editando, scene_id: e.target.value || null })} disabled={escenas.length === 0}>
                  <option value="">Sin vista 360°</option>
                  {escenas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre_ambiente}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex gap-2">
              {editando.id && (
                <Button
                  variant="outline"
                  className="text-danger"
                  onClick={() => ejecutar(() => eliminarPunto(editando.id!, propertyId), () => setEditando(null))}
                  disabled={pendiente}
                >
                  <Trash2 className="size-4" aria-hidden /> Eliminar
                </Button>
              )}
              <Button type="submit" variant="brand" fullWidth loading={pendiente}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Hoja>
    </div>
  );
}
