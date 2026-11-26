"use client";

import { m, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import type { Proyecto } from "@/lib/data/proyecto";
import { cajaDe, cuadroDe, detallePiso, encuadre, etiquetaPiso, nombrePiso, puntosSvg, resumenUnidades, urlCuadro, type Caja, type Punto } from "@/lib/edificio";
import { cn } from "@/lib/utils";
import { listo, precargar, usePantalla, useMenosMovimiento, type Pantalla } from "./utiles";

/** Lo que la experiencia le pide a la fachada: dónde está la franja de un piso (para animar desde ahí). */
export type FachadaApi = { cajaPiso: (numero: number) => DOMRect | null };

type Props = {
  proyecto: Proyecto;
  /** false mientras hay un piso o una unidad abiertos: la fachada queda quieta debajo. */
  activa: boolean;
  onPiso: (numero: number) => void;
  onCocheras: () => void;
  api: Ref<FachadaApi>;
  /** Cierre al final del scroll (logo, WhatsApp, aviso y crédito). */
  cierre: ReactNode;
};

/** Alto del recorrido con scroll (en altos de pantalla): 4 pantallas de scroll con la escena fija. */
const PISTA = 5;
/** Tramos del scroll (0 a 1): portada, texto de la desarrolladora, vista 1, transición, datos y vista 2. */
const T = { portadaFin: 0.08, sobre: [0.08, 0.15, 0.32, 0.39], cambio: [0.47, 0.58], datos: [0.62, 0.69, 0.86, 0.93] } as const;

/** Margen del área libre en el celular: barra arriba y texto abajo. */
function areaLibre(p: Pantalla) {
  return { arriba: 64, abajo: Math.min(Math.round(p.alto * 0.4), 340), lados: 12 };
}

/** Rectángulo que encierra todos los pisos de una vista (con margen); sin zonas, la imagen entera. */
function focoDe(poligonos: (Punto[] | null)[]): Caja {
  const puntos = poligonos.flatMap((p) => p ?? []);
  if (!puntos.length) return { x: 0, y: 0, ancho: 100, alto: 100 };
  const c = cajaDe(puntos);
  const margen = 2;
  const x = Math.max(0, c.x - margen);
  const y = Math.max(0, c.y - margen);
  return { x, y, ancho: Math.min(100, c.x + c.ancho + margen) - x, alto: Math.min(100, c.y + c.alto + margen) - y };
}

const mascara = {
  WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 7%, #000 88%, transparent), linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)",
  WebkitMaskComposite: "source-in",
  maskImage: "linear-gradient(to bottom, transparent, #000 7%, #000 88%, transparent), linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)",
  maskComposite: "intersect",
} as const;

export function Fachada({ proyecto, activa, onPiso, onCocheras, api, cierre }: Props) {
  const pista = useRef<HTMLDivElement>(null);
  const pantalla = usePantalla();
  const menos = useMenosMovimiento();
  const { scrollYProgress: p } = useScroll({ target: pista, offset: ["start start", "end end"] });
  const dosVistas = proyecto.vistas.length > 1;
  const [vistaActiva, setVistaActiva] = useState(0);
  const [fase, setFase] = useState<"portada" | "sobre" | "vista" | "datos">("portada");
  useMotionValueEvent(p, "change", (v) => {
    setVistaActiva(dosVistas && v >= (T.cambio[0] + T.cambio[1]) / 2 ? 1 : 0);
    setFase(v < T.portadaFin ? "portada" : v < T.sobre[3] ? "sobre" : v >= T.datos[0] && v < T.datos[3] ? "datos" : "vista");
  });

  // Pisos de arriba hacia abajo con su cartel ("3 unidades · 2 disponibles").
  const pisos = useMemo(
    () =>
      proyecto.pisos.map((piso) => ({
        ...piso,
        detalle: detallePiso(
          proyecto.unidades.filter((u) => u.floor_id === piso.id),
          proyecto.espacios.filter((e) => e.floor_id === piso.id),
        ),
      })),
    [proyecto],
  );
  const encuadres = useMemo(
    () => (listo(pantalla) ? proyecto.vistas.map((v, i) => encuadre(pantalla, v, focoDe(pisos.map((x) => x.poligonos[i] ?? null)), areaLibre(pantalla))) : []),
    [pantalla, proyecto.vistas, pisos],
  );
  const modo = encuadres[0]?.modo ?? "entera";
  // Bordes del edificio en pantalla (vista 1 a la izquierda del texto, vista 2 a la derecha).
  const borde = (i: number) => {
    const e = encuadres[i];
    if (!e) return null;
    const f = focoDe(pisos.map((x) => x.poligonos[i] ?? null));
    return { izq: e.x + (f.x / 100) * e.ancho, der: e.x + ((f.x + f.ancho) / 100) * e.ancho };
  };
  const conSelector = modo === "entera" && pantalla.ancho >= 1100;
  const libre = {
    izquierda: borde(0)?.izq ?? 0,
    derecha: pantalla.ancho - (borde(encuadres.length - 1)?.der ?? pantalla.ancho) - (conSelector ? 72 : 0),
  };

  // Fundido entre vistas con un leve acercamiento (sin acercamiento si se pide menos movimiento).
  const opacidad1 = useTransform(p, [T.cambio[0], T.cambio[1]], [1, dosVistas ? 0 : 1]);
  const opacidad2 = useTransform(p, [T.cambio[0], T.cambio[1]], [0, 1]);
  const escala1 = useTransform(p, [0.2, T.cambio[1]], [1, menos ? 1 : 1.07]);
  const escala2 = useTransform(p, [T.cambio[0], 0.75], [menos ? 1 : 1.05, 1]);
  const secuencia = proyecto.transicion === "secuencia" && dosVistas ? proyecto.secuencia : null;

  // Iluminado: con mouse, el que está debajo; con el dedo, el del primer toque (el segundo entra).
  // Guarda dónde está la franja en pantalla para ubicar el cartel.
  const [luz, setLuz] = useState<{ numero: number; rect: DOMRect | null; dedo: boolean } | null>(null);
  const dedo = useRef(false);
  // Piso que ya recibió el primer toque (aparte de `luz`, que también cambia con el foco y el mouse).
  const tocado = useRef<number | null>(null);
  const poligonos = useRef(new Map<string, SVGPolygonElement>());
  useImperativeHandle(api, () => ({
    cajaPiso: (numero) => poligonos.current.get(`${vistaActiva}:${numero}`)?.getBoundingClientRect() ?? null,
  }));
  // Con un piso abierto no queda nada iluminado (y al volver se arranca de cero).
  const iluminado = activa ? (luz?.numero ?? null) : null;

  function iluminar(numero: number, conDedo = false) {
    setLuz({ numero, rect: poligonos.current.get(`${vistaActiva}:${numero}`)?.getBoundingClientRect() ?? null, dedo: conDedo });
    const planta = pisos.find((x) => x.numero === numero)?.planta?.url;
    if (planta) void precargar(planta);
  }

  function entrar(numero: number) {
    tocado.current = null;
    setLuz(null);
    onPiso(numero);
  }

  function tocar(numero: number) {
    if (dedo.current && tocado.current !== numero) {
      tocado.current = numero;
      iluminar(numero, true);
      return;
    }
    entrar(numero);
  }

  const resumen = useMemo(
    () =>
      resumenUnidades(
        proyecto.unidades.map((u) => ({ ...u, dormitorios: proyecto.tipologias.find((t) => t.id === u.unit_type_id)?.dormitorios ?? null })),
      ),
    [proyecto],
  );
  const pisoIluminado = pisos.find((x) => x.numero === iluminado);
  const cartel = pisoIluminado ? (luz?.rect ?? null) : null;

  return (
    <>
      <div ref={pista} className="relative" style={{ height: `${PISTA * 100}svh` }}>
        <div className="sticky top-0 h-svh w-full overflow-hidden" aria-hidden={!activa || undefined}>
          {proyecto.vistas.map((v, i) => {
            const e = encuadres[i];
            const interactiva = activa && vistaActiva === i;
            return (
              <m.div key={v.url} className="pointer-events-none absolute inset-0" style={{ opacity: i === 0 ? opacidad1 : opacidad2, scale: i === 0 ? escala1 : escala2 }}>
                <div className="absolute" style={e ? { left: e.x, top: e.y, width: e.ancho, height: e.alto } : { inset: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya optimizada; la primera es el LCP y se precarga desde el <head> */}
                  <img
                    src={v.url}
                    width={v.ancho}
                    height={v.alto}
                    alt={i === 0 ? `${proyecto.nombre}, vista desde ${v.nombre ?? "la calle"}` : ""}
                    fetchPriority={i === 0 ? "high" : "low"}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    className={cn("block size-full select-none", !e && "object-contain")}
                    style={mascara}
                  />
                  {e && (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 size-full"
                      style={{ pointerEvents: interactiva ? "auto" : "none" }}
                      role="group"
                      aria-label="Pisos del edificio"
                      onClick={(ev) => {
                        if (ev.target !== ev.currentTarget) return;
                        tocado.current = null;
                        setLuz(null);
                      }}
                    >
                      {pisos.map((piso) => {
                        const pol = piso.poligonos[i];
                        if (!pol) return null;
                        const activo = iluminado === piso.numero && interactiva;
                        return (
                          <polygon
                            key={piso.id}
                            ref={(el) => {
                              if (el) poligonos.current.set(`${i}:${piso.numero}`, el);
                              else poligonos.current.delete(`${i}:${piso.numero}`);
                            }}
                            points={puntosSvg(pol)}
                            vectorEffect="non-scaling-stroke"
                            role="link"
                            tabIndex={interactiva ? 0 : -1}
                            aria-label={`${nombrePiso(piso.numero)}${piso.detalle ? `: ${piso.detalle}` : ""}`}
                            className={cn(
                              "cursor-pointer outline-none transition-[fill,stroke,stroke-width] duration-200",
                              activo ? "fill-(--accent)/30 stroke-(--accent) stroke-2" : "fill-transparent stroke-white/0 stroke-1 hover:stroke-white/40 focus-visible:stroke-(--focus) focus-visible:stroke-2",
                            )}
                            onPointerEnter={(ev) => ev.pointerType === "mouse" && iluminar(piso.numero)}
                            onPointerLeave={(ev) => ev.pointerType === "mouse" && setLuz((x) => (x?.numero === piso.numero ? null : x))}
                            onPointerDown={(ev) => (dedo.current = ev.pointerType !== "mouse")}
                            onFocus={() => iluminar(piso.numero)}
                            onClick={() => tocar(piso.numero)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                entrar(piso.numero);
                              }
                            }}
                          />
                        );
                      })}
                    </svg>
                  )}
                </div>
              </m.div>
            );
          })}

          {secuencia && encuadres.length === 2 && <Secuencia secuencia={secuencia} progreso={p} desde={encuadres[0]} hasta={encuadres[1]} />}

          {/* Velo para leer el texto: de costado en la compu, abajo en el celular. */}
          <Velo progreso={p} modo={modo} />

          <Textos proyecto={proyecto} resumen={resumen} progreso={p} modo={modo} fase={fase} activa={activa} onCocheras={onCocheras} menos={menos} libre={libre} />

          {/* Cartel del piso iluminado */}
          {activa && pisoIluminado && cartel && (
            <CartelPiso
              rect={cartel}
              pantalla={pantalla}
              modo={modo}
              titulo={nombrePiso(pisoIluminado.numero)}
              detalle={pisoIluminado.detalle}
              tactil={luz?.dedo ?? false}
            />
          )}

          {/* Selector de pisos en la compu: como los botones de un ascensor */}
          {conSelector && (
            <nav aria-label="Elegí un piso" className={cn("absolute top-1/2 right-6 flex -translate-y-1/2 flex-col gap-1 transition-opacity", activa ? "opacity-100" : "pointer-events-none opacity-0")}>
              {pisos
                .filter((x) => x.numero >= 0)
                .map((piso) => (
                  <button
                    key={piso.id}
                    type="button"
                    onClick={() => entrar(piso.numero)}
                    onPointerEnter={() => iluminar(piso.numero)}
                    onPointerLeave={() => setLuz(null)}
                    onFocus={() => iluminar(piso.numero)}
                    onBlur={() => setLuz(null)}
                    aria-label={`${nombrePiso(piso.numero)}${piso.detalle ? `: ${piso.detalle}` : ""}`}
                    className={cn(
                      "grid size-10 cursor-pointer place-items-center rounded-full border text-sm font-semibold tabular-nums transition-colors",
                      iluminado === piso.numero ? "border-(--accent) bg-(--accent) text-(--accent-fg)" : "border-white/15 bg-black/30 text-white/80 backdrop-blur-sm hover:border-white/40",
                    )}
                  >
                    {etiquetaPiso(piso.numero)}
                  </button>
                ))}
            </nav>
          )}
        </div>
      </div>
      {cierre}
    </>
  );
}

