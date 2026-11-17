"use client";

import { Check, ImageUp, RotateCcw, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cambiarEstadoUnidad, guardarZona, reemplazarImagen, type DestinoImagen } from "@/lib/admin/acciones-proyecto";
import type { PisoAdmin, ProyectoAdmin, UnidadAdmin } from "@/lib/admin/datos-proyecto";
import { ErrorImagen, procesarImagenEdificio } from "@/lib/admin/imagenes";
import { rutaNueva, subirArchivo } from "@/lib/admin/subida";
import { ESTADOS_UNIDAD, ESTADO_UNIDAD_COLOR, ESTADO_UNIDAD_LABEL, metrosUnidad, precioUnidad, puntosSvg, type EstadoUnidad, type Punto } from "@/lib/edificio";
import { cn } from "@/lib/utils";
import { MostrarAviso, useAccion, type AvisoAccion } from "./acciones-ui";
import { Aviso, Panel } from "./ui";

// ---------------------------------------------------------------------------
// Unidades: cambio de estado en un toque
// ---------------------------------------------------------------------------

export function UnidadesEstado({ proyecto }: { proyecto: ProyectoAdmin }) {
  const router = useRouter();
  // Estado elegido que todavía no confirmó el servidor: el botón cambia al instante.
  const [locales, setLocales] = useState<Record<string, EstadoUnidad>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function cambiar(u: UnidadAdmin, estado: EstadoUnidad) {
    if ((locales[u.id] ?? u.estado) === estado) return;
    setError(null);
    setLocales((l) => ({ ...l, [u.id]: estado }));
    startTransition(async () => {
      const r = await cambiarEstadoUnidad(u.id, estado).catch(() => ({ ok: false as const, error: "No se pudo cambiar el estado. Revisá tu conexión." }));
      if (r.ok) router.refresh();
      else {
        setError(`Unidad ${u.codigo}: ${r.error}`);
        setLocales((l) => Object.fromEntries(Object.entries(l).filter(([id]) => id !== u.id)));
      }
    });
  }

  const estadoDe = (u: UnidadAdmin) => locales[u.id] ?? u.estado;
  const cuenta = (estado: EstadoUnidad) => proyecto.unidades.filter((u) => estadoDe(u) === estado).length;

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {ESTADOS_UNIDAD.map((estado) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ background: ESTADO_UNIDAD_COLOR[estado] }} aria-hidden />
            {cuenta(estado)} {ESTADO_UNIDAD_LABEL[estado].toLowerCase()}s
          </span>
        ))}
      </p>
      {error && <Aviso tono="error">{error}</Aviso>}
      {proyecto.pisos.map((piso) => (
        <Panel key={piso.id} titulo={piso.nombre}>
          <ul className="flex flex-col divide-y divide-border">
            {proyecto.unidades
              .filter((u) => u.floor_id === piso.id)
              .map((u) => {
                const tipologia = proyecto.tipologias.find((t) => t.id === u.unit_type_id);
                const actual = estadoDe(u);
                return (
                  <li key={u.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: ESTADO_UNIDAD_COLOR[actual] }}>
                        {u.codigo}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{[tipologia?.nombre, metrosUnidad(u)].filter(Boolean).join(" · ")}</span>
                        <span className="block text-sm text-muted">{precioUnidad({ ...u, estado: "disponible" })}</span>
                      </span>
                    </div>
                    <div role="group" aria-label={`Estado de la unidad ${u.codigo}`} className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
                      {ESTADOS_UNIDAD.map((estado) => (
                        <button
                          key={estado}
                          type="button"
                          aria-pressed={actual === estado}
                          onClick={() => cambiar(u, estado)}
                          className="min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold text-muted aria-pressed:text-white"
                          style={actual === estado ? { background: ESTADO_UNIDAD_COLOR[estado] } : undefined}
                        >
                          {ESTADO_UNIDAD_LABEL[estado]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Imágenes: reemplazar fachada, plantas, maquetas y renders
// ---------------------------------------------------------------------------

type Casilla = { destino: DestinoImagen; nombre: string; url: string | null; maxLado: number };

function CasillaImagen({ casilla, agencyId, projectId }: { casilla: Casilla; agencyId: string; projectId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [aviso, setAviso] = useState<AvisoAccion>(null);

  async function reemplazar(archivo: File) {
    setAviso(null);
    setProgreso(0);
    try {
      const imagen = await procesarImagenEdificio(archivo, casilla.maxLado);
      const url = await subirArchivo({ bucket: "fotos", ruta: rutaNueva(agencyId, projectId, imagen.extension), archivo: imagen.grande, alAvanzar: setProgreso });
      const r = await reemplazarImagen(casilla.destino, { url, ancho: imagen.ancho, alto: imagen.alto });
      if (!r.ok) throw new Error(r.error);
      setAviso({ tono: "ok", texto: "Imagen reemplazada." });
      router.refresh();
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof ErrorImagen || e instanceof Error ? e.message : "No se pudo subir la imagen." });
    } finally {
      setProgreso(null);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-2">
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage */}
          {casilla.url && <img src={casilla.url} alt="" className="size-full object-cover" loading="lazy" />}
        </div>
        <p className="min-w-0 flex-1 font-semibold">
          {casilla.nombre}
          {!casilla.url && <span className="block text-sm font-normal text-muted">Sin imagen</span>}
        </p>
        <Button variant="outline" loading={progreso !== null} onClick={() => input.current?.click()} aria-label={`Reemplazar la imagen de ${casilla.nombre}`}>
          {progreso === null ? (
            <>
              <ImageUp className="size-4" aria-hidden /> {casilla.url ? "Reemplazar" : "Subir"}
            </>
          ) : (
            `${Math.round(progreso * 100)} %`
          )}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          hidden
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (archivo) void reemplazar(archivo);
          }}
        />
      </div>
      <MostrarAviso aviso={aviso} />
    </li>
  );
}

export function ImagenesProyecto({ proyecto }: { proyecto: ProyectoAdmin }) {
  const grupos: { titulo: string; ayuda?: string; casillas: Casilla[] }[] = [
    {
      titulo: "Fachada",
      ayuda: "Es lo primero que ve el comprador. Si la imagen nueva tiene otro encuadre, volvé a marcar los pisos en “Zonas”.",
      casillas: [{ destino: { tipo: "fachada", id: proyecto.id }, nombre: "Fachada del edificio", url: proyecto.fachada_url, maxLado: 1600 }],
    },
    {
      titulo: "Plantas",
      ayuda: "La planta de cada piso vista desde arriba. Si cambia el encuadre, volvé a marcar sus unidades en “Zonas”.",
      casillas: [...proyecto.pisos].reverse().map((p) => ({ destino: { tipo: "planta" as const, id: p.id }, nombre: p.nombre, url: p.planta_url, maxLado: 1600 })),
    },
    {
      titulo: "Maquetas",
      ayuda: "Una por tipología, vista desde arriba y sin textos: en las unidades espejadas se muestra dada vuelta.",
      casillas: proyecto.tipologias.map((t) => ({ destino: { tipo: "maqueta" as const, id: t.id }, nombre: t.nombre, url: t.maqueta_url, maxLado: 1600 })),
    },
    ...proyecto.tipologias.map((t) => ({
      titulo: `Renders · ${t.nombre}`,
      casillas: t.ambientes.map((a) => ({ destino: { tipo: "render" as const, id: a.id }, nombre: a.nombre, url: a.render_url, maxLado: 1920 })),
    })),
  ];
  return (
    <div className="flex flex-col gap-5">
      {grupos
        .filter((g) => g.casillas.length > 0)
        .map((g) => (
          <Panel key={g.titulo} titulo={g.titulo}>
            {g.ayuda && <p className="mb-3 text-sm text-muted">{g.ayuda}</p>}
            <ul className="flex flex-col gap-2">
              {g.casillas.map((c) => (
                <CasillaImagen key={`${c.destino.tipo}:${c.destino.id}`} casilla={c} agencyId={proyecto.agency_id} projectId={proyecto.id} />
              ))}
            </ul>
          </Panel>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zonas: marcar polígonos tocando los vértices sobre la imagen
// ---------------------------------------------------------------------------

type Zona = { id: string; nombre: string; poligono: Punto[] | null };

export function MarcadorZonas({ proyecto }: { proyecto: ProyectoAdmin }) {
  // "fachada": los pisos sobre la fachada. Si no, el id del piso cuyas unidades se marcan sobre su planta.
  const [lienzo, setLienzo] = useState("fachada");
  const piso: PisoAdmin | undefined = proyecto.pisos.find((p) => p.id === lienzo);
  const imagen = piso ? piso.planta_url : proyecto.fachada_url;
  const zonas: Zona[] = piso
    ? proyecto.unidades.filter((u) => u.floor_id === piso.id).map((u) => ({ id: u.id, nombre: u.codigo, poligono: u.poligono }))
    : proyecto.pisos.map((p) => ({ id: p.id, nombre: p.nombre, poligono: p.poligono }));

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          ¿Qué querés marcar?
          <Select value={lienzo} onChange={(e) => setLienzo(e.target.value)}>
            <option value="fachada">Los pisos, sobre la fachada</option>
            {[...proyecto.pisos].reverse().map((p) => (
              <option key={p.id} value={p.id}>
                Las unidades de {p.nombre.toLowerCase()}, sobre su planta
              </option>
            ))}
          </Select>
        </label>
      </Panel>
      {imagen ? (
        <Lienzo key={lienzo} tipo={piso ? "unidad" : "piso"} imagen={imagen} zonas={zonas} />
      ) : (
        <Aviso tono="alerta">Primero subí la imagen en “Imágenes”.</Aviso>
      )}
    </div>
  );
}

function Lienzo({ tipo, imagen, zonas }: { tipo: "piso" | "unidad"; imagen: string; zonas: Zona[] }) {
  const [elegida, setElegida] = useState(zonas.find((z) => !z.poligono)?.id ?? zonas[0]?.id ?? null);
  // null: se muestra la zona guardada. Una lista: se está marcando de nuevo.
  const [puntos, setPuntos] = useState<Punto[] | null>(null);
  const { ejecutar, pendiente, aviso } = useAccion();
  const zona = zonas.find((z) => z.id === elegida);
  if (!zona) return <Aviso>No hay nada para marcar acá todavía.</Aviso>;
  const marcando = puntos ?? (zona.poligono ? null : []);
  const visibles = marcando ?? zona.poligono ?? [];

  function elegir(id: string) {
    setElegida(id);
    setPuntos(null);
  }

  function alTocar(e: React.MouseEvent<HTMLDivElement>) {
    if (!marcando || marcando.length >= 60) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (valor: number, total: number) => Math.min(100, Math.max(0, Math.round((valor / total) * 10000) / 100));
    setPuntos([...marcando, [pct(e.clientX - r.left, r.width), pct(e.clientY - r.top, r.height)]]);
  }

  function guardar() {
    if (!marcando || marcando.length < 3 || !zona) return;
    ejecutar(
      () => guardarZona(tipo, zona.id, marcando),
      () => {
        // Sigue con la próxima que falte marcar.
        const siguiente = zonas.find((z) => z.id !== zona.id && !z.poligono);
        setPuntos(null);
        if (siguiente) setElegida(siguiente.id);
      },
    );
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={tipo === "piso" ? "Pisos" : "Unidades"}>
        {zonas.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={z.id === zona.id}
            onClick={() => elegir(z.id)}
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-fg"
          >
            {z.nombre} {z.poligono && <Check className="size-4" aria-label="marcada" />}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted">
        {marcando
          ? `Tocá las esquinas de ${tipo === "piso" ? zona.nombre.toLowerCase() : `la unidad ${zona.nombre}`} sobre la imagen, una por una y en orden, bordeando la zona. ${marcando.length < 3 ? `Faltan ${3 - marcando.length} como mínimo.` : "Cuando termines, tocá Guardar."}`
          : "Esta zona ya está marcada. Si quedó corrida, volvé a marcarla."}
      </p>
      <MostrarAviso aviso={aviso} />
      <div className={cn("relative mt-2 w-full overflow-hidden rounded-xl border border-border bg-white select-none", marcando && "cursor-crosshair")} onClick={alTocar}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage */}
        <img src={imagen} alt="" className="block w-full" draggable={false} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {zonas
            .filter((z) => z.id !== zona.id && z.poligono)
            .map((z) => (
              <polygon key={z.id} points={puntosSvg(z.poligono!)} vectorEffect="non-scaling-stroke" className="fill-black/15 stroke-black/50 stroke-1" />
            ))}
          {visibles.length >= 2 && (
            <polygon points={puntosSvg(visibles)} vectorEffect="non-scaling-stroke" className="fill-(--brand)/35 stroke-(--brand) stroke-2" />
          )}
        </svg>
        {marcando?.map(([x, y], i) => (
          <span
            key={i}
            className="pointer-events-none absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-brand text-[10px] font-bold text-brand-fg shadow"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {marcando ? (
          <>
            <Button variant="outline" disabled={marcando.length === 0 || pendiente} onClick={() => setPuntos(marcando.slice(0, -1))}>
              <Undo2 className="size-4" aria-hidden /> Deshacer
            </Button>
            {zona.poligono && (
              <Button variant="ghost" disabled={pendiente} onClick={() => setPuntos(null)}>
                Cancelar
              </Button>
            )}
            <Button variant="brand" className="flex-1" disabled={marcando.length < 3} loading={pendiente} onClick={guardar}>
              Guardar zona
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setPuntos([])}>
            <RotateCcw className="size-4" aria-hidden /> Volver a marcar
          </Button>
        )}
      </div>
    </Panel>
  );
}
