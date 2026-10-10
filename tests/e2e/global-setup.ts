import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { borrarAgenciaDePrueba, borrarUsuarioDePrueba, copiarDemo, crearAgenciaDePrueba } from "./proteccion";

/**
 * Antes de la corrida: inmobiliaria de prueba propia (e2e-<corrida>, es_test) con una copia de las
 * propiedades de la demo y un usuario admin de prueba. Los datos pasan a los tests por process.env.
 */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave || clave.includes("PLACEHOLDER")) return;
  const corrida = process.env.E2E_CORRIDA!;
  const db = createClient<Database>(url, clave, { auth: { persistSession: false } });

  await barrerRestosViejos(db);

  const agenciaId = await crearAgenciaDePrueba(db, `e2e-${corrida}`, `Pruebas automáticas ${corrida}`);
  process.env.E2E_AGENCIA_ID = agenciaId;
  try {
    const copiadas = await copiarDemo(db, agenciaId);
    const email = `e2e-admin-${corrida}@example.com`;
    const password = `E2e${randomBytes(12).toString("hex")}`;
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    process.env.E2E_ADMIN_ID = data.user.id;
    process.env.E2E_ADMIN_EMAIL = email;
    process.env.E2E_ADMIN_PASSWORD = password;
    const { error: errorMiembro } = await db.from("agency_members").insert({ user_id: data.user.id, agency_id: agenciaId, rol: "admin" });
    if (errorMiembro) throw errorMiembro;
    console.log(`Inmobiliaria de prueba e2e-${corrida}: ${copiadas} propiedades copiadas de la demo.`);
  } catch (error) {
    await borrarAgenciaDePrueba(db, agenciaId);
    if (process.env.E2E_ADMIN_ID) await borrarUsuarioDePrueba(db, process.env.E2E_ADMIN_ID);
    throw error;
  }
}

/** Restos de corridas cortadas a la mitad (más de 6 horas): siempre a través de la protección. */
async function barrerRestosViejos(db: ReturnType<typeof createClient<Database>>) {
  const limite = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: viejas } = await db.from("agencies").select("id").eq("es_test", true).like("subdominio", "e2e-%").lt("created_at", limite);
  for (const { id } of viejas ?? []) await borrarAgenciaDePrueba(db, id);
  const { data: usuarios } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of usuarios?.users ?? []) {
    if (/^e2e-[a-z0-9-]+@example\.com$/.test(u.email ?? "") && u.created_at < limite) await borrarUsuarioDePrueba(db, u.id);
  }
}
