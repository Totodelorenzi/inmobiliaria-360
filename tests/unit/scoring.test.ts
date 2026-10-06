import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularPuntaje, PESOS, resumenPuntaje, resumirEventos, UMBRALES, type EventoPuntaje } from "../../src/lib/scoring.ts";

const P = "20000000-0000-4000-8000-00000000000a";
const P2 = "20000000-0000-4000-8000-00000000000b";
const ev = (tipo: EventoPuntaje["tipo"], extra: Partial<EventoPuntaje> = {}): EventoPuntaje => ({
  tipo,
  property_id: P,
  plan_id: null,
  duracion_ms: null,
  sesion_id: "s1",
  ...extra,
});

test("resume visitas como sesiones distintas en una misma propiedad", () => {
  const r = resumirEventos([
    ev("view_property", { sesion_id: "s1" }),
    ev("view_property", { sesion_id: "s2" }),
    ev("view_property", { sesion_id: "s2" }),
    ev("view_property", { sesion_id: "s3", property_id: P2 }),
    ev("form_submit", { sesion_id: null }),
  ]);
  assert.equal(r.visitas, 2);
  assert.equal(r.propiedades, 2);
  assert.equal(r.formulario, true);
});

test("suma el tiempo visible de escenas y planos", () => {
  const r = resumirEventos([
    ev("tour_start"),
    ev("scene_view", { duracion_ms: 90_000 }),
    ev("scene_view", { duracion_ms: 45_000 }),
    ev("plan_view", { plan_id: "pl1", duracion_ms: 45_000 }),
    ev("plan_view", { plan_id: "pl1", duracion_ms: 1_000 }),
  ]);
  assert.equal(r.segundos, 181);
  assert.equal(r.planos, 1);
  assert.equal(r.toursIniciados, 1);
});

test("alguien que solo miró la ficha es frío", () => {
  const p = calcularPuntaje(resumirEventos([ev("view_property"), ev("photo_view"), ev("photo_view")]));
  assert.equal(p.nivel, "frio");
  assert.equal(p.score, 1);
  assert.deepEqual(p.detalle.map((d) => d.texto), ["Vio 2 fotos"]);
});

test("tour completo, planos y dos visitas sin pedir visita: tibio", () => {
  const p = calcularPuntaje(
    resumirEventos([
      ev("tour_start", { sesion_id: "s1" }),
      ev("scene_view", { duracion_ms: 150_000, sesion_id: "s1" }),
      ev("tour_complete", { sesion_id: "s1" }),
      ev("plan_view", { plan_id: "pl1", duracion_ms: 30_000, sesion_id: "s2" }),
    ]),
  );
  assert.equal(p.nivel, "tibio");
  assert.equal(p.score, PESOS.tourIniciado + PESOS.tourCompleto + 3 * PESOS.porMinuto + PESOS.vioPlanos + PESOS.porVisitaExtra);
});

test("pidió visita con crédito y plazo corto: caliente, con el porqué", () => {
  const eventos = [
    ev("tour_start"),
    ev("scene_view", { duracion_ms: 240_000 }),
    ev("tour_complete"),
    ev("view_property", { sesion_id: "s2" }),
    ev("visit_request", { sesion_id: null }),
  ];
  const p = calcularPuntaje(resumirEventos(eventos), { forma_pago: "credito_hipotecario", plazo: "1_3_meses", necesita_vender: false });
  assert.equal(p.nivel, "caliente");
  assert.ok(p.score >= UMBRALES.caliente);
  const textos = p.detalle.map((d) => d.texto);
  for (const t of ["Terminó el tour 360°", "2 visitas", "Crédito hipotecario", "Plazo de 1 a 3 meses", "Pidió visita presencial"]) {
    assert.ok(textos.includes(t), t);
  }
  assert.equal(resumenPuntaje(p.detalle, 2), "Terminó el tour 360°, Pidió visita presencial");
});

test("el puntaje nunca pasa de 100 y respeta los topes", () => {
  const muchos = Array.from({ length: 40 }, (_, i) => ev("view_property", { sesion_id: `s${i}` }));
  const p = calcularPuntaje(
    resumirEventos([
      ...muchos,
      ...Array.from({ length: 100 }, () => ev("photo_view")),
      ev("tour_start"),
      ev("scene_view", { duracion_ms: 3_600_000 }),
      ev("tour_complete"),
      ev("plan_view", { plan_id: "a", duracion_ms: 1 }),
      ...Array.from({ length: 20 }, () => ev("plan_point_click", { plan_id: "a" })),
      ev("visit_request"),
      ev("form_submit"),
      ev("whatsapp_click"),
      ev("share"),
    ]),
    { forma_pago: "contado", plazo: "inmediato", necesita_vender: false },
    { linkAbierto: true },
  );
  assert.equal(p.score, 100);
  const de = (clave: string) => p.detalle.find((d) => d.clave === clave)?.puntos;
  assert.equal(de("visitas"), PESOS.maxVisitasExtra);
  assert.equal(de("fotos"), PESOS.maxFotos);
  assert.equal(de("tiempo"), PESOS.maxMinutos);
  assert.equal(de("puntos"), PESOS.maxPuntosPlano);
});

test("sin actividad: 0 puntos, frío y sin desglose", () => {
  assert.deepEqual(calcularPuntaje(resumirEventos([])), { score: 0, nivel: "frio", detalle: [] });
});
