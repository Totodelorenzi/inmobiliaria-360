import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con la sesión del usuario (Server Components, Server Actions, Route Handlers).
 * Lee cookies, así que vuelve dinámica la ruta: usarlo solo en /admin y en acciones autenticadas.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Tag de caché de todo lo que muestra la web pública. El admin lo invalida al publicar cambios. */
export const TAG_SITIO = "sitio";

/**
 * Cliente anónimo sin cookies para la web pública. RLS aplica.
 * Con `cache`, las lecturas quedan en la caché de datos de Next con el tag del sitio.
 */
export function createPublicClient({ cache = true }: { cache?: boolean } = {}) {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: cache
      ? { fetch: (input, init) => fetch(input, { ...init, next: { tags: [TAG_SITIO], revalidate: 3600 } }) }
      : undefined,
  });
}
