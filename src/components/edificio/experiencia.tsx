"use client";

import { ArrowUp, ChevronLeft } from "lucide-react";
import { AnimatePresence, domAnimation, LazyMotion, MotionConfig } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import type { EspacioProyecto, Proyecto, UnidadProyecto } from "@/lib/data/proyecto";
import {
  buscarEspacio,
  buscarUnidad,
  leerVista,
  mismaVista,
  nombrePiso,
  nombreUnidad,
  rutaProyecto,
  rutaVista,
  vistaExiste,
  type Vista,
} from "@/lib/edificio";
import { variablesEdificio } from "@/lib/tema-edificio";
import { registrar } from "@/lib/tracking/cliente";
import { cn } from "@/lib/utils";
import { Contacto, type PedidoContacto } from "./contacto";
import { Fachada, type FachadaApi } from "./fachada";
import { Galeria } from "./galeria";
import { CapaPiso, type OrigenPiso } from "./planta";
import { abrirWhatsapp, guardarCampana, precargarLuego } from "./utiles";

export type AgenciaEdificio = { id: string; nombre: string; logo: string | null; whatsapp: string | null };

type Props = {
  proyecto: Proyecto;
  agencia: AgenciaEdificio;
  /** Paso pedido en la URL (se puede entrar directo a un piso o a una unidad). */
  inicial: Vista;
  /** Ruta pública del proyecto ("/proyecto/edificio-mirador"). */
  base: string;
  /** URL absoluta del proyecto para los mensajes de WhatsApp (en hosts de prueba lleva ?agencia=). */
  urlPublica: string;
  credito: ReactNode;
};

/**
 * Landing del proyecto en una sola pantalla: fachada con scroll → piso → unidad → imágenes.
 * Cada paso tiene su URL (pushState, integrado con el router de Next): se comparte por WhatsApp y
 * el botón atrás del navegador vuelve con la animación inversa.
 */
export function Experiencia(props: Props) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Escena {...props} />
      </LazyMotion>
    </MotionConfig>
  );
}

const CLAVE_POPUP = "v360_contacto_ofrecido";
type EstadoHistoria = { __edificio?: number } | null;
const indiceHistoria = () => (window.history.state as EstadoHistoria)?.__edificio ?? 0;

