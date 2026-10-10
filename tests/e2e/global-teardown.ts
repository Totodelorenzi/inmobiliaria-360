import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { borrarAgenciaDePrueba, borrarUsuarioDePrueba } from "./proteccion";

/** Después de la corrida: borra su inmobiliaria de prueba (con todo lo que escribieron los tests) y su usuario. */
export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave || !process.env.E2E_AGENCIA_ID) return;
  const db = createClient<Database>(url, clave, { auth: { persistSession: false } });
  await borrarAgenciaDePrueba(db, process.env.E2E_AGENCIA_ID);
  if (process.env.E2E_ADMIN_ID) await borrarUsuarioDePrueba(db, process.env.E2E_ADMIN_ID);
}
