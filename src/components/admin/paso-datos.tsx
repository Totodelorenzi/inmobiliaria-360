"use client";

import { Check, CircleAlert, CloudUpload, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { guardarDatos } from "@/lib/admin/acciones";
import { TITULO_BORRADOR, type CampoDatos, type ErroresDatos } from "@/lib/admin/propiedad";
import { ESTADO_OBRA_LABEL, OPERACION_LABEL, TIPO_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { SelectorUbicacion } from "./selector-ubicacion";
import { Panel } from "./ui";

const AMENITIES_COMUNES = [
  "Pileta",
  "Parrilla",
  "SUM",
  "Gimnasio",
  "Seguridad 24 h",
  "Balcón",
  "Terraza",
  "Jardín",
  "Patio",
  "Lavadero",
  "Aire acondicionado",
  "Calefacción",
  "Ascensor",
  "Baulera",
  "Apto mascotas",
  "Solárium",
];

type Estado = "guardado" | "pendiente" | "guardando" | "error";

/** Grupo de opciones como botones grandes (radio accesible). */
function Opciones<T extends string>({
  nombre,
  legend,
  opciones,
  valor,
  onCambio,
}: {
  nombre: string;
  legend: string;
  opciones: Record<T, string>;
  valor: T;
  onCambio?: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(opciones) as [T, string][]).map(([v, label]) => (
          <label
            key={v}
            className="flex min-h-11 cursor-pointer items-center rounded-xl border border-border px-4 font-semibold has-checked:border-brand has-checked:bg-brand has-checked:text-brand-fg has-focus-visible:outline-3 has-focus-visible:outline-focus"
          >
            <input type="radio" name={nombre} value={v} defaultChecked={v === valor} onChange={() => onCambio?.(v)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Casilla({ nombre, label, defaultChecked, onCambio, hint }: { nombre: string; label: string; defaultChecked: boolean; onCambio?: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={nombre} defaultChecked={defaultChecked} onChange={(e) => onCambio?.(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-(--brand)" />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

const Grilla = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

export function PasoDatos({ propiedad: p }: { propiedad: Tables<"properties"> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const pendientes = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [estado, setEstado] = useState<Estado>("guardado");
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [slug, setSlug] = useState(p.slug);
  const [obra, setObra] = useState(p.estado_obra);
  const [financiacion, setFinanciacion] = useState(p.acepta_financiacion);
  const [avance, setAvance] = useState(p.avance_obra_pct ?? 0);
  const [amenities, setAmenities] = useState<string[]>(p.amenities);
  const [otraAmenity, setOtraAmenity] = useState("");
  const monedaElegida = useRef(false);

  const guardar = useCallback(async () => {
    clearTimeout(timer.current);
    const lote = pendientes.current;
    if (Object.keys(lote).length === 0) return;
    pendientes.current = {};
    setEstado("guardando");
    try {
      const r = await guardarDatos(p.id, lote);
      setErrores((prev) => {
        const siguiente = { ...prev };
        for (const campo of Object.keys(lote)) delete siguiente[campo as CampoDatos];
        return { ...siguiente, ...r.errores };
      });
      if (r.slug) setSlug(r.slug);
      setErrorGeneral(r.error ?? null);
      setEstado(r.ok && !r.error ? (Object.keys(pendientes.current).length ? "pendiente" : "guardado") : "error");
    } catch {
      pendientes.current = { ...lote, ...pendientes.current };
      setErrorGeneral("No hay conexión: los cambios se guardan apenas vuelva.");
      setEstado("error");
    }
  }, [p.id]);

  const marcar = useCallback(
    (campo: string, valor: string) => {
      pendientes.current[campo] = valor;
      setEstado("pendiente");
      clearTimeout(timer.current);
      timer.current = setTimeout(guardar, 1000);
    },
    [guardar],
  );

  // Guardar lo pendiente al salir de la pantalla o esconder la pestaña.
  useEffect(() => {
    const alOcultar = () => document.visibilityState === "hidden" && void guardar();
    const alSalir = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendientes.current).length) {
        void guardar();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", alOcultar);
    window.addEventListener("beforeunload", alSalir);
    return () => {
      document.removeEventListener("visibilitychange", alOcultar);
      window.removeEventListener("beforeunload", alSalir);
      void guardar();
    };
  }, [guardar]);

  function alCambiar(e: FormEvent<HTMLFormElement>) {
    const el = e.target as HTMLInputElement;
    if (!el.name) return;
    marcar(el.name, el.type === "checkbox" ? String(el.checked) : el.value);
  }

  function cambiarAmenities(lista: string[]) {
    setAmenities(lista);
    marcar("amenities", lista.join(","));
  }

  // Alquileres en pesos y ventas en dólares (lo habitual en Argentina), salvo que ya se haya elegido la moneda a mano.
  function cambiarOperacion(operacion: string) {
    const moneda = formRef.current?.elements.namedItem("moneda") as HTMLSelectElement | null;
    const sugerida = operacion === "alquiler" ? "ARS" : "USD";
    if (!moneda || monedaElegida.current || moneda.value === sugerida) return;
    moneda.value = sugerida;
    marcar("moneda", sugerida);
  }

  const leer = (campo: string) => (formRef.current?.elements.namedItem(campo) as HTMLInputElement | null)?.value ?? "";
  const err = (campo: CampoDatos) => errores[campo];
  const mesEntrega = p.fecha_entrega?.slice(0, 7) ?? "";
  const extras = amenities.filter((a) => !AMENITIES_COMUNES.includes(a));

  return (
    <form ref={formRef} onChange={alCambiar} onBlur={() => void guardar()} onSubmit={(e) => (e.preventDefault(), void guardar())} className="flex flex-col gap-5" noValidate>
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-2 bg-surface/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl lg:top-0" aria-live="polite">
        <span className="flex items-center gap-2 text-sm font-medium">
          {estado === "guardado" && (
            <>
              <Check className="size-4 text-success" aria-hidden /> Cambios guardados
            </>
          )}
          {estado === "pendiente" && (
            <>
              <CloudUpload className="size-4 text-muted" aria-hidden /> Cambios sin guardar…
            </>
          )}
          {estado === "guardando" && (
            <>
              <Spinner className="size-4" /> Guardando…
            </>
          )}
          {estado === "error" && (
            <span className="flex items-center gap-2 text-danger">
              <CircleAlert className="size-4" aria-hidden /> {errorGeneral ?? "Hay datos para revisar (marcados en rojo)."}
            </span>
          )}
        </span>
        <span className="hidden truncate text-xs text-muted sm:block">/propiedad/{slug}</span>
      </div>

      <Panel titulo="Operación y tipo">
        <div className="flex flex-col gap-4">
          <Opciones nombre="operacion" legend="Operación" opciones={OPERACION_LABEL} valor={p.operacion} onCambio={cambiarOperacion} />
          <Field label="Tipo de propiedad" error={err("tipo")}>
            {(a) => (
              <Select {...a} name="tipo" defaultValue={p.tipo}>
                {Object.entries(TIPO_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Título del aviso" required error={err("titulo")} hint="Corto y concreto, ej. “Depto 3 ambientes con balcón al frente”.">
            {(a) => <Input {...a} name="titulo" defaultValue={p.titulo === TITULO_BORRADOR ? "" : p.titulo} maxLength={160} placeholder="Depto 3 ambientes con balcón" />}
          </Field>
        </div>
      </Panel>

      <Panel titulo="Precio">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Field label="Moneda">
              {(a) => (
                <Select {...a} name="moneda" defaultValue={p.moneda} onChange={() => (monedaElegida.current = true)}>
                  <option value="ARS">$ (pesos)</option>
                  <option value="USD">USD</option>
                </Select>
              )}
            </Field>
            <Field label="Precio" error={err("precio")} hint="Vacío = “Consultar precio”. En alquiler, por mes.">
              {(a) => <Input {...a} name="precio" inputMode="decimal" defaultValue={p.precio ?? ""} placeholder="95.000" />}
            </Field>
          </div>
          <Field label="Expensas (en pesos, por mes)" error={err("expensas")}>
            {(a) => <Input {...a} name="expensas" inputMode="decimal" defaultValue={p.expensas ?? ""} placeholder="80.000" />}
          </Field>
          <Casilla nombre="apto_credito" label="Apto crédito hipotecario" defaultChecked={p.apto_credito} />
          <Casilla nombre="acepta_financiacion" label="Acepta financiación" defaultChecked={p.acepta_financiacion} onCambio={setFinanciacion} />
          {financiacion && (
            <Field label="Detalle de la financiación" error={err("detalle_financiacion")}>
              {(a) => (
                <Textarea {...a} name="detalle_financiacion" defaultValue={p.detalle_financiacion ?? ""} rows={2} placeholder="Ej. 40% de anticipo y saldo en 36 cuotas en pesos ajustadas por CAC." />
              )}
            </Field>
          )}
        </div>
      </Panel>

      <Panel titulo="Estado de obra">
        <div className="flex flex-col gap-4">
          <Opciones nombre="estado_obra" legend="¿La propiedad está terminada?" opciones={ESTADO_OBRA_LABEL} valor={p.estado_obra} onCambio={setObra} />
          {obra !== "terminada" && (
            <Grilla>
              <Field label="Entrega estimada" error={err("fecha_entrega")} hint="Mes y año.">
                {(a) => <Input {...a} name="fecha_entrega" type="month" defaultValue={mesEntrega} />}
              </Field>
              <Field label={`Avance de obra: ${avance}%`} error={err("avance_obra_pct")}>
                {(a) => (
                  <input
                    {...a}
                    name="avance_obra_pct"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={avance}
                    onInput={(e) => setAvance(Number(e.currentTarget.value))}
                    className="min-h-11 w-full accent-(--brand)"
                  />
                )}
              </Field>
            </Grilla>
          )}
        </div>
      </Panel>

      <Panel titulo="Ubicación">
        <div className="flex flex-col gap-4">
          <Field label="Dirección" error={err("direccion")} hint="Calle y altura.">
            {(a) => <Input {...a} name="direccion" defaultValue={p.direccion ?? ""} autoComplete="street-address" placeholder="Av. Cabildo 2300" />}
          </Field>
          <Grilla>
            <Field label="Barrio" error={err("barrio")}>
              {(a) => <Input {...a} name="barrio" defaultValue={p.barrio ?? ""} placeholder="Belgrano" />}
            </Field>
            <Field label="Ciudad" error={err("ciudad")}>
              {(a) => <Input {...a} name="ciudad" defaultValue={p.ciudad ?? ""} placeholder="CABA" />}
            </Field>
          </Grilla>
          <Casilla
            nombre="mostrar_direccion_exacta"
            label="Mostrar la dirección exacta en la web"
            defaultChecked={p.mostrar_direccion_exacta}
            hint="Si no, se muestra solo el barrio y una zona aproximada en el mapa."
          />
          <SelectorUbicacion
            lat={p.lat}
            lng={p.lng}
            consulta={() => [leer("direccion"), leer("barrio"), leer("ciudad"), "Argentina"].filter(Boolean).join(", ")}
            onCambio={(lat, lng) => {
              marcar("lat", lat == null ? "" : String(lat));
              marcar("lng", lng == null ? "" : String(lng));
            }}
          />
        </div>
      </Panel>

      <Panel titulo="Características">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(
            [
              ["ambientes", "Ambientes", p.ambientes],
              ["dormitorios", "Dormitorios", p.dormitorios],
              ["banos", "Baños", p.banos],
              ["cochera", "Cocheras", p.cochera],
              ["superficie_total", "Sup. total (m²)", p.superficie_total],
              ["superficie_cubierta", "Sup. cubierta (m²)", p.superficie_cubierta],
            ] as const
          ).map(([campo, label, valor]) => (
            <Field key={campo} label={label} error={err(campo)}>
              {(a) => <Input {...a} name={campo} inputMode="decimal" defaultValue={valor ?? ""} />}
            </Field>
          ))}
        </div>
      </Panel>

      <Panel titulo="Amenities">
        <div className="flex flex-wrap gap-2">
          {[...AMENITIES_COMUNES, ...extras].map((a) => {
            const activa = amenities.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={activa}
                onClick={() => cambiarAmenities(activa ? amenities.filter((x) => x !== a) : [...amenities, a])}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition",
                  activa ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg hover:bg-surface",
                )}
              >
                {activa && <Check className="size-4" aria-hidden />} {a}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={otraAmenity}
            onChange={(e) => setOtraAmenity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.nextElementSibling?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
              }
            }}
            placeholder="Otra (ej. Cancha de tenis)"
            aria-label="Agregar otra amenity"
            maxLength={40}
          />
          <button
            type="button"
            onClick={() => {
              const nueva = otraAmenity.trim();
              if (nueva && !amenities.includes(nueva)) cambiarAmenities([...amenities, nueva]);
              setOtraAmenity("");
            }}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-border px-4 font-semibold hover:bg-surface"
          >
            <Plus className="size-4" aria-hidden /> Agregar
          </button>
        </div>
      </Panel>

      <Panel titulo="Descripción">
        <Field label="Descripción" error={err("descripcion")} hint="Contá lo que no se ve en las fotos: orientación, luz, estado, cercanía a transporte y comercios.">
          {(a) => <Textarea {...a} name="descripcion" defaultValue={p.descripcion ?? ""} rows={8} maxLength={10000} />}
        </Field>
      </Panel>
    </form>
  );
}
