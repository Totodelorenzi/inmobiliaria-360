"use client";

import { ChevronDown, ChevronUp, Images, Plus } from "lucide-react";
import { AnimatePresence, m, type Transition } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EspacioProyecto, PisoProyecto, Proyecto, TipologiaProyecto, UnidadProyecto } from "@/lib/data/proyecto";
import {
  cajaDe,
  centroide,
  CATEGORIA_LABEL,
  detallePiso,
  ESTADO_UNIDAD_COLOR,
  ESTADO_UNIDAD_LABEL,
  estadosPara,
  metrosUnidad,
  nombrePiso,
  nombreUnidad,
  precioUnidad,
  puntosSvg,
  recorteCss,
  type Caja,
  type Punto,
} from "@/lib/edificio";
import { formatM2 } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listo, precargar, usePantalla, useMenosMovimiento, type Pantalla } from "./utiles";

/** Inclinación de la planta (grados) y distancia de la cámara (px) de la perspectiva CSS. */
const INCLINACION = 24;
const PERSPECTIVA = 1800;
const SALIDA: Transition = { duration: 0.85, ease: [0.22, 1, 0.36, 1] };

export type OrigenPiso = { rect: DOMRect | null; modo: "fachada" | "vecino"; direccion?: 1 | -1 };

type Props = {
  proyecto: Proyecto;
  piso: PisoProyecto;
  unidad: UnidadProyecto | null;
  tipologia: TipologiaProyecto | null;
  /** De dónde viene la animación de entrada (la franja de la fachada o el piso vecino). */
  origen: OrigenPiso;
  onUnidad: (u: UnidadProyecto) => void;
  onEspacio: (e: EspacioProyecto) => void;
  onImagenes: () => void;
  onConsultar: (u: UnidadProyecto) => void;
  onVecino: (numero: number) => void;
};

type Lugar = { w: number; h: number; cx: number; cy: number };

/**
 * Dónde va la planta: lo que importa (las unidades y los espacios, con un margen) lo más grande
 * posible debajo de la barra, contando lo que achica la inclinación. Los bordes de la imagen pueden
 * quedar afuera de la pantalla (se funden con el fondo).
 */
function lugarPlanta(p: Pantalla, imagen: { ancho: number; alto: number }, foco: Caja | null): Lugar {
  const movil = p.ancho < 768;
  // En el celular, el nombre del piso va arriba y los pisos vecinos abajo.
  const arriba = movil ? 156 : 76;
  const abajo = movil ? 80 : 104;
  const lados = movil ? 8 : 56;
  const maxW = Math.min(p.ancho - lados * 2, 1240);
  const maxH = ((p.alto - arriba - abajo) / Math.cos((INCLINACION * Math.PI) / 180)) * 0.96;
  const prop = imagen.ancho / imagen.alto;
  const f = foco ?? { x: 0, y: 0, ancho: 100, alto: 100 };
  // Tamaño de la imagen para que el foco entre en el área libre.
  const escala = Math.min(maxW / ((f.ancho / 100) * prop), maxH / (f.alto / 100));
  const h = escala;
  const w = h * prop;
  const cx = p.ancho / 2 - ((f.x + f.ancho / 2) / 100 - 0.5) * w;
  const cy = arriba + (p.alto - arriba - abajo) / 2 - ((f.y + f.alto / 2) / 100 - 0.5) * h;
  return { w, h, cx, cy };
}

/** Lo que importa de una planta: todas sus zonas y puntos, con margen. */
function focoPlanta(zonas: (Punto[] | null)[], puntos: (Punto | null)[]): Caja | null {
  // Un piso sin unidades (amenities) se muestra entero: sus puntos solos darían un recorte muy cerrado.
  if (!zonas.some(Boolean)) return null;
  const todos = [...zonas.flatMap((z) => z ?? []), ...puntos.filter((x): x is Punto => x !== null)];
  const c = cajaDe(todos);
  const m = 4;
  // Simétrico respecto del centro de la imagen (las plantas se dibujan centradas): si las zonas
  // están de un lado (las cocheras), el resto de la planta (rampa, núcleo) no queda afuera.
  const dx = Math.max(50 - (c.x - m), c.x + c.ancho + m - 50);
  const dy = Math.max(50 - (c.y - m), c.y + c.alto + m - 50);
  const x = Math.max(0, 50 - dx);
  const y = Math.max(0, 50 - dy);
  return { x, y, ancho: Math.min(100, 50 + dx) - x, alto: Math.min(100, 50 + dy) - y };
}

