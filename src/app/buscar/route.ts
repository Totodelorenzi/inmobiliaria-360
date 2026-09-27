import type { NextRequest } from "next/server";

/** Buscador del inicio sin JavaScript: redirige al listado de la operación elegida. */
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const operacion = searchParams.get("operacion") === "venta" ? "venta" : "alquiler";
  const q = searchParams.get("q")?.trim().slice(0, 80);
  const destino = new URL(`/${operacion}`, request.url);
  if (q) destino.searchParams.set("q", q);
  return Response.redirect(destino, 303);
}
