import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const ROOT = join(import.meta.dirname, "..", "..");

/** IDs fijos de los datos de prueba. */
export const ID = {
  adminA: "00000000-0000-4000-8000-00000000000a",
  agenteA: "00000000-0000-4000-8000-00000000000b",
  adminB: "00000000-0000-4000-8000-00000000000c",
  agenciaA: "10000000-0000-4000-8000-00000000000a",
  agenciaB: "10000000-0000-4000-8000-00000000000b",
  pubA: "20000000-0000-4000-8000-00000000000a",
  borradorA: "20000000-0000-4000-8000-00000000000b",
  pubB: "20000000-0000-4000-8000-00000000000c",
  borradorB: "20000000-0000-4000-8000-00000000000d",
  escenaPubA1: "30000000-0000-4000-8000-00000000000a",
  escenaPubA2: "30000000-0000-4000-8000-00000000000b",
  escenaBorradorA: "30000000-0000-4000-8000-00000000000c",
  escenaBorradorB: "30000000-0000-4000-8000-00000000000d",
  planoPubA: "40000000-0000-4000-8000-00000000000a",
  planoBorradorA: "40000000-0000-4000-8000-00000000000b",
  fotoPubA1: "50000000-0000-4000-8000-00000000000a",
  fotoPubA2: "50000000-0000-4000-8000-00000000000b",
  fotoBorradorA: "50000000-0000-4000-8000-00000000000c",
  visitanteA: "60000000-0000-4000-8000-00000000000a",
  visitanteB: "60000000-0000-4000-8000-00000000000b",
  leadVisitanteA: "70000000-0000-4000-8000-00000000000a",
  linkA: "80000000-0000-4000-8000-00000000000a",
} as const;

