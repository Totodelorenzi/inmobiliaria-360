import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENCIA_DEMO_ID } from "../../scripts/seed/datos.ts";
import {
  borrarAgenciaDePrueba,
  borrarUsuarioDePrueba,
  copiarDemo,
  crearAgenciaDePrueba,
  ProteccionError,
  verificarAgenciaDePrueba,
  verificarUsuarioDePrueba,
} from "../e2e/proteccion.ts";

const PRUEBA = { id: "11111111-1111-4111-8111-111111111111", es_test: true, subdominio: "e2e-abc123" };

test("solo acepta inmobiliarias marcadas como de prueba, nunca la demo", () => {
  assert.doesNotThrow(() => verificarAgenciaDePrueba(PRUEBA, PRUEBA.id));
  assert.throws(() => verificarAgenciaDePrueba(null, "x"), ProteccionError);
  assert.throws(() => verificarAgenciaDePrueba({ ...PRUEBA, es_test: false }, PRUEBA.id), ProteccionError);
  assert.throws(() => verificarAgenciaDePrueba({ ...PRUEBA, subdominio: "umbral" }, PRUEBA.id), ProteccionError);
  assert.throws(() => verificarAgenciaDePrueba({ ...PRUEBA, id: AGENCIA_DEMO_ID }, AGENCIA_DEMO_ID), ProteccionError);
});

test("solo borra usuarios creados por los tests", () => {
  assert.doesNotThrow(() => verificarUsuarioDePrueba("e2e-admin-abc123@example.com"));
  for (const email of ["duenio@umbral.com.ar", "e2e-admin@gmail.com", undefined]) {
    assert.throws(() => verificarUsuarioDePrueba(email), ProteccionError, String(email));
  }
});

/** Base falsa: devuelve `agencia` al consultar y anota cualquier escritura o borrado. */
function baseFalsa(agencia: unknown, usuario?: { email: string }) {
  const escrituras: string[] = [];
  const consulta = (tabla: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: agencia, error: null }),
      delete: () => (escrituras.push(`delete ${tabla}`), q),
      insert: () => (escrituras.push(`insert ${tabla}`), q),
      update: () => (escrituras.push(`update ${tabla}`), q),
      single: async () => ({ data: { id: "nueva" }, error: null }),
    };
    return q;
  };
  const db = {
    from: consulta,
    storage: { from: () => ({ list: async () => (escrituras.push("list storage"), { data: [] }), remove: async () => escrituras.push("remove storage") }) },
    auth: { admin: { getUserById: async () => ({ data: { user: usuario ?? null } }), deleteUser: async () => escrituras.push("delete user") } },
  };
  return { db: db as never, escrituras };
}

test("la limpieza aborta sin tocar nada si la inmobiliaria no es de prueba", async () => {
  for (const agencia of [{ ...PRUEBA, es_test: false, subdominio: "umbral" }, { ...PRUEBA, id: AGENCIA_DEMO_ID }, null]) {
    const { db, escrituras } = baseFalsa(agencia);
    await assert.rejects(borrarAgenciaDePrueba(db, PRUEBA.id), ProteccionError);
    await assert.rejects(copiarDemo(db, PRUEBA.id), ProteccionError);
    assert.deepEqual(escrituras, []);
  }
  const { db, escrituras } = baseFalsa(PRUEBA);
  await borrarAgenciaDePrueba(db, PRUEBA.id);
  assert.ok(escrituras.includes("delete agencies"));
});

test("no crea inmobiliarias de prueba fuera del prefijo ni borra usuarios reales", async () => {
  const { db, escrituras } = baseFalsa(null, { email: "duenio@umbral.com.ar" });
  await assert.rejects(crearAgenciaDePrueba(db, "umbral", "Umbral"), ProteccionError);
  await assert.rejects(borrarUsuarioDePrueba(db, "u1"), ProteccionError);
  assert.deepEqual(escrituras, []);
});
