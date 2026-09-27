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

  const origen = new URL(request.url).searchParams.get("origen");
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("nombre, telefono, email, mensaje, origen, created_at, propiedad:properties(titulo, slug)")
    .eq("agency_id", estado.sesion.agencia.id)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (origen === "formulario" || origen === "whatsapp_click") query = query.eq("origen", origen);
  const { data, error } = await query;
  if (error) return new Response("No se pudieron exportar las consultas.", { status: 500 });

  const filas = [
    ["Fecha", "Nombre", "Teléfono", "Email", "Mensaje", "Origen", "Propiedad"],
    ...data.map((l) => [
      fecha.format(new Date(l.created_at)),
      l.nombre,
      l.telefono,
      l.email,
      l.mensaje,
      l.origen === "formulario" ? "Formulario" : "WhatsApp",
      l.propiedad?.titulo ?? "Consulta general",
    ]),
  ];
  const csv = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  const hoy = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consultas-${hoy}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