const FIXTURES = `
  insert into auth.users (id, email) values
    ('${ID.adminA}', 'admin@a.test'), ('${ID.agenteA}', 'agente@a.test'), ('${ID.adminB}', 'admin@b.test');
  insert into public.agencies (id, nombre, whatsapp) values
    ('${ID.agenciaA}', 'Agencia A', '5491100000001'), ('${ID.agenciaB}', 'Agencia B', '5491100000002');
  insert into public.agency_members (user_id, agency_id, rol) values
    ('${ID.adminA}', '${ID.agenciaA}', 'admin'), ('${ID.agenteA}', '${ID.agenciaA}', 'agente'),
    ('${ID.adminB}', '${ID.agenciaB}', 'admin');
  insert into public.properties (id, agency_id, titulo, slug, operacion, tipo, publicada, es_demo) values
    ('${ID.pubA}', '${ID.agenciaA}', 'Depto publicado A', 'depto-publicado-a', 'venta', 'departamento', true, true),
    ('${ID.borradorA}', '${ID.agenciaA}', 'Borrador A', 'borrador-a', 'alquiler', 'casa', false, false),
    ('${ID.pubB}', '${ID.agenciaB}', 'Depto publicado B', 'depto-publicado-b', 'venta', 'ph', true, false),
    ('${ID.borradorB}', '${ID.agenciaB}', 'Borrador B', 'borrador-b', 'alquiler', 'local', false, false);
  insert into public.property_photos (id, property_id, url, orden, es_principal) values
    ('${ID.fotoPubA1}', '${ID.pubA}', 'https://x/1.webp', 0, true),
    ('${ID.fotoPubA2}', '${ID.pubA}', 'https://x/2.webp', 1, false),
    ('${ID.fotoBorradorA}', '${ID.borradorA}', 'https://x/3.webp', 0, true);
  insert into public.tour_scenes (id, property_id, nombre_ambiente, panorama_url, orden) values
    ('${ID.escenaPubA1}', '${ID.pubA}', 'Living', 'https://x/p1.jpg', 0),
    ('${ID.escenaPubA2}', '${ID.pubA}', 'Cocina', 'https://x/p2.jpg', 1),
    ('${ID.escenaBorradorA}', '${ID.borradorA}', 'Living', 'https://x/p3.jpg', 0),
    ('${ID.escenaBorradorB}', '${ID.borradorB}', 'Living', 'https://x/p4.jpg', 0);
  insert into public.tour_hotspots (scene_id, target_scene_id, yaw, pitch, texto) values
    ('${ID.escenaPubA1}', '${ID.escenaPubA2}', 90, -5, 'Ir a la cocina');
  insert into public.property_plans (id, property_id, nombre, url) values
    ('${ID.planoPubA}', '${ID.pubA}', 'Planta baja', 'https://x/plano1.webp'),
    ('${ID.planoBorradorA}', '${ID.borradorA}', 'Planta', 'https://x/plano2.webp');
  insert into public.plan_hotspots (plan_id, x_pct, y_pct, texto, scene_id) values
    ('${ID.planoPubA}', 30, 40, 'Living', '${ID.escenaPubA1}'),
    ('${ID.planoBorradorA}', 50, 50, 'Living', '${ID.escenaBorradorA}');
  insert into public.leads (agency_id, property_id, nombre, telefono, origen) values
    ('${ID.agenciaA}', '${ID.pubA}', 'Ana', '1122334455', 'formulario'),
    ('${ID.agenciaB}', '${ID.pubB}', 'Beto', '1199887766', 'formulario');
  insert into public.visitors (id, agency_id, codigo_ref, first_seen, last_seen) values
    ('${ID.visitanteA}', '${ID.agenciaA}', 'A7K2', now(), now()),
    ('${ID.visitanteB}', '${ID.agenciaB}', 'B3M9', now(), now());
  insert into public.visitor_events (visitor_id, agency_id, property_id, tipo, scene_id, duracion_ms, sesion_id) values
    ('${ID.visitanteA}', '${ID.agenciaA}', '${ID.pubA}', 'view_property', null, null, '90000000-0000-4000-8000-000000000001'),
    ('${ID.visitanteA}', '${ID.agenciaA}', '${ID.pubA}', 'tour_start', null, null, '90000000-0000-4000-8000-000000000001'),
    ('${ID.visitanteA}', '${ID.agenciaA}', '${ID.pubA}', 'scene_view', '${ID.escenaPubA1}', 40000, '90000000-0000-4000-8000-000000000001'),
    ('${ID.visitanteA}', '${ID.agenciaA}', '${ID.pubA}', 'scene_view', '${ID.escenaPubA2}', 30000, '90000000-0000-4000-8000-000000000001'),
    ('${ID.visitanteB}', '${ID.agenciaB}', '${ID.pubB}', 'view_property', null, null, '90000000-0000-4000-8000-000000000002');
  insert into public.leads (id, agency_id, property_id, visitor_id, codigo_ref, nombre, telefono, origen, score, nivel) values
    ('${ID.leadVisitanteA}', '${ID.agenciaA}', '${ID.pubA}', '${ID.visitanteA}', 'A7K2', 'Carla', '1144556677', 'pedido_visita', 72, 'caliente');
  insert into public.visit_requests (lead_id, property_id, forma_pago, plazo, necesita_vender, franja_preferida) values
    ('${ID.leadVisitanteA}', '${ID.pubA}', 'credito_hipotecario', '1_3_meses', false, 'tarde');
  insert into public.tracked_links (id, agency_id, property_id, codigo, nombre_prospecto, visitor_id) values
    ('${ID.linkA}', '${ID.agenciaA}', '${ID.pubA}', 'k8p2qz', 'Diego', '${ID.visitanteA}');
`;

/** Base en memoria con la réplica de Supabase, todas las migraciones y los datos de prueba. */
export async function crearBase() {
  const db = new PGlite();
  await db.exec(readFileSync(join(ROOT, "tests", "db", "supabase-shim.sql"), "utf8"));
  const dir = join(ROOT, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await db.exec(FIXTURES);
  return db;
}

type Usuario = keyof Pick<typeof ID, "adminA" | "agenteA" | "adminB"> | "anon" | "servicio";

/**
 * Ejecuta `fn` como lo haría la API de Supabase para ese usuario (rol + claims del JWT)
 * dentro de una transacción que siempre se revierte.
 */
export async function como<T>(db: PGlite, usuario: Usuario, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultado: T | undefined;
  await db.transaction(async (tx) => {
    // "servicio" = la clave secreta del servidor (saltea RLS, igual que en Supabase).
    const rol = usuario === "anon" ? "anon" : usuario === "servicio" ? "service_role" : "authenticated";
    const claims = usuario === "anon" || usuario === "servicio" ? { role: rol } : { sub: ID[usuario], role: rol };
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${rol}`);
    resultado = await fn(tx);
    await tx.rollback();
  });
  return resultado as T;
}

/** Cantidad de filas visibles de una consulta. */
export async function contar(tx: Transaction, sql: string, params: unknown[] = []) {
  return (await tx.query(sql, params)).rows.length;
}
