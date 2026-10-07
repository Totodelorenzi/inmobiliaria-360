"use client";

import { Copy, ExternalLink, EyeOff, House, MoreHorizontal, Pencil, Rocket, Star, StarOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { borrarDatosDeEjemplo, cambiarEstado, duplicarPropiedad, eliminarPropiedad } from "@/lib/admin/acciones";
import type { PropiedadListado } from "@/lib/admin/datos";
import { TITULO_BORRADOR } from "@/lib/admin/propiedad";
import { formatPrecio, OPERACION_LABEL, TIPO_LABEL } from "@/lib/format";
import { BotonConfirmar, Hoja, MostrarAviso, useAccion } from "./acciones-ui";

const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** Siempre montada (con `vacio` cuando no hay resultados): el aviso de "Propiedad eliminada." sobrevive al borrar la última. */
export function ListaPropiedades({ propiedades, vacio }: { propiedades: PropiedadListado[]; vacio: ReactNode }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  const [menu, setMenu] = useState<PropiedadListado | null>(null);

  return (
    <div className="flex flex-col gap-3" aria-busy={pendiente}>
      <MostrarAviso aviso={aviso} />
      {propiedades.length === 0 && vacio}
      <ul className="flex flex-col gap-3">
        {propiedades.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-(--radius-card) border border-border bg-bg p-3">
            <Link href={`/admin/propiedades/${p.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24" tabIndex={-1} aria-hidden>
              {p.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage
                <img src={p.foto} alt="" className="size-full object-cover" loading="lazy" />
              ) : (
                <House className="m-auto mt-6 size-8 text-muted" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap gap-1.5">
                {p.publicada ? <Badge tone="success">Publicada</Badge> : <Badge tone="warning">Borrador</Badge>}
                {p.destacada && (
                  <Badge tone="accent">
                    <Star aria-hidden /> Destacada
                  </Badge>
                )}
                {p.es_demo && <Badge>Ejemplo</Badge>}
              </div>
              <Link href={`/admin/propiedades/${p.id}`} className="truncate font-semibold hover:underline">
                {p.titulo === TITULO_BORRADOR ? <em className="text-muted">Sin título</em> : p.titulo}
              </Link>
              <p className="truncate text-sm text-muted">
                {OPERACION_LABEL[p.operacion]} · {TIPO_LABEL[p.tipo]} · {formatPrecio(p.precio, p.moneda, p.operacion)}
                {p.barrio && ` · ${p.barrio}`}
              </p>
              <p className="text-xs text-muted">
                {p.escenas > 0 ? `${p.escenas} ambientes 360°` : "Sin tour"} · {p.planos > 0 ? `${p.planos} planos` : "sin planos"} · editada el{" "}
                {fecha.format(new Date(p.updated_at))}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
              <Link href={`/admin/propiedades/${p.id}`} className={buttonStyles({ variant: "outline", size: "icon" })} aria-label={`Editar ${p.titulo}`}>
                <Pencil className="size-5" aria-hidden />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMenu(p)} aria-label={`Más acciones para ${p.titulo}`} aria-haspopup="dialog">
                <MoreHorizontal className="size-5" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Hoja titulo={menu?.titulo ?? ""} abierta={menu !== null} onCerrar={() => setMenu(null)}>
        {menu && (
          <div className="flex flex-col gap-1">
            {menu.publicada && (
              <a href={`/propiedad/${menu.slug}`} target="_blank" className={opcion}>
                <ExternalLink aria-hidden /> Ver en la web
              </a>
            )}
            <button
              type="button"
              className={opcion}
              onClick={() => ejecutar(() => cambiarEstado(menu.id, { publicada: !menu.publicada }), () => setMenu(null))}
            >
              {menu.publicada ? <EyeOff aria-hidden /> : <Rocket aria-hidden />} {menu.publicada ? "Despublicar" : "Publicar"}
            </button>
            <button
              type="button"
              className={opcion}
              onClick={() => ejecutar(() => cambiarEstado(menu.id, { destacada: !menu.destacada }), () => setMenu(null))}
            >
              {menu.destacada ? <StarOff aria-hidden /> : <Star aria-hidden />} {menu.destacada ? "Quitar de destacadas" : "Destacar"}
            </button>
            <form action={duplicarPropiedad.bind(null, menu.id)}>
              <button type="submit" className={opcion}>
                <Copy aria-hidden /> Duplicar
              </button>
            </form>
            <BotonConfirmar
              variant="ghost"
              className={`${opcion} justify-start text-danger`}
              titulo="¿Eliminar esta propiedad?"
              descripcion={
                <>
                  Se borran <strong>{menu.titulo}</strong>, sus fotos, el tour y los planos. No se puede deshacer.
                </>
              }
              onConfirmar={() => ejecutar(() => eliminarPropiedad(menu.id), () => setMenu(null))}
            >
              <Trash2 aria-hidden /> Eliminar
            </BotonConfirmar>
          </div>
        )}
      </Hoja>
    </div>
  );
}

const opcion =
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-surface [&_svg]:size-5";

export function BorrarDemo({ cantidad }: { cantidad: number }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  return (
    <div className="flex flex-col gap-3">
      <MostrarAviso aviso={aviso} />
      <BotonConfirmar
        variant="danger"
        disabled={pendiente}
        titulo="¿Borrar los datos de ejemplo?"
        descripcion={`Se eliminan las ${cantidad} propiedades de ejemplo con sus fotos, tours y planos. Tus propiedades no se tocan.`}
        confirmar="Borrar datos de ejemplo"
        onConfirmar={() => ejecutar(borrarDatosDeEjemplo)}
      >
        <Trash2 className="size-4" aria-hidden /> {pendiente ? "Borrando…" : "Borrar datos de ejemplo"}
      </BotonConfirmar>
    </div>
  );
}