/** Pose de la planta para que la unidad quede centrada, plana y grande (el resto sale de cuadro). */
function poseFoco(p: Pantalla, l: Lugar, caja: Caja) {
  const movil = p.ancho < 900;
  const areaW = movil ? p.ancho - 32 : Math.min(p.ancho - 2 * 330, 940);
  const areaH = movil ? Math.max(180, Math.min(p.alto * 0.46, p.alto - 380)) : p.alto - 76 - 88;
  const cx = p.ancho / 2;
  const cy = movil ? 76 + areaH / 2 + 4 : 76 + (p.alto - 76 - 32) / 2;
  const bw = (caja.ancho / 100) * l.w;
  const bh = (caja.alto / 100) * l.h;
  const s = Math.min(areaW / bw, areaH / bh, 3.2);
  const ox = ((caja.x + caja.ancho / 2) / 100) * l.w - l.w / 2;
  const oy = ((caja.y + caja.alto / 2) / 100) * l.h - l.h / 2;
  return {
    pose: { x: cx - l.cx - s * ox, y: cy - l.cy - s * oy, scale: s, rotateX: 0 },
    destino: { x: cx - (bw * s) / 2, y: cy - (bh * s) / 2, w: bw * s, h: bh * s },
    movil,
  };
}

export function CapaPiso({ proyecto, piso, unidad, tipologia, origen, onUnidad, onEspacio, onImagenes, onConsultar, onVecino }: Props) {
  const pantalla = usePantalla();
  const menos = useMenosMovimiento();
  const planta = piso.planta;
  const unidades = useMemo(() => proyecto.unidades.filter((u) => u.floor_id === piso.id), [proyecto.unidades, piso.id]);
  const espacios = useMemo(() => proyecto.espacios.filter((e) => e.floor_id === piso.id), [proyecto.espacios, piso.id]);
  const [luz, setLuz] = useState<{ id: string; dedo: boolean } | null>(null);
  const iluminada = luz?.id ?? null;
  const dedo = useRef(false);
  // Unidad que ya recibió el primer toque (el foco y el mouse también la iluminan).
  const tocada = useRef<string | null>(null);

  // El paso siguiente se baja mientras se mira la planta: las maquetas y el primer render de cada unidad.
  useEffect(() => {
    for (const u of unidades) {
      const t = proyecto.tipologias.find((x) => x.id === u.unit_type_id);
      void precargar(t?.maqueta?.url);
    }
  }, [unidades, proyecto.tipologias]);

  if (!listo(pantalla) || !planta) return null;
  const movil = pantalla.ancho < 768;
  const l = lugarPlanta(
    pantalla,
    planta,
    focoPlanta(
      unidades.map((u) => u.poligono),
      espacios.map((e) => e.punto),
    ),
  );
  const caja = unidad?.poligono ? cajaDe(unidad.poligono) : null;
  const foco = caja ? poseFoco(pantalla, l, caja) : null;
  const plana = { x: 0, y: 0, scale: 1, rotateX: INCLINACION, opacity: 1 };

  /** De la franja del piso en la fachada a la planta (y al revés al volver). */
  const desde = (o: OrigenPiso) => {
    if (menos) return { opacity: 0, x: 0, y: 0, scale: 1, rotateX: INCLINACION };
    if (o.modo === "vecino") return { opacity: 0, x: 0, y: (o.direccion ?? 1) * -l.h * 0.35, scale: 0.94, rotateX: INCLINACION };
    if (!o.rect) return { opacity: 0, x: 0, y: l.h * 0.18, scale: 0.92, rotateX: INCLINACION + 14 };
    return {
      opacity: 0,
      x: o.rect.left + o.rect.width / 2 - l.cx,
      y: o.rect.top + o.rect.height / 2 - l.cy,
      scale: Math.max(0.05, o.rect.width / l.w),
      rotateX: 82,
    };
  };
  const variantes = {
    oculta: (o: OrigenPiso) => ({ ...desde(o), transition: { ...SALIDA, opacity: { duration: 0.35, delay: o.modo === "fachada" ? 0.45 : 0 } } }),
    plana: { ...plana, transition: { ...SALIDA, opacity: { duration: 0.3 } } },
    foco: foco ? { ...foco.pose, opacity: 1, transition: { ...SALIDA, duration: 0.8, delay: 0.18 } } : plana,
  };

  const conMaqueta = Boolean(unidad && tipologia?.maqueta);
  const vecinos = proyecto.pisos.filter((x) => x.planta);
  const i = vecinos.findIndex((x) => x.id === piso.id);
  const arriba = i > 0 ? vecinos[i - 1] : null;
  const abajo = i >= 0 && i < vecinos.length - 1 ? vecinos[i + 1] : null;

  function tocar(u: UnidadProyecto) {
    if (dedo.current && tocada.current !== u.id) {
      tocada.current = u.id;
      setLuz({ id: u.id, dedo: true });
      return;
    }
    tocada.current = null;
    setLuz(null);
    onUnidad(u);
  }

  const iluminadaU = unidades.find((u) => u.id === iluminada);
  return (
    <m.div className="fixed inset-0 z-20 overflow-hidden" initial="oculta" animate={unidad ? "foco" : "plana"} exit="oculta" custom={origen}>
      {/* Fondo liso: el mismo de la imagen de la planta, así se funden */}
      <m.div className="absolute inset-0 bg-bg" variants={{ oculta: { opacity: 0, transition: { duration: 0.5, delay: 0.3 } }, plana: { opacity: 1, transition: { duration: 0.45 } }, foco: { opacity: 1 } }} />

      <m.div
        className="absolute"
        style={{ left: l.cx - l.w / 2, top: l.cy - l.h / 2, width: l.w, height: l.h, transformPerspective: PERSPECTIVA, willChange: "transform" }}
        variants={variantes}
        custom={origen}
      >
        <m.img
          src={planta.url}
          width={planta.ancho}
          height={planta.alto}
          alt={`Planta del ${nombrePiso(piso.numero).toLowerCase()}`}
          draggable={false}
          className="absolute inset-0 size-full select-none"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 3%, #000 97%, transparent), linear-gradient(to bottom, transparent, #000 3%, #000 97%, transparent)",
            WebkitMaskComposite: "source-in",
            maskImage: "linear-gradient(to right, transparent, #000 3%, #000 97%, transparent), linear-gradient(to bottom, transparent, #000 3%, #000 97%, transparent)",
            maskComposite: "intersect",
          }}
          animate={{ opacity: unidad ? 0.1 : 1 }}
          transition={{ duration: 0.35, delay: unidad ? 0 : 0.35 }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" role="group" aria-label={`Unidades del ${nombrePiso(piso.numero).toLowerCase()}`} style={{ pointerEvents: unidad ? "none" : "auto" }}>
          {unidades.map((u) =>
            u.poligono ? (
              <polygon
                key={u.id}
                points={puntosSvg(u.poligono)}
                vectorEffect="non-scaling-stroke"
                role="link"
                tabIndex={unidad ? -1 : 0}
                aria-label={`${nombreUnidad(u)}, ${ESTADO_UNIDAD_LABEL[u.estado].toLowerCase()}`}
                style={{ fill: ESTADO_UNIDAD_COLOR[u.estado], stroke: ESTADO_UNIDAD_COLOR[u.estado], opacity: unidad ? 0 : iluminada === u.id ? 0.62 : 0.32 }}
                className="cursor-pointer stroke-2 outline-none transition-opacity duration-200 focus-visible:opacity-70"
                onPointerDown={(e) => (dedo.current = e.pointerType !== "mouse")}
                onPointerEnter={(e) => e.pointerType === "mouse" && setLuz({ id: u.id, dedo: false })}
                onPointerLeave={(e) => e.pointerType === "mouse" && setLuz((x) => (x?.id === u.id ? null : x))}
                onFocus={() => setLuz({ id: u.id, dedo: false })}
                onBlur={() => setLuz((x) => (x?.id === u.id ? null : x))}
                onClick={() => tocar(u)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onUnidad(u);
                  }
                }}
              />
            ) : null,
          )}
        </svg>

        {/* La unidad elegida: se recorta de la planta y se eleva */}
        <AnimatePresence>
          {unidad?.poligono && (
            <m.div
              key={unidad.id}
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0, y: 0, scale: 1 }}
              // Se levanta de la planta y se apoya de nuevo justo cuando aparece la maqueta (calzan).
              animate={{ opacity: 1, y: [0, -10, 0], scale: [1, 1.025, 1], transition: { duration: 1, times: [0, 0.3, 0.85], opacity: { duration: 0.2 } } }}
              exit={{ opacity: 0, y: 0, scale: 1, transition: { duration: 0.3, delay: 0.55 } }}
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                <polygon points={puntosSvg(unidad.poligono)} transform="translate(0.4 0.9)" fill="#000" opacity="0.6" style={{ filter: "blur(0.9px)" }} />
              </svg>
              {/* eslint-disable-next-line @next/next/no-img-element -- recorte de la misma planta */}
              <img src={planta.url} alt="" draggable={false} className="absolute inset-0 size-full" style={{ clipPath: recorteCss(unidad.poligono) }} />
            </m.div>
          )}
        </AnimatePresence>

        {/* Códigos de cada unidad y puntos de los espacios comunes */}
        <m.div className="pointer-events-none absolute inset-0" animate={{ opacity: unidad ? 0 : 1 }} transition={{ duration: 0.2 }}>
          {unidades.map((u) => {
            if (!u.poligono) return null;
            const [x, y] = centroide(u.poligono);
            return (
              <span
                key={u.id}
                aria-hidden
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 font-semibold text-white shadow-md transition-colors",
                  u.categoria === "cochera" ? "text-[11px]" : "text-xs md:text-sm",
                  iluminada === u.id ? "bg-black/85" : "bg-black/55",
                )}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {u.codigo}
              </span>
            );
          })}
          {espacios.map((e) =>
            e.punto ? (
              <button
                key={e.id}
                type="button"
                disabled={!e.imagenes.length}
                onClick={() => onEspacio(e)}
                onPointerEnter={() => e.imagenes[0] && void precargar(e.imagenes[0].url)}
                className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/70 py-1 pr-3 pl-1 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-colors hover:border-(--accent) disabled:cursor-default"
                style={{ left: `${e.punto[0]}%`, top: `${e.punto[1]}%` }}
              >
                <span className="relative grid size-7 place-items-center rounded-full bg-(--accent) text-(--accent-fg)">
                  <Plus className="size-4" aria-hidden />
                  <span className="absolute inset-0 animate-ping rounded-full bg-(--accent) opacity-30 motion-reduce:hidden" aria-hidden />
                </span>
                {e.nombre}
              </button>
            ) : null,
          )}
        </m.div>
      </m.div>

      {/* Cartel de la unidad iluminada (antes de entrar) */}
      {!unidad && iluminadaU && <CartelUnidad unidad={iluminadaU} tipologia={proyecto.tipologias.find((t) => t.id === iluminadaU.unit_type_id) ?? null} tactil={luz?.dedo ?? false} />}

      {/* Maqueta (nítida, fuera del contenedor escalado) y ficha a los costados */}
      <AnimatePresence>
        {unidad && foco && (
          <FichaUnidad
            key={unidad.id}
            unidad={unidad}
            tipologia={tipologia}
            destino={foco.destino}
            movil={foco.movil}
            conMaqueta={conMaqueta}
            onImagenes={onImagenes}
            onConsultar={() => onConsultar(unidad)}
          />
        )}
      </AnimatePresence>

      {/* Nombre del piso, estados y pisos vecinos (en el celular: el nombre arriba y los vecinos abajo) */}
      <m.div
        className="pointer-events-none absolute inset-0"
        variants={{ oculta: { opacity: 0, transition: { duration: 0.2 } }, plana: { opacity: 1, transition: { delay: 0.5 } }, foco: { opacity: 0, transition: { duration: 0.2 } } }}
      >
        <div className={cn("absolute px-4 md:px-8", movil ? "inset-x-0 top-16" : "bottom-0 left-0 pb-[max(1rem,env(safe-area-inset-bottom))]")}>
          <Leyenda unidades={unidades} piso={piso} espacios={espacios} movil={movil} />
        </div>
        <div
          className={cn(
            "absolute flex gap-1.5",
            movil ? "inset-x-0 bottom-0 justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" : "right-0 bottom-0 flex-col px-8 pb-[max(1rem,env(safe-area-inset-bottom))]",
            !unidad && "pointer-events-auto",
          )}
        >
          {arriba && (
            <button type="button" onClick={() => onVecino(arriba.numero)} className="flex min-h-11 cursor-pointer items-center justify-end gap-1.5 rounded-full border border-white/15 bg-black/40 px-4 text-sm font-semibold backdrop-blur-sm hover:border-white/40">
              {nombrePiso(arriba.numero)} <ChevronUp className="size-4" aria-hidden />
            </button>
          )}
          {abajo && (
            <button type="button" onClick={() => onVecino(abajo.numero)} className="flex min-h-11 cursor-pointer items-center justify-end gap-1.5 rounded-full border border-white/15 bg-black/40 px-4 text-sm font-semibold backdrop-blur-sm hover:border-white/40">
              {nombrePiso(abajo.numero)} <ChevronDown className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </m.div>
    </m.div>
  );
}

