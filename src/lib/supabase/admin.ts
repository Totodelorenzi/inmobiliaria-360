import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con la secret key: SALTEA RLS. Solo para tareas de servidor que lo necesitan
 * (invitar usuarios, borrar datos de ejemplo). Verificá permisos antes de usarlo.
 */
export function createAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  const { supabaseSecretKey } = getServerEnv();
  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
