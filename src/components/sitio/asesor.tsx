import { Phone, UserRound } from "lucide-react";
import type { Asesor } from "@/lib/data/sitio";

/** Asesor a cargo de la propiedad: foto, nombre, rol y matrícula tal como los carga la inmobiliaria. */
export function BloqueAsesor({ asesor }: { asesor: Asesor }) {
  return (
    <div className="flex items-center gap-3">
      {asesor.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto chica subida desde el panel
        <img src={asesor.foto_url} alt="" width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-muted" aria-hidden>
          <UserRound className="size-7" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-semibold">{asesor.nombre}</p>
        {asesor.rol && <p className="text-sm text-muted">{asesor.rol}</p>}
        {asesor.matricula && <p className="text-sm text-muted">{asesor.matricula}</p>}
        {asesor.telefono && (
          <a href={`tel:${asesor.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-ink underline">
            <Phone className="size-4" aria-hidden /> {asesor.telefono}
          </a>
        )}
      </div>
    </div>
  );
}