function Leyenda({ unidades, piso, espacios, movil }: { unidades: UnidadProyecto[]; piso: PisoProyecto; espacios: EspacioProyecto[]; movil: boolean }) {
  const estados = [...new Set(unidades.flatMap((u) => estadosPara(u.operacion)))];
  const detalle = detallePiso(unidades, espacios);
  return (
    <div className="min-w-0">
      <p className="font-display text-2xl leading-none font-semibold [font-stretch:112%] md:text-3xl">{nombrePiso(piso.numero)}</p>
      {detalle && <p className="mt-1 text-sm text-muted">{detalle}</p>}
      {unidades.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85" aria-label="Referencias">
          {estados.map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: ESTADO_UNIDAD_COLOR[e] }} aria-hidden />
              {ESTADO_UNIDAD_LABEL[e]}
            </li>
          ))}
        </ul>
      )}
      {unidades.length > 0 && <p className="mt-2 text-xs text-muted">{movil ? "Tocá una unidad para verla" : "Hacé clic en una unidad para verla"}</p>}
    </div>
  );
}

function CartelUnidad({ unidad, tipologia, tactil }: { unidad: UnidadProyecto; tipologia: TipologiaProyecto | null; tactil: boolean }) {
  const datos = [unidad.categoria === "departamento" ? tipologia?.nombre : CATEGORIA_LABEL[unidad.categoria], metrosUnidad(unidad), ESTADO_UNIDAD_LABEL[unidad.estado]].filter(Boolean);
  return (
    <div aria-hidden className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 px-4 py-2.5 text-center text-white shadow-xl backdrop-blur-md">
      <p className="text-base font-semibold whitespace-nowrap">
        {nombreUnidad(unidad)} <span className="font-normal text-white/80">· {datos.join(" · ")}</span>
      </p>
      {tactil && <p className="mt-0.5 text-xs font-semibold text-(--accent)">Tocá de nuevo para verla</p>}
    </div>
  );
}