/** Velo oscuro detrás del texto (aparece con él). */
function Velo({ progreso, modo }: { progreso: MotionValue<number>; modo: "entera" | "foco" }) {
  const opacidad = useTransform(progreso, [0, T.portadaFin, T.sobre[0], T.sobre[1], T.sobre[2], T.sobre[3], T.datos[0], T.datos[1], T.datos[2], T.datos[3]], [1, 0.9, 0.9, 1, 1, 0.35, 0.35, 1, 1, 0.35]);
  return (
    <m.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity: opacidad,
        background:
          modo === "entera"
            ? "linear-gradient(to right, var(--bg) 0%, color-mix(in srgb, var(--bg) 70%, transparent) 26%, transparent 48%, transparent 58%, color-mix(in srgb, var(--bg) 55%, transparent) 78%, var(--bg) 100%)"
            : "linear-gradient(to top, var(--bg) 0%, var(--bg) 26%, color-mix(in srgb, var(--bg) 60%, transparent) 40%, transparent 52%)",
      }}
    />
  );
}

type Resumen = ReturnType<typeof resumenUnidades>;

/** Espacio libre a los costados del edificio (px): ahí van los textos en la compu. */
type Libre = { izquierda: number; derecha: number };

function Textos({
  proyecto,
  resumen,
  progreso,
  modo,
  fase,
  activa,
  onCocheras,
  menos,
  libre,
}: {
  proyecto: Proyecto;
  resumen: Resumen;
  progreso: MotionValue<number>;
  modo: "entera" | "foco";
  fase: string;
  activa: boolean;
  onCocheras: () => void;
  menos: boolean;
  libre: Libre;
}) {
  const d = menos ? 0 : 28;
  const portada = { opacity: useTransform(progreso, [0, T.portadaFin], [1, 0]), y: useTransform(progreso, [0, T.portadaFin], [0, -d]) };
  const sobre = { opacity: useTransform(progreso, [...T.sobre], [0, 1, 1, 0]), y: useTransform(progreso, [...T.sobre], [d, 0, 0, -d]) };
  const datos = { opacity: useTransform(progreso, [...T.datos], [0, 1, 1, 0]), y: useTransform(progreso, [...T.datos], [d, 0, 0, -d]) };
  const pistaOpacidad = useTransform(progreso, [T.sobre[3], T.sobre[3] + 0.02, T.cambio[0], T.cambio[0] + 0.02, T.datos[3], T.datos[3] + 0.02], [0, 1, 1, 0, 0, 1]);
  const ubicacion = [proyecto.direccion, proyecto.ciudad].filter(Boolean).join(" · ");
  // En la compu, cada texto va al costado del edificio si entra; si no (ventana angosta), abajo.
  const margen = 32;
  const costado = (lado: "izquierda" | "derecha") => (modo === "entera" && libre[lado] - margen * 2 >= 260 ? Math.min(480, libre[lado] - margen * 2) : null);
  const bloque = (lado: "izquierda" | "derecha"): { className: string; style?: React.CSSProperties } => {
    const ancho = costado(lado);
    if (ancho === null) return { className: "absolute inset-x-0 bottom-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-10" };
    return { className: "absolute top-1/2 -translate-y-1/2", style: lado === "izquierda" ? { width: ancho, left: margen } : { width: ancho, right: margen } };
  };
  const tocable = (f: string) => (activa && fase === f ? "pointer-events-auto" : "pointer-events-none");
  const ancha = costado("derecha") !== null;
  const izquierda = bloque("izquierda");
  const derecha = bloque("derecha");

  return (
    <div className={cn("pointer-events-none absolute inset-0 text-fg transition-opacity duration-300", activa ? "opacity-100" : "opacity-0")}>
      <m.div style={{ ...portada, ...izquierda.style }} className={cn(izquierda.className, tocable("portada"))}>
        <h1 className="font-display text-[clamp(2.6rem,6.5vw,5.5rem)] leading-[0.95] font-semibold tracking-tight [font-stretch:118%]">{proyecto.nombre}</h1>
        {ubicacion && <p className="mt-3 text-lg text-white/85">{ubicacion}</p>}
        {proyecto.entrega && <p className="mt-1 text-sm text-muted">Entrega estimada: {proyecto.entrega}</p>}
        <p className="mt-6 flex items-center gap-3 text-sm text-muted md:mt-8">
          <span className="relative block h-8 w-px overflow-hidden bg-white/20" aria-hidden>
            <span className="absolute inset-x-0 top-0 h-3 animate-[bajar_1.8s_ease-in-out_infinite] bg-white motion-reduce:animate-none" />
          </span>
          Deslizá para conocer el proyecto
        </p>
      </m.div>

      {(proyecto.sobre_titulo || proyecto.sobre_texto) && (
        <m.div style={{ ...sobre, ...izquierda.style }} className={cn(izquierda.className, tocable("sobre"))}>
          {proyecto.sobre_titulo && <h2 className="font-display text-[clamp(1.5rem,3vw,2.6rem)] leading-tight font-semibold [font-stretch:112%]">{proyecto.sobre_titulo}</h2>}
          {proyecto.sobre_texto && <p className="mt-3 text-[15px] leading-relaxed text-pretty text-white/85 md:mt-4 md:text-lg">{proyecto.sobre_texto}</p>}
        </m.div>
      )}

      <m.div style={{ ...datos, ...derecha.style }} className={cn(derecha.className, tocable("datos"))}>
        <dl className={cn("grid", ancha ? "grid-cols-2 gap-x-6 gap-y-6" : "grid-cols-[auto_auto_auto] justify-between gap-x-3 gap-y-3")}>
          {resumen.departamentos > 0 && (
            <Dato numero={String(resumen.departamentos)} etiqueta="departamentos" detalle={ancha && resumen.tipologias ? `de ${resumen.tipologias}` : null} compacto={!ancha} />
          )}
          {resumen.metros && (
            <Dato numero={resumen.metros.min === resumen.metros.max ? String(resumen.metros.min) : `${resumen.metros.min}–${resumen.metros.max}`} unidad="m²" etiqueta="por unidad" compacto={!ancha} />
          )}
          {proyecto.entrega && <Dato numero={proyecto.entrega.match(/\d{4}/)?.[0] ?? proyecto.entrega} etiqueta="entrega" detalle={ancha ? proyecto.entrega : null} compacto={!ancha} />}
          {ancha && resumen.cocheras && <Dato numero={String(resumen.cocheras.total)} etiqueta="cocheras" detalle={resumen.locales ? "y local comercial en planta baja" : null} />}
          {ubicacion && (
            <div className={ancha ? "col-span-2" : "col-span-3"}>
              <dt className="text-xs text-muted">Ubicación</dt>
              <dd className="mt-0.5 font-medium">{ubicacion}</dd>
            </div>
          )}
          {proyecto.amenities.length > 0 && (
            <div className={ancha ? "col-span-2" : "col-span-3"}>
              <dt className="text-xs text-muted">Amenities</dt>
              <dd className="mt-1.5">
                <ul className="flex flex-wrap gap-1.5">
                  {proyecto.amenities.map((a) => (
                    <li key={a} className="rounded-full border border-white/15 px-3 py-1 text-sm">
                      {a}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
        {resumen.cocheras && (
          <button
            type="button"
            onClick={onCocheras}
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold transition-colors hover:border-(--accent) hover:text-(--accent) md:mt-5"
          >
            Ver las {resumen.cocheras.total} cocheras
            <span className="text-muted">
              {resumen.cocheras.disponibles === 0 ? "sin disponibles" : `${resumen.cocheras.disponibles} ${resumen.cocheras.disponibles === 1 ? "disponible" : "disponibles"}`}
            </span>
          </button>
        )}
      </m.div>

      {/* Pista entre textos: qué se puede hacer con la fachada */}
      <m.p
        style={{ opacity: pistaOpacidad }}
        className={cn("absolute text-sm text-white/80", modo === "entera" ? "bottom-8 left-1/2 -translate-x-1/2" : "inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center")}
      >
        {modo === "entera" ? "Pasá el mouse por un piso y hacé clic para ver su planta" : "Tocá un piso para iluminarlo y otra vez para entrar"}
      </m.p>
    </div>
  );
}

function Dato({ numero, unidad, etiqueta, detalle, compacto }: { numero: string; unidad?: string; etiqueta: string; detalle?: string | null; compacto?: boolean }) {
  return (
    <div>
      <dt className="sr-only">{etiqueta}</dt>
      <dd>
        <span className={cn("font-display leading-none font-semibold whitespace-nowrap tabular-nums [font-stretch:112%]", compacto ? "text-[1.45rem]" : "text-[clamp(1.6rem,3.4vw,3rem)]")}>{numero}</span>
        {unidad && <span className={cn("ml-1 font-semibold", compacto ? "text-sm" : "text-base md:text-lg")}>{unidad}</span>}
        <span className="mt-1 block text-sm text-white/85">{etiqueta}</span>
        {detalle && <span className="block text-xs text-muted">{detalle}</span>}
      </dd>
    </div>
  );
}

function CartelPiso({ rect, pantalla, modo, titulo, detalle, tactil }: { rect: DOMRect; pantalla: Pantalla; modo: "entera" | "foco"; titulo: string; detalle: string | null; tactil: boolean }) {
  // En la compu, al costado de la franja; en el celular, arriba (o abajo si no entra).
  const style: React.CSSProperties =
    modo === "entera"
      ? rect.right + 300 < pantalla.ancho
        ? { left: rect.right + 16, top: rect.top + rect.height / 2, transform: "translateY(-50%)" }
        : { left: rect.left - 16, top: rect.top + rect.height / 2, transform: "translate(-100%, -50%)" }
      : rect.top > 140
        ? { left: pantalla.ancho / 2, top: rect.top - 10, transform: "translate(-50%, -100%)" }
        : { left: pantalla.ancho / 2, top: rect.bottom + 10, transform: "translateX(-50%)" };
  return (
    <div aria-hidden className="pointer-events-none absolute z-10 rounded-2xl border border-white/10 bg-black/75 px-4 py-2.5 text-white shadow-xl backdrop-blur-md" style={style}>
      <p className="text-base leading-tight font-semibold whitespace-nowrap">
        {titulo}
        {detalle && <span className="font-normal text-white/80"> · {detalle}</span>}
      </p>
      {tactil && <p className="mt-0.5 text-xs font-semibold text-(--accent)">Tocá de nuevo para entrar</p>}
    </div>
  );
}

/**
 * Modo "secuencia": los cuadros de un video avanzan con el scroll (el edificio gira) en lugar del
 * fundido. Se dibujan en un canvas; se bajan de a poco cuando la escena ya cargó.
 */
function Secuencia({
  secuencia,
  progreso,
  desde,
  hasta,
}: {
  secuencia: NonNullable<Proyecto["secuencia"]>;
  progreso: MotionValue<number>;
  desde: ReturnType<typeof encuadre>;
  hasta: ReturnType<typeof encuadre>;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const cuadros = useRef<(HTMLImageElement | null)[]>([]);
  const ultimo = useRef(-1);
  const pantalla = usePantalla();
  const opacidad = useTransform(progreso, [T.cambio[0] - 0.01, T.cambio[0], T.cambio[1], T.cambio[1] + 0.01], [0, 1, 1, 0]);

  // Bajada progresiva: primero uno de cada 4 (el giro ya se ve), después el resto.
  useEffect(() => {
    let cancelado = false;
    const orden = [...Array(secuencia.cuadros).keys()].sort((a, b) => (a % 4 === 0 ? 0 : 1) - (b % 4 === 0 ? 0 : 1) || a - b);
    cuadros.current = Array(secuencia.cuadros).fill(null);
    const bajar = async () => {
      for (const i of orden) {
        if (cancelado) return;
        const img = new Image();
        img.src = urlCuadro(secuencia, i);
        await img.decode().catch(() => undefined);
        cuadros.current[i] = img;
      }
    };
    const id = window.setTimeout(bajar, 1200);
    return () => {
      cancelado = true;
      window.clearTimeout(id);
    };
  }, [secuencia]);

  function dibujar(v: number) {
    const c = lienzo.current;
    if (!c || v < T.cambio[0] || v > T.cambio[1]) return;
    const t = (v - T.cambio[0]) / (T.cambio[1] - T.cambio[0]);
    let i = cuadroDe(secuencia, t);
    // Si el cuadro justo no llegó, el más cercano que ya esté.
    for (let d = 0; !cuadros.current[i] && d < secuencia.cuadros; d++) i = cuadros.current[i - d] ? i - d : cuadros.current[i + d] ? i + d : i;
    const img = cuadros.current[i];
    if (!img || i === ultimo.current) return;
    ultimo.current = i;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== pantalla.ancho * dpr) {
      c.width = pantalla.ancho * dpr;
      c.height = pantalla.alto * dpr;
    }
    const ctx = c.getContext("2d")!;
    const k = (a: number, b: number) => a + (b - a) * t;
    ctx.fillStyle = getComputedStyle(c).backgroundColor;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, k(desde.x, hasta.x) * dpr, k(desde.y, hasta.y) * dpr, k(desde.ancho, hasta.ancho) * dpr, k(desde.alto, hasta.alto) * dpr);
  }
  useMotionValueEvent(progreso, "change", dibujar);

  return <m.canvas ref={lienzo} aria-hidden className="pointer-events-none absolute inset-0 size-full bg-bg" style={{ opacity: opacidad }} />;
}
