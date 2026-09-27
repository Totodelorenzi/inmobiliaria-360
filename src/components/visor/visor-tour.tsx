"use client";

import "pannellum/build/pannellum.css";
import "./visor.css";
import { DraftingCompass, Expand, Hand, Minimize, RotateCw, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BotonWhatsapp } from "@/components/sitio/boton-whatsapp";
import { Spinner } from "@/components/ui/spinner";
import type { EscenaTour } from "@/lib/data/sitio";
import { cn } from "@/lib/utils";
import { BarraVisor, botonVisor } from "./barra-visor";

type Visor = {
  on(evento: string, callback: (arg: string) => void): Visor;
  loadScene(id: string): void;
  getScene(): string;
  stopAutoRotate(): void;
  startOrientation(): void;
  stopOrientation(): void;
  destroy(): void;
};

declare global {
  interface Window {
    pannellum?: { viewer(el: HTMLElement, config: object): Visor };
  }
}

const TEXTOS = {
  loadButtonLabel: "Cargar",
  loadingLabel: "Cargando…",
  bylineLabel: "",
  noPanoramaError: "No hay una imagen 360° para este ambiente.",
  fileAccessError: "No se pudo acceder a la imagen %s.",
  malformedURLError: "La dirección de la imagen no es válida.",
  iOS8WebGLError: "Tu navegador no puede mostrar el tour. Actualizá el sistema del celular.",
  genericWebGLError: "Tu navegador no puede mostrar imágenes 360° (WebGL desactivado).",
  textureSizeError: "La imagen es demasiado grande para tu dispositivo (%spx; admite hasta %spx).",
  unknownError: "No se pudo mostrar el tour.",
};

const FLECHA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';

const sinSuscripcion = () => () => {};
function useSoporte(detectar: () => boolean) {
  return useSyncExternalStore(sinSuscripcion, detectar, () => false);
}

type Props = {
  escenas: EscenaTour[];
  titulo: string;
  slug: string;
  tienePlanos: boolean;
  whatsapp: { href: string; agencyId: string; propertyId: string } | null;
};

