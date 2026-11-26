"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { guardarPunto, guardarTextos, type EstadoTextos } from "@/lib/admin/acciones-proyecto";
import type { ProyectoAdmin } from "@/lib/admin/datos-proyecto";
import type { Punto } from "@/lib/edificio";
import { cn } from "@/lib/utils";
import { MostrarAviso, useAccion } from "./acciones-ui";
import { Aviso, Panel } from "./ui";

/** Puntos de los espacios comunes sobre la planta: un toque donde está cada uno. */
export function LienzoPuntos({ imagen, espacios }: { imagen: string; espacios: ProyectoAdmin["espacios"] }) {
  const [elegido, setElegido] = useState(espacios.find((e) => !e.punto)?.id ?? espacios[0]?.id ?? null);
  const { ejecutar, pendiente, aviso } = useAccion();
  const espacio = espacios.find((e) => e.id === elegido);
  if (!espacio) return <Aviso>No hay espacios comunes en este piso.</Aviso>;

  function alTocar(e: React.MouseEvent<HTMLDivElement>) {
    if (pendiente || !espacio) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (valor: number, total: number) => Math.min(100, Math.max(0, Math.round((valor / total) * 10000) / 100));
    const punto: Punto = [pct(e.clientX - r.left, r.width), pct(e.clientY - r.top, r.height)];
    ejecutar(() => guardarPunto(espacio.id, punto));
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Espacios">
        {espacios.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === espacio.id}
            onClick={() => setElegido(e.id)}
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-fg"
          >
            {e.nombre} {e.punto && <Check className="size-4" aria-label="marcado" />}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted">Tocá sobre la planta dónde está {espacio.nombre.toLowerCase()}: ahí aparece el botón que abre sus imágenes.</p>
      <MostrarAviso aviso={aviso} />
      <div className="relative mt-2 w-full cursor-crosshair overflow-hidden rounded-xl border border-border bg-black select-none" onClick={alTocar}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage */}
        <img src={imagen} alt="" className="block w-full" draggable={false} />
        {espacios.map((e) =>
          e.punto ? (
            <span
              key={e.id}
              className={cn(
                "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-2 py-0.5 text-xs font-bold shadow",
                e.id === espacio.id ? "bg-brand text-brand-fg" : "bg-black/70 text-white",
              )}
              style={{ left: `${e.punto[0]}%`, top: `${e.punto[1]}%` }}
            >
              {e.nombre}
            </span>
          ) : null,
        )}
      </div>
    </Panel>
  );
}

/** Textos de la landing: quiénes son (vista 1), datos del proyecto (vista 2) y la transición entre vistas. */
export function TextosProyecto({ proyecto }: { proyecto: ProyectoAdmin }) {
  const [estado, accion, guardando] = useActionState<EstadoTextos, FormData>(guardarTextos.bind(null, proyecto.id), { ok: false });
  return (
    <form action={accion} className="flex flex-col gap-5">
      <Panel titulo="Sobre la desarrolladora">
        <p className="mb-4 text-sm text-muted">Aparece en la primera vista de la fachada mientras el comprador scrollea: quiénes son y por qué hicieron este proyecto.</p>
        <div className="flex flex-col gap-4">
          <Field label="Título">{(a) => <Input {...a} name="sobre_titulo" defaultValue={proyecto.sobre_titulo ?? ""} maxLength={120} placeholder="Somos Desarrollos Demo" />}</Field>
          <Field label="Texto" hint="Hasta 600 caracteres: se lee de un vistazo mientras se scrollea.">
            {(a) => <Textarea {...a} name="sobre_texto" rows={5} maxLength={600} defaultValue={proyecto.sobre_texto ?? ""} />}
          </Field>
        </div>
      </Panel>
      <Panel titulo="Datos del proyecto">
        <p className="mb-4 text-sm text-muted">Aparecen en la segunda vista. Las unidades, las superficies y las cocheras se cuentan solas con lo cargado en “Unidades”.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dirección">{(a) => <Input {...a} name="direccion" defaultValue={proyecto.direccion ?? ""} maxLength={200} />}</Field>
          <Field label="Ciudad">{(a) => <Input {...a} name="ciudad" defaultValue={proyecto.ciudad ?? ""} maxLength={80} />}</Field>
          <Field label="Entrega" hint="Por ejemplo: Diciembre de 2028.">
            {(a) => <Input {...a} name="entrega" defaultValue={proyecto.entrega ?? ""} maxLength={80} />}
          </Field>
          <Field label="Amenities" hint="Uno por renglón.">
            {(a) => <Textarea {...a} name="amenities" rows={4} defaultValue={proyecto.amenities.join("\n")} />}
          </Field>
          <Field label="Calle de la vista 1">{(a) => <Input {...a} name="vista1_nombre" defaultValue={proyecto.vista1_nombre ?? ""} maxLength={60} />}</Field>
          <Field label="Calle de la vista 2">{(a) => <Input {...a} name="vista2_nombre" defaultValue={proyecto.vista2_nombre ?? ""} maxLength={60} />}</Field>
        </div>
        <div className="mt-4">
          <Field label="Descripción para compartir" hint="La muestran WhatsApp y Google al compartir el link.">
            {(a) => <Textarea {...a} name="descripcion" rows={3} maxLength={300} defaultValue={proyecto.descripcion ?? ""} />}
          </Field>
        </div>
      </Panel>
      <Panel titulo="Paso de la vista 1 a la 2">
        <Field
          label="Transición al scrollear"
          hint={proyecto.tieneSecuencia ? "El giro usa los cuadros del video que ya están cargados." : "Para el giro hay que cargar los cuadros de un video del edificio girando."}
        >
          {(a) => (
            <Select {...a} name="transicion" defaultValue={proyecto.transicion}>
              <option value="fundido">Fundido entre las dos imágenes</option>
              <option value="secuencia" disabled={!proyecto.tieneSecuencia}>
                Giro del edificio (cuadros de un video)
              </option>
            </Select>
          )}
        </Field>
      </Panel>
      {estado.error && <Aviso tono="error">{estado.error}</Aviso>}
      {estado.ok && estado.mensaje && <Aviso tono="ok">{estado.mensaje}</Aviso>}
      <Button type="submit" variant="brand" size="lg" loading={guardando}>
        Guardar textos
      </Button>
    </form>
  );
}
