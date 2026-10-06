import assert from "node:assert/strict";
import { test } from "node:test";
import { generarActividad, type PropiedadCreada } from "../../scripts/seed/actividad.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PROPIEDADES: PropiedadCreada[] = [
  { id: id(1), titulo: "Luminoso 3 ambientes", operacion: "alquiler", fotos: 5, escenas: [1, 2, 3, 4].map((n) => ({ id: id(10 + n), nombre: `E${n}` })), planos: [] },
  { id: id(2), titulo: "Monoambiente", operacion: "alquiler", fotos: 3, escenas: [], planos: [] },
  { id: id(3), titulo: "Casa en Olivos", operacion: "alquiler", fotos: 3, escenas: [], planos: [] },
  { id: id(4), titulo: "Casa con galería", operacion: "venta", fotos: 5, escenas: [5, 6, 7, 8].map((n) => ({ id: id(10 + n), nombre: `E${n}` })), planos: [] },
  { id: id(5), titulo: "Alto Caballito", operacion: "venta", fotos: 1, escenas: [], planos: [{ id: id(30), nombre: "Unidad", puntos: ["Living", "Cocina", "Baño"] }, { id: id(31), nombre: "Terraza", puntos: ["Pileta"] }] },
  { id: id(6), titulo: "Torre Parque Chas: en construcción", operacion: "venta", fotos: 3, escenas: [], planos: [] },
];
const AHORA = Date.parse("2026-10-06T15:00:00Z");

test("seed de actividad: ~15 leads de los tres niveles, pedidos de visita y 2 links", () => {
  const f = generarActividad(id(99), PROPIEDADES, AHORA);
  assert.equal(f.leads.length, 15);
  const niveles = Object.groupBy(f.leads, (l) => l.nivel ?? "frio");
  assert.ok((niveles.caliente?.length ?? 0) >= 3, `calientes: ${niveles.caliente?.length}`);
  assert.ok((niveles.tibio?.length ?? 0) >= 3, `tibios: ${niveles.tibio?.length}`);
  assert.ok((niveles.frio?.length ?? 0) >= 4, `fríos: ${niveles.frio?.length}`);
  assert.equal(f.links.length, 2);
  assert.ok(f.pedidos.length >= 4);
  assert.ok(f.visitantes.length >= 55);
  assert.ok(f.eventos.length > 200);
});

test("seed de actividad: todo demo, en las últimas 3 semanas y consistente", () => {
  const f = generarActividad(id(99), PROPIEDADES, AHORA);
  assert.ok([...f.visitantes, ...f.leads, ...f.links].every((x) => x.es_demo));
  const tresSemanas = AHORA - 22 * 86_400_000;
  assert.ok(f.eventos.every((e) => Date.parse(e.created_at!) >= tresSemanas && Date.parse(e.created_at!) <= AHORA + 86_400_000));
  const visitantes = new Set(f.visitantes.map((v) => v.id));
  assert.ok(f.eventos.every((e) => visitantes.has(e.visitor_id)));
  assert.ok(f.leads.every((l) => !l.visitor_id || visitantes.has(l.visitor_id)));
  assert.equal(new Set(f.visitantes.map((v) => v.codigo_ref)).size, f.visitantes.length);
  // El link que no se abrió no tiene actividad ni puntaje.
  const sinAbrir = f.leads.find((l) => l.nombre === "Nicolás Álvarez")!;
  assert.equal(sinAbrir.score, 0);
  assert.equal(f.visitantes.find((v) => v.id === sinAbrir.visitor_id)?.first_seen, null);
});
