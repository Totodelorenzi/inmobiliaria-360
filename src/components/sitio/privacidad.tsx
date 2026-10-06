"use client";

import { ShieldCheck, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { descartarPendientes } from "@/lib/tracking/cliente";
import { cn } from "@/lib/utils";

const CLAVE = "v360_aviso_privacidad";
const sinSuscripcion = () => () => {};
function avisoPendiente() {
  try {
    return !localStorage.getItem(CLAVE);
  } catch {
    return false;
  }
}

/** Aviso breve y no invasivo de la primera visita (se cierra una vez y no vuelve). */
export function AvisoPrivacidad({ posicion = "abajo" }: { posicion?: "abajo" | "arriba" }) {
  const pendiente = useSyncExternalStore(sinSuscripcion, avisoPendiente, () => false);
  const [cerrado, setCerrado] = useState(false);
  if (!pendiente || cerrado) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, new Date().toISOString());
    } catch {}
    setCerrado(true);
  }

  return (
    <aside
      aria-label="Aviso de privacidad"
      className={cn(
        "fixed inset-x-3 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-bg p-3 text-sm text-fg shadow-xl md:right-auto md:left-4",
        // Abajo queda por encima de las barras fijas del celular; en los visores va arriba (abajo están los ambientes).
        posicion === "abajo" ? "bottom-24 md:bottom-4" : "top-20",
      )}
    >
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-ink" aria-hidden />
      <p className="flex-1">
        Registramos de forma anónima cómo se recorren las propiedades para atenderte mejor. Sin publicidad ni herramientas de terceros.{" "}
        <Link href="/privacidad" className="font-semibold text-brand-ink underline">
          Más info
        </Link>
      </p>
      <button type="button" onClick={cerrar} className="-m-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-surface" aria-label="Entendido, cerrar aviso">
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  );
}

/** Borra el historial de navegación de este navegador. */
export function BorrarHistorial() {
  const [estado, setEstado] = useState<"listo" | "borrando" | "borrado" | "error">("listo");
  async function borrar() {
    setEstado("borrando");
    descartarPendientes();
    try {
      const r = await fetch("/api/privacidad", { method: "POST" });
      try {
        sessionStorage.clear();
      } catch {}
      setEstado(r.ok ? "borrado" : "error");
    } catch {
      setEstado("error");
    }
  }
  if (estado === "borrado") {
    return (
      <p role="status" className="rounded-xl bg-success-bg p-3 font-medium text-success">
        Listo: borramos el historial de navegación de este navegador.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={borrar} loading={estado === "borrando"} className="self-start">
        {estado !== "borrando" && <Trash2 className="size-4" aria-hidden />} Borrar mi historial de este navegador
      </Button>
      {estado === "error" && (
        <p role="alert" className="text-sm text-danger">
          No se pudo borrar. Probá de nuevo o escribinos.
        </p>
      )}
    </div>
  );
}