function Escena({ proyecto, agencia, inicial, base, urlPublica, credito }: Props) {
  // El paso que se ve y cómo se anima la planta al entrar y al salir (desde la franja o el piso vecino).
  const [paso, setPaso] = useState<{ vista: Vista; entrada: OrigenPiso; salida: OrigenPiso }>({
    vista: inicial,
    entrada: { rect: null, modo: "fachada" },
    salida: { rect: null, modo: "fachada" },
  });
  const vista = paso.vista;
  const actual = useRef(inicial);
  const fachada = useRef<FachadaApi>(null);
  const [contacto, setContacto] = useState<PedidoContacto | null>(null);
  const ofrecido = useRef(false);
  const sufijo = useCallback((v: Vista) => rutaVista(proyecto.slug, v).slice(rutaProyecto(proyecto.slug).length), [proyecto.slug]);

  // Datos del paso actual
  const encontrada = vista.tipo === "unidad" || vista.tipo === "imagenes" ? buscarUnidad(proyecto, vista.codigo) : null;
  const espacio = vista.tipo === "espacio" ? buscarEspacio(proyecto, vista.numero, vista.espacio) : null;
  const piso =
    vista.tipo === "piso" ? (proyecto.pisos.find((p) => p.numero === vista.numero) ?? null) : vista.tipo === "espacio" ? (espacio?.piso ?? null) : (encontrada?.piso ?? null);

  /** Animación de entrada y de salida de la planta según de dónde se viene y adónde se va. */
  const animacionEntre = useCallback(
    (desde: Vista, hacia: Vista): { entrada?: OrigenPiso; salida?: OrigenPiso } => {
      const numero = (v: Vista) => (v.tipo === "piso" || v.tipo === "espacio" ? v.numero : v.tipo === "fachada" ? null : (buscarUnidad(proyecto, v.codigo)?.piso.numero ?? null));
      const a = numero(desde);
      const b = numero(hacia);
      if (a === null && b !== null) return { entrada: { rect: fachada.current?.cajaPiso(b) ?? null, modo: "fachada" } };
      if (a !== null && b === null) return { salida: { rect: fachada.current?.cajaPiso(a) ?? null, modo: "fachada" } };
      if (a !== null && b !== null && a !== b) {
        const sube = b > a ? 1 : -1;
        return { entrada: { rect: null, modo: "vecino", direccion: sube }, salida: { rect: null, modo: "vecino", direccion: sube === 1 ? -1 : 1 } };
      }
      return {};
    },
    [proyecto],
  );

  const cambiar = useCallback(
    (v: Vista) => {
      // Las franjas se miden ahora (en el evento), antes de que la fachada cambie.
      const anim = animacionEntre(actual.current, v);
      actual.current = v;
      setPaso((p) => ({ vista: v, entrada: anim.entrada ?? p.entrada, salida: anim.salida ?? p.salida }));
    },
    [animacionEntre],
  );

  /** Lleva a un paso: hacia adentro agrega una entrada al historial; entre hermanos la reemplaza. */
  const ir = useCallback(
    (v: Vista, modo: "agregar" | "reemplazar" = "agregar") => {
      if (mismaVista(v, actual.current)) return;
      // Se conservan los parámetros de la dirección (p. ej. ?agencia= en las vistas previas), menos los UTM.
      const q = new URLSearchParams(window.location.search);
      for (const k of [...q.keys()]) if (k.startsWith("utm_")) q.delete(k);
      const consulta = q.toString();
      const url = `${base}${sufijo(v)}${consulta ? `?${consulta}` : ""}`;
      const i = indiceHistoria();
      if (modo === "agregar") window.history.pushState({ __edificio: i + 1 }, "", url);
      else window.history.replaceState({ __edificio: i }, "", url);
      cambiar(v);
    },
    [base, sufijo, cambiar],
  );

  const padre = useCallback(
    (v: Vista): Vista => {
      if (v.tipo === "imagenes") return { tipo: "unidad", codigo: v.codigo };
      if (v.tipo === "espacio") return { tipo: "piso", numero: v.numero };
      if (v.tipo === "unidad") return { tipo: "piso", numero: buscarUnidad(proyecto, v.codigo)?.piso.numero ?? 0 };
      return { tipo: "fachada" };
    },
    [proyecto],
  );

  /** Un paso atrás: si el anterior del historial es el padre, se usa el botón atrás del navegador. */
  const volver = useCallback(() => {
    if (actual.current.tipo === "fachada") return;
    if (indiceHistoria() > 0) window.history.back();
    else ir(padre(actual.current), "reemplazar");
  }, [ir, padre]);

  // Historial del navegador: atrás y adelante llevan al paso de la URL, con la animación que corresponde.
  useEffect(() => {
    guardarCampana();
    if ((window.history.state as EstadoHistoria)?.__edificio === undefined) window.history.replaceState({ __edificio: 0 }, "");
    const alNavegar = () => {
      const i = window.location.pathname.indexOf(base);
      if (i < 0) return;
      const v = leerVista(window.location.pathname.slice(i + base.length).split("/").filter(Boolean));
      if (v && vistaExiste(proyecto, v) && !mismaVista(v, actual.current)) cambiar(v);
    };
    window.addEventListener("popstate", alNavegar);
    return () => window.removeEventListener("popstate", alNavegar);
  }, [base, proyecto, cambiar]);

  // Con un piso abierto la página no scrollea (la fachada queda donde estaba para volver ahí).
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = vista.tipo === "fachada" ? "" : "hidden";
    return () => {
      html.style.overflow = "";
    };
  }, [vista.tipo]);

  // Lo que se va a mirar después, cuando el navegador está libre: la segunda vista y las plantas.
  useEffect(() => {
    precargarLuego([proyecto.vistas[1]?.url, ...proyecto.pisos.map((p) => p.planta?.url)]);
  }, [proyecto]);

  // Título de la pestaña y registro de lo que se mira (piso y unidad).
  useEffect(() => {
    const titulo = encontrada ? nombreUnidad(encontrada.unidad) : espacio ? espacio.espacio.nombre : piso ? nombrePiso(piso.numero) : null;
    document.title = titulo ? `${titulo} · ${proyecto.nombre}` : [proyecto.nombre, proyecto.ciudad].filter(Boolean).join(" · ");
    if (vista.tipo === "piso" && piso) registrar({ tipo: "floor_view", projectId: proyecto.id, floorId: piso.id });
    if (vista.tipo === "unidad" && encontrada) registrar({ tipo: "unit_view", projectId: proyecto.id, floorId: encontrada.piso.id, unitId: encontrada.unidad.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de paso
  }, [vista]);

  // Escape vuelve un paso (la galería y el contacto manejan su propio Escape).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || contacto || vista.tipo === "fachada" || vista.tipo === "imagenes" || vista.tipo === "espacio") return;
      volver();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [contacto, vista.tipo, volver]);

  const urlUnidad = useCallback(
    (u: UnidadProyecto) => {
      const url = new URL(urlPublica);
      url.pathname += sufijo({ tipo: "unidad", codigo: u.codigo });
      return url.toString();
    },
    [urlPublica, sufijo],
  );

  /** El contacto que se ofrece solo (al terminar o al querer cerrar la galería) aparece una vez por sesión. */
  const ofrecerContacto = useCallback((u: UnidadProyecto, origen: PedidoContacto["origen"], detalle: string | null) => {
    try {
      if (ofrecido.current || sessionStorage.getItem(CLAVE_POPUP)) return false;
      sessionStorage.setItem(CLAVE_POPUP, "1");
    } catch {
      if (ofrecido.current) return false;
    }
    ofrecido.current = true;
    setContacto({ unidad: u, origen, detalle });
    return true;
  }, []);

  const tipologia = encontrada?.tipologia ?? null;
  const detalleUnidad = encontrada ? (encontrada.unidad.categoria === "departamento" ? tipologia?.nombre : null) ?? null : null;
  const rastreoUnidad = useMemo(() => (encontrada ? { tipo: "unidad" as const, projectId: proyecto.id, unitId: encontrada.unidad.id } : null), [encontrada?.unidad.id, proyecto.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rastreoEspacio = useMemo(
    () => (espacio ? { tipo: "espacio" as const, projectId: proyecto.id, floorId: espacio.piso.id, spaceId: espacio.espacio.id } : null),
    [espacio?.espacio.id, proyecto.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const estilo = useMemo(() => variablesEdificio(proyecto.color_fondo, null), [proyecto.color_fondo]);
  const fondo = estilo["--bg"];
  // Sin franjas de otro color al estirar la página.
  useEffect(() => {
    document.documentElement.style.background = fondo;
    document.body.style.background = fondo;
  }, [fondo]);

  return (
    <div style={{ "--bg": fondo, "--surface": estilo["--surface"], "--border": estilo["--border"] } as React.CSSProperties} className="bg-bg">
      <Fachada
        proyecto={proyecto}
        activa={vista.tipo === "fachada"}
        api={fachada}
        onPiso={(numero) => ir({ tipo: "piso", numero })}
        onCocheras={() => {
          const sub = proyecto.pisos.find((p) => p.numero < 0 && p.planta);
          if (sub) ir({ tipo: "piso", numero: sub.numero });
        }}
        cierre={<Cierre proyecto={proyecto} agencia={agencia} credito={credito} urlPublica={urlPublica} />}
      />

      <AnimatePresence custom={paso.salida}>
        {piso?.planta && (
          <CapaPiso
            key={piso.id}
            proyecto={proyecto}
            piso={piso}
            unidad={encontrada?.unidad ?? null}
            tipologia={tipologia}
            origen={paso.entrada}
            onUnidad={(u) => ir({ tipo: "unidad", codigo: u.codigo })}
            onEspacio={(e: EspacioProyecto) => ir({ tipo: "espacio", numero: piso.numero, espacio: e.slug })}
            onImagenes={() => encontrada && ir({ tipo: "imagenes", codigo: encontrada.unidad.codigo })}
            onConsultar={(u) => setContacto({ unidad: u, origen: "boton", detalle: u.categoria === "departamento" ? (proyecto.tipologias.find((t) => t.id === u.unit_type_id)?.nombre ?? null) : null })}
            onVecino={(numero) => ir({ tipo: "piso", numero }, "reemplazar")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {vista.tipo === "imagenes" && encontrada && tipologia && rastreoUnidad && tipologia.renders.length > 0 && (
          <Galeria
            key={`u:${encontrada.unidad.id}`}
            titulo={`${nombreUnidad(encontrada.unidad)} · ${detalleUnidad ?? proyecto.nombre}`}
            imagenes={tipologia.renders}
            espejada={encontrada.unidad.espejada}
            rastreo={rastreoUnidad}
            onCerrar={volver}
            onTerminar={() => ofrecerContacto(encontrada.unidad, "galeria_fin", detalleUnidad)}
            antesDeCerrar={(vistas) => vistas >= 3 && ofrecerContacto(encontrada.unidad, "galeria_cierre", detalleUnidad)}
          />
        )}
        {espacio && rastreoEspacio && espacio.espacio.imagenes.length > 0 && (
          <Galeria
            key={`e:${espacio.espacio.id}`}
            titulo={`${espacio.espacio.nombre} · ${nombrePiso(espacio.piso.numero)}`}
            subtitulo={espacio.espacio.descripcion}
            imagenes={espacio.espacio.imagenes}
            rastreo={rastreoEspacio}
            onCerrar={volver}
          />
        )}
      </AnimatePresence>

      <Barra vista={vista} proyecto={proyecto} agencia={agencia} titulo={encontrada ? nombreUnidad(encontrada.unidad) : piso ? nombrePiso(piso.numero) : null} volver={volver} padre={padre} urlPublica={urlPublica} unidad={encontrada?.unidad ?? null} urlUnidad={urlUnidad} />

      <Contacto
        pedido={contacto}
        agencyId={agencia.id}
        projectId={proyecto.id}
        proyecto={proyecto.nombre}
        whatsapp={agencia.whatsapp}
        url={urlUnidad}
        onCerrar={() => setContacto(null)}
      />
    </div>
  );
}

function Barra({
  vista,
  proyecto,
  agencia,
  titulo,
  volver,
  padre,
  urlPublica,
  unidad,
  urlUnidad,
}: {
  vista: Vista;
  proyecto: Proyecto;
  agencia: AgenciaEdificio;
  titulo: string | null;
  volver: () => void;
  padre: (v: Vista) => Vista;
  urlPublica: string;
  unidad: UnidadProyecto | null;
  urlUnidad: (u: UnidadProyecto) => string;
}) {
  const p = padre(vista);
  const textoVolver =
    vista.tipo === "fachada"
      ? null
      : p.tipo === "fachada"
        ? "Edificio"
        : p.tipo === "piso"
          ? nombrePiso(p.numero)
          : p.tipo === "unidad"
            ? (buscarUnidad(proyecto, p.codigo)?.unidad.categoria === "local" ? "Local" : (buscarUnidad(proyecto, p.codigo)?.unidad.codigo ?? "Unidad"))
            : "Volver";
  const enGaleria = vista.tipo === "imagenes" || vista.tipo === "espacio";
  const mensaje = unidad ? `Hola, me interesa ${unidad.categoria === "local" ? "el local" : unidad.categoria === "cochera" ? `la cochera ${unidad.codigo}` : `la unidad ${unidad.codigo}`} de ${proyecto.nombre}. ${urlUnidad(unidad)}` : `Hola, quiero saber más sobre ${proyecto.nombre}. ${urlPublica}`;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 px-3 transition-opacity duration-300 md:px-6",
        // En la galería manda su propia barra.
        enGaleria ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 85%, transparent), transparent)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {textoVolver ? (
          <button type="button" onClick={volver} className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full pr-4 pl-2 text-sm font-semibold hover:bg-white/10">
            <ChevronLeft className="size-5" aria-hidden />
            {textoVolver}
          </button>
        ) : agencia.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo de la desarrolladora, en blanco sobre la pantalla oscura
          <img src={agencia.logo} alt={agencia.nombre} className="h-7 w-auto max-w-40 object-contain brightness-0 invert md:h-8" />
        ) : (
          <span className="font-display text-lg font-semibold">{agencia.nombre}</span>
        )}
      </div>
      {titulo && vista.tipo !== "fachada" && <p className="hidden truncate text-sm text-muted md:block">{proyecto.nombre}</p>}
      {agencia.whatsapp && (
        <a
          href={`https://wa.me/${agencia.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.currentTarget.href = abrirWhatsapp(agencia.whatsapp!, mensaje, { projectId: proyecto.id, unitId: unidad?.id, ubicacion: "barra" });
          }}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 text-sm font-semibold backdrop-blur-sm transition-colors hover:border-[#25d366] sm:px-4"
          aria-label="Escribir por WhatsApp"
        >
          <WhatsappIcon className="size-5 text-[#25d366]" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </header>
  );
}

function Cierre({ proyecto, agencia, credito, urlPublica }: { proyecto: Proyecto; agencia: AgenciaEdificio; credito: ReactNode; urlPublica: string }) {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center gap-6 px-6 pt-24 pb-36 text-center" aria-label="Contacto">
      {agencia.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo de la desarrolladora
        <img src={agencia.logo} alt={agencia.nombre} loading="lazy" className="h-12 w-auto max-w-64 object-contain brightness-0 invert md:h-14" />
      ) : (
        <p className="font-display text-3xl font-semibold">{agencia.nombre}</p>
      )}
      <p className="max-w-md text-lg text-pretty text-white/85">
        ¿Querés saber más de {proyecto.nombre}? Escribinos y te respondemos por WhatsApp.
      </p>
      {agencia.whatsapp && (
        <a
          href={`https://wa.me/${agencia.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.currentTarget.href = abrirWhatsapp(agencia.whatsapp!, `Hola, quiero saber más sobre ${proyecto.nombre}. ${urlPublica}`, { projectId: proyecto.id, ubicacion: "cierre" });
          }}
          className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[#25d366] px-8 text-lg font-semibold text-[#06260f] transition-transform hover:scale-[1.02]"
        >
          <WhatsappIcon className="size-6" /> Escribinos por WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted hover:text-fg"
      >
        <ArrowUp className="size-4" aria-hidden /> Volver al edificio
      </button>
      <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted">
        <p className="font-semibold text-white/80">Imágenes ilustrativas, no contractuales</p>
        <p>
          © {new Date().getFullYear()} {agencia.nombre} ·{" "}
          <Link href="/privacidad" className="inline-flex min-h-11 items-center underline">
            Privacidad
          </Link>{" "}
          · <span>{credito}</span>
        </p>
      </footer>
    </section>
  );
}
