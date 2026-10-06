import { ESTADO_LABEL as ESTADO, NIVEL_LABEL as NIVEL, ORIGEN_LABEL as ORIGEN } from "@/components/admin/nivel";
import { getEstadoSesion } from "@/lib/admin/sesion";
import { createClient } from "@/lib/supabase/server";

/** Celda CSV: entre comillas si hace falta; neutraliza fórmulas de Excel (=, +, -, @). */
function celda(valor: string | null | undefined) {
  let v = (valor ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  return /[";]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Consultas en CSV para Excel en español: separador ";" y BOM UTF-8 (tildes correctas). */
export async function GET(request: Request) {
  const estado = await getEstadoSesion();
  if (estado.tipo !== "ok") return new Response("Tu sesión venció. Volvé a entrar al panel.", { status: 401 });

  const nivel = new URL(request.url).searchParams.get("nivel");
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("nombre, telefono, email, mensaje, origen, created_at, codigo_ref, score, nivel, estado, notas, ultima_actividad, propiedad:properties(titulo, slug)")
    .eq("agency_id", estado.sesion.agencia.id)
    .order("score", { ascending: false })
    .limit(10000);
  if (nivel === "caliente" || nivel === "tibio" || nivel === "frio") query = query.eq("nivel", nivel);
  const { data, error } = await query;
  if (error) return new Response("No se pudieron exportar las consultas.", { status: 500 });

  const filas = [
    ["Puntaje", "Nivel", "Estado", "Código", "Nombre", "Teléfono", "Email", "Propiedad", "Origen", "Mensaje", "Notas", "Primer contacto", "Última actividad"],
    ...data.map((l) => [
      String(l.score),
      NIVEL[l.nivel],
      ESTADO[l.estado],
      l.codigo_ref,
      l.nombre,
      l.telefono,
      l.email,
      l.propiedad?.titulo ?? "Consulta general",
      ORIGEN[l.origen],
      l.mensaje,
      l.notas,
      fecha.format(new Date(l.created_at)),
      fecha.format(new Date(l.ultima_actividad)),
    ]),
  ];
  const csv = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  const hoy = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${hoy}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
