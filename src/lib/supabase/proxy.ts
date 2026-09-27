import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

export const LOGIN_PATH = "/admin/login";

/** Rutas de /admin que se ven sin sesión (login, recuperar contraseña, callbacks de mails). */
const PUBLIC_ADMIN_PATHS = [LOGIN_PATH, "/admin/recuperar", "/admin/auth"];

const isPublicAdminPath = (pathname: string) =>
  PUBLIC_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Refresca la sesión de Supabase (reescribe cookies si el token venció) y protege /admin.
 * Es un chequeo optimista: cada página y Server Action vuelve a verificar al usuario.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = isPublicAdminPath(pathname);

  // Sin Supabase configurado no hay login posible: la página de login muestra el aviso.
  if (!isSupabaseConfigured()) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims valida el JWT; no ejecutar código entre la creación del cliente y esta llamada.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  if (!isLoggedIn && !isPublic) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingCookies(url, response);
  }
  if (isLoggedIn && pathname === LOGIN_PATH) {
    return redirectKeepingCookies(new URL("/admin", request.url), response);
  }
  return response;
}

/** Redirige conservando las cookies de sesión refrescadas y las cabeceras anticaché. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (key !== "set-cookie" && !key.startsWith("x-middleware")) redirect.headers.set(key, value);
  });
  return redirect;
}