export function VisorTour({ escenas, titulo, slug, tienePlanos, whatsapp }: Props) {
  const marcoRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<Visor | null>(null);
  const interactuoRef = useRef(false);
  const [actual, setActual] = useState(escenas[0].id);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [ayuda, setAyuda] = useState(true);
  const [giroscopio, setGiroscopio] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const soportaGiroscopio = useSoporte(() => matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window);
  const soportaPantallaCompleta = useSoporte(() => document.fullscreenEnabled);
  const nombreActual = escenas.find((e) => e.id === actual)?.nombre_ambiente ?? "";

  useEffect(() => {
    let visor: Visor | undefined;
    let cancelado = false;
    const precargadas = new Set<string>();

    // Deja en caché del navegador las escenas a las que se puede ir desde la actual.
    function precargar(desde: string) {
      const i = escenas.findIndex((e) => e.id === desde);
      const destinos = new Set([...escenas[i].hotspots.map((h) => h.target_scene_id), escenas[(i + 1) % escenas.length].id]);
      for (const id of destinos) {
        const escena = escenas.find((e) => e.id === id);
        if (!escena || id === desde || precargadas.has(id)) continue;
        precargadas.add(id);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = escena.panorama_url;
      }
    }

    function crearHotspot(div: HTMLElement, { texto, destino }: { texto: string; destino: string }) {
      const icono = document.createElement("span");
      icono.className = "hotspot-tour__icono";
      icono.innerHTML = FLECHA;
      const etiqueta = document.createElement("span");
      etiqueta.className = "hotspot-tour__texto";
      etiqueta.textContent = texto;
      div.append(icono, etiqueta);
      div.tabIndex = 0;
      div.setAttribute("role", "button");
      div.setAttribute("aria-label", `Ir a ${texto}`);
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          visorRef.current?.loadScene(destino);
        }
      });
    }

    import("pannellum/build/pannellum.js").then(() => {
      if (cancelado || !panoramaRef.current || !window.pannellum) return;
      const pedida = new URLSearchParams(window.location.search).get("escena");
      const primera = escenas.some((e) => e.id === pedida) ? pedida! : escenas[0].id;
      const nombres = new Map(escenas.map((e) => [e.id, e.nombre_ambiente]));

      visor = window.pannellum.viewer(panoramaRef.current, {
        default: {
          firstScene: primera,
          sceneFadeDuration: 600,
          autoLoad: true,
          autoRotate: -3,
          showControls: false,
          compass: false,
          hfov: 100,
          minHfov: 40,
          maxHfov: 120,
          strings: TEXTOS,
        },
        scenes: Object.fromEntries(
          escenas.map((e) => [
            e.id,
            {
              type: "equirectangular",
              panorama: e.panorama_url,
              yaw: e.yaw_inicial,
              pitch: e.pitch_inicial,
              hotSpots: e.hotspots.map((h) => ({
                type: "scene",
                sceneId: h.target_scene_id,
                yaw: h.yaw,
                pitch: h.pitch,
                cssClass: "hotspot-tour",
                createTooltipFunc: crearHotspot,
                createTooltipArgs: { texto: h.texto || nombres.get(h.target_scene_id) || "Siguiente ambiente", destino: h.target_scene_id },
              })),
            },
          ]),
        ),
      });
      visorRef.current = visor;
      setActual(primera);

      visor.on("load", () => {
        setCargando(false);
        setError(false);
        // La autorrotación corre solo hasta el primer toque, también al cambiar de ambiente.
        if (interactuoRef.current) visor?.stopAutoRotate();
        if (visor) precargar(visor.getScene());
      });
      visor.on("scenechange", (id) => {
        setActual(id);
        setCargando(true);
        window.history.replaceState(window.history.state, "", `?escena=${id}`);
      });
      visor.on("error", () => {
        setCargando(false);
        setError(true);
      });
      const detener = () => {
        interactuoRef.current = true;
        visor?.stopAutoRotate();
        setAyuda(false);
      };
      visor.on("mousedown", detener);
      visor.on("touchstart", detener);
    });

    return () => {
      cancelado = true;
      visor?.destroy();
      visorRef.current = null;
    };
  }, [escenas]);

  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(document.fullscreenElement === marcoRef.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function alternarGiroscopio() {
    const visor = visorRef.current;
    if (!visor) return;
    if (giroscopio) {
      visor.stopOrientation();
      setGiroscopio(false);
      return;
    }
    // iOS pide permiso explícito, y solo desde un toque del usuario.
    const permiso = (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (permiso) {
      const respuesta = await permiso().catch(() => "denied");
      if (respuesta !== "granted") {
        setAviso("Para mover la vista con el celular, permití el acceso al movimiento del dispositivo.");
        return;
      }
    }
    interactuoRef.current = true;
    setAyuda(false);
    visor.stopAutoRotate();
    visor.startOrientation();
    setGiroscopio(true);
  }

  function alternarPantallaCompleta() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void marcoRef.current?.requestFullscreen().catch(() => setAviso("Tu navegador no permite pantalla completa."));
  }

  return (
    <div ref={marcoRef} className="visor-tour relative size-full bg-black">
      <div ref={panoramaRef} className="absolute inset-0" aria-label={`Vista 360° de ${nombreActual}`} role="img" />

      {cargando && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <p className="flex items-center gap-3 rounded-full bg-black/70 px-5 py-3 font-semibold" role="status">
            <Spinner className="size-5" /> Cargando {nombreActual}…
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 grid place-items-center p-6">
          <div role="alert" className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/80 p-6 text-center">
            <p className="font-semibold">No pudimos cargar este ambiente.</p>
            <p className="text-sm text-white/80">Revisá tu conexión y probá de nuevo.</p>
            <button
              type="button"
              className={cn(botonVisor, "w-auto gap-2 bg-accent px-5 font-semibold text-accent-fg hover:bg-accent-hover")}
              onClick={() => {
                setError(false);
                setCargando(true);
                visorRef.current?.loadScene(actual);
              }}
            >
              <RotateCw aria-hidden /> Reintentar
            </button>
          </div>
        </div>
      )}
      {ayuda && !cargando && !error && (
        <p className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium">
          <Hand className="size-5" aria-hidden /> Arrastrá para mirar alrededor
        </p>
      )}

      <BarraVisor titulo={titulo} subtitulo={nombreActual} volverA={`/propiedad/${slug}`}>
        {soportaGiroscopio && (
          <button type="button" className={botonVisor} onClick={alternarGiroscopio} aria-pressed={giroscopio} aria-label="Mover la vista con el celular">
            <Smartphone aria-hidden />
          </button>
        )}
        {soportaPantallaCompleta && (
          <button
            type="button"
            className={botonVisor}
            onClick={alternarPantallaCompleta}
            aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {pantallaCompleta ? <Minimize aria-hidden /> : <Expand aria-hidden />}
          </button>
        )}
      </BarraVisor>

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-linear-to-t from-black/85 to-transparent pt-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end justify-between gap-2 px-3">
          {tienePlanos ? (
            <Link href={`/propiedad/${slug}/planos`} className={cn(botonVisor, "w-auto gap-2 px-4 text-sm font-semibold")}>
              <DraftingCompass aria-hidden /> Ver planos
            </Link>
          ) : (
            <span />
          )}
          {whatsapp && (
            <BotonWhatsapp {...whatsapp} size="icon" className="shadow-lg" aria-label="Consultar por WhatsApp" />
          )}
        </div>
        <nav aria-label="Ambientes">
          <ul className="flex snap-x gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
            {escenas.map((escena) => {
              const esActual = escena.id === actual;
              return (
                <li key={escena.id} className="shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => !esActual && visorRef.current?.loadScene(escena.id)}
                    aria-current={esActual || undefined}
                    className={cn(
                      "flex w-28 cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-black/60 text-left backdrop-blur transition",
                      esActual ? "border-accent" : "border-transparent hover:border-white/60",
                    )}
                  >
                    {escena.thumb_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura generada al subir
                      <img src={escena.thumb_url} alt="" width={224} height={112} loading="lazy" className="aspect-[2/1] w-full object-cover" />
                    ) : (
                      <span className="aspect-[2/1] w-full bg-linear-to-br from-brand to-black" aria-hidden />
                    )}
                    <span className="truncate px-2 py-1.5 text-xs font-semibold">{escena.nombre_ambiente}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {aviso && (
        <p role="status" className="absolute inset-x-4 top-20 z-30 mx-auto max-w-sm rounded-xl bg-white p-3 text-center text-sm font-medium text-fg shadow-lg">
          {aviso}
        </p>
      )}
    </div>
  );
}
