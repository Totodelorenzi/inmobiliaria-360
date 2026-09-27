"use client";

import { ChevronLeft, ChevronRight, House, Images, X } from "lucide-react";
import { useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";

type Foto = { id: string; url: string; thumb_url: string | null };

const srcSet = (f: Foto) => (f.thumb_url ? `${f.thumb_url} 800w, ${f.url} 2400w` : undefined);

/** Galería: 1 foto grande con swipe en el celular, 2 en pantallas grandes, y "Ver todas". */
export function Galeria({ fotos, titulo }: { fotos: Foto[]; titulo: string }) {
  const pistaRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-surface text-muted sm:aspect-[21/9]">
        <House className="size-16" aria-hidden />
        <span className="sr-only">Sin fotos</span>
      </div>
    );
  }

  const anchoFoto = () => (pistaRef.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
  const mover = (dir: 1 | -1) => pistaRef.current?.scrollBy({ left: dir * anchoFoto(), behavior: "smooth" });

  return (
    <div className="relative">
      <ul
        ref={pistaRef}
        onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / anchoFoto()))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:gap-1"
        aria-label={`Fotos de ${titulo}`}
      >
        {fotos.map((foto, i) => (
          <li key={foto.id} className="aspect-[4/3] w-full shrink-0 snap-start bg-surface md:w-[calc(50%-2px)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- tamaños generados al subir (800 y 2400 px) */}
            <img
              src={foto.url}
              srcSet={srcSet(foto)}
              sizes="(min-width: 768px) 50vw, 100vw"
              alt={`${titulo}, foto ${i + 1} de ${fotos.length}`}
              width={1600}
              height={1200}
              loading={i < 2 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding={i === 0 ? "sync" : "async"}
              className="size-full object-cover"
            />
          </li>
        ))}
      </ul>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => mover(-1)}
            disabled={actual === 0}
            aria-label="Foto anterior"
            className={buttonStyles({ variant: "outline", size: "icon", className: "absolute top-1/2 left-3 hidden -translate-y-1/2 shadow md:inline-flex" })}
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={actual >= fotos.length - 2}
            aria-label="Foto siguiente"
            className={buttonStyles({ variant: "outline", size: "icon", className: "absolute top-1/2 right-3 hidden -translate-y-1/2 shadow md:inline-flex" })}
          >
            <ChevronRight aria-hidden />
          </button>
          <p className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white md:hidden" aria-hidden>
            {actual + 1} / {fotos.length}
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className={buttonStyles({ variant: "outline", className: "absolute right-3 bottom-3 shadow" })}
          >
            <Images className="size-4" aria-hidden /> Ver todas las fotos ({fotos.length})
          </button>
        </>
      )}

      <dialog
        ref={dialogRef}
        aria-label={`Todas las fotos de ${titulo}`}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-black/80 px-4 py-2 backdrop-blur">
          <p className="font-semibold">{fotos.length} fotos</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar fotos"
            className={buttonStyles({ variant: "ghost", size: "icon", className: "text-white hover:bg-white/10" })}
          >
            <X aria-hidden />
          </button>
        </div>
        <ul className="mx-auto flex max-w-4xl flex-col gap-2 p-2">
          {fotos.map((foto, i) => (
            <li key={foto.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- tamaños generados al subir (800 y 2400 px) */}
              <img
                src={foto.url}
                srcSet={srcSet(foto)}
                sizes="(min-width: 896px) 896px, 100vw"
                alt={`${titulo}, foto ${i + 1} de ${fotos.length}`}
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg"
              />
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
