import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { crearBase } from "./setup.ts";

const DEMO = "a9c0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0c11";
const SQL = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "demo", "actualizar-fechas.sql"), "utf8");

test("actualizar-fechas corre la actividad de ejemplo de la demo al presente y no toca lo demás", async () => {
  const db = await crearBase();
  await db.exec(`
    insert into agencies (id, nombre, subdominio) values ('${DEMO}', 'Demo', 'horizonte');
    insert into properties (id, agency_id, titulo, slug, operacion, tipo, publicada, es_demo)
      values ('aaaaaaaa-0000-4000-8000-000000000001', '${DEMO}', 'Casa', 'casa', 'venta', 'casa', true, true);
    insert into visitors (id, agency_id, codigo_ref, es_demo, first_seen, last_seen)
      values ('bbbbbbbb-0000-4000-8000-000000000001', '${DEMO}', 'AB12', true, now() - interval '30 days', now() - interval '20 days'),
             ('bbbbbbbb-0000-4000-8000-000000000002', '${DEMO}', 'CD34', false, now() - interval '30 days', now() - interval '20 days');
    insert into visitor_events (visitor_id, agency_id, property_id, tipo, created_at)
      values ('bbbbbbbb-0000-4000-8000-000000000001', '${DEMO}', 'aaaaaaaa-0000-4000-8000-000000000001', 'view_property', now() - interval '20 days'),
             ('bbbbbbbb-0000-4000-8000-000000000002', '${DEMO}', 'aaaaaaaa-0000-4000-8000-000000000001', 'view_property', now() - interval '25 days');
    insert into leads (id, agency_id, property_id, visitor_id, codigo_ref, origen, es_demo, nombre, telefono, created_at, ultima_actividad)
      values ('cccccccc-0000-4000-8000-000000000001', '${DEMO}', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'AB12', 'formulario', true, 'Ana', '1100001111', now() - interval '21 days', now() - interval '20 days'),
             ('cccccccc-0000-4000-8000-000000000002', '${DEMO}', 'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'CD34', 'formulario', false, 'Real', '1100002222', now() - interval '21 days', now() - interval '20 days');
  `);
  await db.exec(SQL);
  const { rows } = await db.query<{ id: string; dias: number }>(
    "select id::text, round(extract(epoch from now() - ultima_actividad) / 86400) as dias from leads where agency_id = $1 order by id",
    [DEMO],
  );
  assert.deepEqual(rows.map((r) => [r.id.slice(-1), Number(r.dias)]), [["1", 0], ["2", 20]]);
  const evento = await db.query<{ horas: number }>(
    "select round(extract(epoch from now() - max(created_at)) / 3600) as horas from visitor_events where visitor_id = 'bbbbbbbb-0000-4000-8000-000000000001'",
  );
  assert.equal(Number(evento.rows[0].horas), 2);
  // Lo que no es de ejemplo (aunque sea de la demo) queda como estaba.
  const real = await db.query<{ dias: number }>(
    "select round(extract(epoch from now() - created_at) / 86400) as dias from visitor_events where visitor_id = 'bbbbbbbb-0000-4000-8000-000000000002'",
  );
  assert.equal(Number(real.rows[0].dias), 25);
  // Idempotente: una segunda pasada no corre nada.
  await db.exec(SQL);
  const otra = await db.query<{ horas: number }>("select round(extract(epoch from now() - max(created_at)) / 3600) as horas from visitor_events where visitor_id = 'bbbbbbbb-0000-4000-8000-000000000001'");
  assert.equal(Number(otra.rows[0].horas), 2);
});
