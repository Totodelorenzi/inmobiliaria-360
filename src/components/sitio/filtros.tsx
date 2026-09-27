"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition, type FormEvent } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { contarFiltros, filtrosAQuery, ORDEN_LABEL, type Filtros, type Modo, type Orden } from "@/lib/filtros";
import { ESTADO_OBRA_LABEL, TIPO_LABEL } from "@/lib/format";

type Props = { modo: Modo; filtros: Filtros; barrios: string[]; total: number };

/** Navega a la URL con los filtros del formulario, sin parámetros vacíos. */
function useAplicarFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendiente, startTransition] = useTransition();

  function aplicar(form: HTMLFormElement, extra: Record<string, string> = {}) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    });
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("pagina");
    const query = params.toString();
    startTransition(() => router.push(`${pathname}${query ? `?${query}` : ""}`));
  }

  return { aplicar, pendiente };
}

function CamposFiltros({ modo, filtros, barrios }: Omit<Props, "total">) {
  const obras =
    modo === "emprendimientos" ? (["en_pozo", "en_construccion"] as const) : (["terminada", "en_construccion", "en_pozo"] as const);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Buscar">
        {(a) => <Input {...a} name="q" type="search" defaultValue={filtros.q} placeholder="Barrio, calle o palabra" />}
      </Field>
      <Field label="Tipo de propiedad">
        {(a) => (
          <Select {...a} name="tipo" defaultValue={filtros.tipo ?? ""}>
            <option value="">Todos</option>
            {Object.entries(TIPO_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {barrios.length > 0 && (
        <Field label="Barrio">
          {(a) => (
            <Select {...a} name="barrio" defaultValue={filtros.barrio ?? ""}>
              <option value="">Todos</option>
              {barrios.map((barrio) => (
                <option key={barrio} value={barrio}>
                  {barrio}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Ambientes</legend>
        <div className="grid grid-cols-5 gap-1">
          {["", "1", "2", "3", "4"].map((valor) => (
            <label
              key={valor}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border text-sm font-semibold has-checked:border-brand has-checked:bg-brand has-checked:text-brand-fg has-focus-visible:outline-3 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="ambientes"
                value={valor}
                defaultChecked={String(filtros.ambientes ?? "") === valor}
                className="sr-only"
              />
              {valor === "" ? "Todos" : valor === "4" ? "4+" : valor}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Precio</legend>
        <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-2">
          <Select name="moneda" defaultValue={filtros.moneda} aria-label="Moneda">
            <option value="ARS">$</option>
            <option value="USD">USD</option>
          </Select>
          <Input name="desde" inputMode="numeric" pattern="[0-9]*" defaultValue={filtros.desde} placeholder="Desde" aria-label="Precio desde" />
          <Input name="hasta" inputMode="numeric" pattern="[0-9]*" defaultValue={filtros.hasta} placeholder="Hasta" aria-label="Precio hasta" />
        </div>
      </fieldset>
      <Field label="Estado de obra">
        {(a) => (
          <Select {...a} name="obra" defaultValue={filtros.obra ?? ""}>
            <option value="">Todos</option>
            {obras.map((obra) => (
              <option key={obra} value={obra}>
                {ESTADO_OBRA_LABEL[obra]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex flex-col">
        {[
          { name: "tour", label: "Con tour 360°", checked: filtros.tour },
          { name: "credito", label: "Apto crédito", checked: filtros.credito },
        ].map((opcion) => (
          <label key={opcion.name} className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
            <input type="checkbox" name={opcion.name} value="1" defaultChecked={opcion.checked} className="size-5 accent-(--brand)" />
            {opcion.label}
          </label>
        ))}
      </div>
      {filtros.orden !== "recientes" && <input type="hidden" name="orden" value={filtros.orden} />}
    </div>
  );
}

export function FiltrosListado({ modo, filtros, barrios, total }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { aplicar, pendiente } = useAplicarFiltros();
  const activos = contarFiltros(filtros);
  const limpiar = `${usePathname()}${filtros.orden !== "recientes" ? `?orden=${filtros.orden}` : ""}`;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    dialogRef.current?.close();
    aplicar(e.currentTarget);
  }

  // En escritorio los selects y checkboxes aplican al instante.
  function alCambiar(e: FormEvent<HTMLFormElement>) {
    const t = e.target as HTMLInputElement;
    if (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "radio") aplicar(e.currentTarget);
  }

  return (
    <>
      {/* Celular: botón que abre el panel de filtros */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button variant="outline" onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros{activos > 0 && ` (${activos})`}
        </Button>
        <SelectorOrden filtros={filtros} modo={modo} />
        {pendiente && <Spinner className="size-5 text-muted" label="Actualizando resultados" />}
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="titulo-filtros"
        className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-3xl bg-bg p-0 text-fg backdrop:bg-black/50 lg:hidden"
      >
        <form onSubmit={enviar} className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 id="titulo-filtros" className="text-lg font-bold">
              Filtros
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonStyles({ variant: "ghost", size: "icon" })}
              aria-label="Cerrar filtros"
            >
              <X aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4">
            <CamposFiltros modo={modo} filtros={filtros} barrios={barrios} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <a href={limpiar} className={buttonStyles({ variant: "outline" })}>
              Limpiar
            </a>
            <Button type="submit" variant="brand">
              Ver resultados
            </Button>
          </div>
        </form>
      </dialog>

      {/* Escritorio: panel lateral siempre visible */}
      <aside className="hidden lg:block" aria-label="Filtros">
        <form onSubmit={enviar} onChange={alCambiar} className="sticky top-20 flex flex-col gap-4 rounded-(--radius-card) border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Filtros</h2>
            {pendiente ? (
              <Spinner className="size-5 text-muted" label="Actualizando resultados" />
            ) : (
              <span className="text-sm text-muted" aria-live="polite">
                {total} {total === 1 ? "resultado" : "resultados"}
              </span>
            )}
          </div>
          <CamposFiltros modo={modo} filtros={filtros} barrios={barrios} />
          <Button type="submit" variant="brand" fullWidth>
            Aplicar
          </Button>
          {activos > 0 && (
            <a href={limpiar} className="text-center text-sm font-semibold text-brand-ink underline">
              Limpiar filtros
            </a>
          )}
        </form>
      </aside>
    </>
  );
}

/** Orden de resultados: cambia solo ese parámetro de la URL. */
export function SelectorOrden({ filtros, modo }: { filtros: Filtros; modo: Modo }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  return (
    <label className="ml-auto flex items-center gap-2 text-sm">
      <span className="sr-only sm:not-sr-only">Ordenar por</span>
      <Select
        value={filtros.orden}
        onChange={(e) =>
          startTransition(() =>
            router.push(`${pathname}${filtrosAQuery(filtros, modo, { orden: e.target.value as Orden, pagina: 1 })}`),
          )
        }
        className="w-auto"
        aria-label="Ordenar por"
      >
        {Object.entries(ORDEN_LABEL).map(([valor, label]) => (
          <option key={valor} value={valor}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}
