import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_EQUIPO } from "@/lib/tracking/config";

/**
 * "No contar mis visitas": la abre alguien del equipo desde el panel (link a la web de su
 * inmobiliaria) y deja una cookie en ese navegador para que sus recorridos no sumen a las métricas.
 * Con ?contar=1 se vuelve a contar. No requiere sesión: dejar de ser medido nunca es un riesgo.
 */
export function GET(request: NextRequest) {
  const contar = request.nextUrl.searchParams.get("contar") === "1";
  const destino = new URL("/", request.url);
  destino.search = "";
  destino.searchParams.set("visitas", contar ? "contadas" : "no-contadas");
  const respuesta = NextResponse.redirect(destino);
  if (contar) respuesta.cookies.delete(COOKIE_EQUIPO);
  else respuesta.cookies.set(COOKIE_EQUIPO, "1", { path: "/", sameSite: "lax", httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 400 });
  return respuesta;
}