function FichaUnidad({
  unidad,
  tipologia,
  destino,
  movil,
  conMaqueta,
  onImagenes,
  onConsultar,
}: {
  unidad: UnidadProyecto;
  tipologia: TipologiaProyecto | null;
  destino: { x: number; y: number; w: number; h: number };
  movil: boolean;
  conMaqueta: boolean;
  onImagenes: () => void;
  onConsultar: () => void;
}) {
  const renders = useMemo(() => tipologia?.renders ?? [], [tipologia]);
  useEffect(() => {
    renders.slice(0, 2).forEach((r) => void precargar(r.url));
  }, [renders]);
  const disponible = unidad.estado === "disponible";
  const filas: [string, string | null][] = [
    [unidad.categoria === "departamento" ? "Tipología" : "Tipo", unidad.categoria === "departamento" ? (tipologia?.nombre ?? null) : CATEGORIA_LABEL[unidad.categoria]],
    ["Superficie total", formatM2(unidad.superficie_total)],
    ["Superficie cubierta", unidad.superficie_cubierta !== unidad.superficie_total ? formatM2(unidad.superficie_cubierta) : null],
    ["Orientación", unidad.orientacion || null],
  ];
  const consultar = unidad.categoria === "local" ? "Consultar alquiler" : unidad.categoria === "cochera" ? "Consultar por la cochera" : "Consultar por esta unidad";
  const aparecer = (d: number, x = 0) => ({
    initial: { opacity: 0, x: movil ? 0 : x, y: movil ? 12 : 0 },
    animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0.4, delay: d, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
  });

  const codigo = unidad.codigo;
  const estado = (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="size-2.5 rounded-full" style={{ background: ESTADO_UNIDAD_COLOR[unidad.estado] }} aria-hidden />
      {ESTADO_UNIDAD_LABEL[unidad.estado]}
    </span>
  );
  const botones = (
    <div className={cn("flex gap-2", movil ? "flex-row" : "mt-5 flex-col")}>
      {renders.length > 0 && (
        <button
          type="button"
          onClick={onImagenes}
          className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-(--accent) px-5 font-semibold text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
        >
          <Images className="size-5" aria-hidden /> Ver imágenes
        </button>
      )}
      <button
        type="button"
        onClick={onConsultar}
        className={cn(
          "inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors",
          renders.length > 0 ? "border border-white/25 hover:border-white/60" : "bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)",
        )}
      >
        {renders.length > 0 && movil ? "Consultar" : consultar}
      </button>
    </div>
  );
  const datos = filas.filter((x): x is [string, string] => Boolean(x[1]));

  return (
    <m.div className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 1, transition: { duration: 0.2 } }}>
      {conMaqueta && tipologia?.maqueta && (
        <m.img
          src={tipologia.maqueta.url}
          width={tipologia.maqueta.ancho}
          height={tipologia.maqueta.alto}
          alt={`Maqueta de ${nombreUnidad(unidad).toLowerCase()}: ${tipologia.nombre}`}
          className={cn("absolute object-contain", unidad.espejada && "-scale-x-100")}
          style={{ left: destino.x, top: destino.y, width: destino.w, height: destino.h }}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.45, delay: 0.72 } }}
          exit={{ opacity: 0, transition: { duration: 0.22 } }}
        />
      )}

      {movil ? (
        // Celular: todo debajo de la maqueta, compacto
        <m.div {...aparecer(0.85)} className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-3 overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ top: destino.y + destino.h + 12 }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl leading-none font-semibold [font-stretch:115%]">{codigo}</p>
              <p className="mt-1.5">{estado}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">{unidad.operacion === "alquiler" ? "Alquiler" : "Precio"}</p>
              <p className="font-display text-2xl font-semibold tabular-nums [font-stretch:110%]">{precioUnidad(unidad)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {datos.map(([k, v]) => (
              <div key={k} className={k === "Tipología" || k === "Orientación" ? "col-span-2" : undefined}>
                <dt className="sr-only">{k}</dt>
                <dd className="text-white/85">
                  <span className="text-muted">{k}: </span>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {botones}
        </m.div>
      ) : (
        <>
          {/* Compu: de un lado la unidad, del otro el precio y las imágenes */}
          <m.div {...aparecer(0.85, -24)} className="pointer-events-auto absolute top-1/2 w-72 -translate-y-1/2 text-right" style={{ right: `calc(100% - ${destino.x}px + 40px)` }}>
            <p className="font-display text-6xl leading-none font-semibold [font-stretch:115%]">{codigo}</p>
            <p className="mt-3 flex justify-end">{estado}</p>
            <dl className="mt-5 flex flex-col gap-2.5 text-sm">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </m.div>
          <m.div {...aparecer(0.95, 24)} className="pointer-events-auto absolute top-1/2 w-72 -translate-y-1/2" style={{ left: destino.x + destino.w + 40 }}>
            <p className="text-xs text-muted">{unidad.operacion === "alquiler" ? "Alquiler" : "Precio"}</p>
            <p className="font-display text-4xl font-semibold tabular-nums [font-stretch:110%]">{precioUnidad(unidad)}</p>
            {!disponible && <p className="mt-1 text-sm text-muted">Preguntanos por unidades parecidas disponibles.</p>}
            {botones}
          </m.div>
        </>
      )}
    </m.div>
  );
}
