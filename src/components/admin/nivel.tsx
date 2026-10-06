import { Flame, Snowflake, ThermometerSun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

export const NIVEL_LABEL: Record<Enums<"nivel_lead">, string> = { caliente: "Caliente", tibio: "Tibio", frio: "Frío" };
export const ESTADO_LABEL: Record<Enums<"estado_lead">, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita_agendada: "Visita agendada",
  descartado: "Descartado",
  cerrado: "Cerrado",
};
export const ORIGEN_LABEL: Record<Enums<"origen_lead">, string> = {
  pedido_visita: "Pidió visita",
  formulario: "Formulario",
  whatsapp_click: "WhatsApp",
  link_personalizado: "Link de pre-visita",
};

const ESTILO = {
  caliente: { tone: "danger", Icono: Flame, barra: "bg-danger" },
  tibio: { tone: "warning", Icono: ThermometerSun, barra: "bg-[#b54708]" },
  frio: { tone: "neutral", Icono: Snowflake, barra: "bg-muted" },
} as const;

/** Nivel con color e ícono (el color nunca es la única señal: siempre va el texto). */
export function NivelBadge({ nivel, className }: { nivel: Enums<"nivel_lead">; className?: string }) {
  const { tone, Icono } = ESTILO[nivel];
  return (
    <Badge tone={tone} className={className}>
      <Icono aria-hidden /> {NIVEL_LABEL[nivel]}
    </Badge>
  );
}

/** Puntaje 0-100 con barra. */
export function Puntaje({ score, nivel, className }: { score: number; nivel: Enums<"nivel_lead">; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-display text-2xl font-bold tabular-nums">{score}</span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-surface" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Puntaje">
        <div className={cn("h-full rounded-full", ESTILO[nivel].barra)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
