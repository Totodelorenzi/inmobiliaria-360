import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { COOKIE_PRUEBA, entornoActual, PARAM_PRUEBA, resolverHost, urlDelPanel } from "@/lib/tenancy";

/** Rutas que atienden todas las inmobiliarias sin reescribir (ellas mismas resuelven el sitio por el host). */
const RUTAS_COMPARTIDAS = ["/api/", "/v/", "/buscar"];

/**
 * Multi-inmobiliaria: decide por el host qué web mostrar y la reescribe a /s/<sitio>/..., así cada
 * página se cachea con su inmobiliaria en la ruta. El panel solo responde en su host central.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // Las rutas internas de cada sitio solo se alcanzan por reescritura, nunca desde afuera.
  if (pathname === "/s" || pathname.startsWith("/s/")) return new NextResponse("No encontrado", { status: 404 });

  const entorno = entornoActual();
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const pedida = searchParams.get(PARAM_PRUEBA);
  const destino = resolverHost(host, entorno, pedida ?? request.cookies.get(COOKIE_PRUEBA)?.value);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const enPanel = destino.tipo === "panel" || destino.prueba;
    const panel = new URL(urlDelPanel(entorno));
    if (!enPanel && panel.host !== host) return NextResponse.redirect(new URL(`${pathname}${search}`, panel));
    return updateSession(request);
  }

  if (destino.tipo === "panel") {
    return pathname === "/" ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }

  if (destino.tipo === "plataforma") {
    const respuesta = NextResponse.next();
    // ?agencia= vacío o inválido en un host de prueba: se deja de mirar la inmobiliaria elegida.
    if (destino.prueba && pedida !== null) respuesta.cookies.delete(COOKIE_PRUEBA);
    return respuesta;
  }

  const respuesta = RUTAS_COMPARTIDAS.some((r) => pathname === r || pathname.startsWith(r))
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(`/s/${destino.clave}${pathname === "/" ? "" : pathname}${search}`, request.url));
  if (destino.prueba && pedida) {
    respuesta.cookies.set(COOKIE_PRUEBA, destino.clave, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
  }
  return respuesta;
}

// Todo menos los archivos internos de Next y el ícono (no hay carpeta public/).
export const config = {
  matcher: ["/((?!_next/|icon.svg|favicon.ico).*)"],
};
