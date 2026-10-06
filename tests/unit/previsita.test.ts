import assert from "node:assert/strict";
import { test } from "node:test";
import { codigoLink, codigoRef, normalizarCodigo } from "../../src/lib/previsita/codigos.ts";
import { Limitador } from "../../src/lib/previsita/limite.ts";
import { TOUR_COMPLETO, tourCompleto } from "../../src/lib/tracking/config.ts";
import { validarLote } from "../../src/lib/tracking/eventos.ts";

const U = "20000000-0000-4000-8000-00000000000a";
const S = "90000000-0000-4000-8000-000000000001";
const AHORA = 1_800_000_000_000;

test("tour completo: 80% de las escenas y 60 s visibles", () => {
  assert.equal(TOUR_COMPLETO.escenasMinimas, 0.8);
  assert.equal(tourCompleto(4, 4, 60), true);
  assert.equal(tourCompleto(3, 4, 300), false);
  assert.equal(tourCompleto(4, 5, 61), true);
  assert.equal(tourCompleto(5, 5, 59), false);
  assert.equal(tourCompleto(0, 0, 999), false);
});

test("lote válido: limpia meta y respeta la hora", () => {
  const r = validarLote(
    {
      eventos: [
        { tipo: "view_property", propertyId: U, sesion: S, t: AHORA - 5000 },
        { tipo: "scene_view", propertyId: U, sceneId: U, duracionMs: 4200, sesion: S, t: AHORA, meta: { escena: "Living" } },
        { tipo: "whatsapp_click", sesion: S, t: AHORA + 10 * 86_400_000 },
      ],
      utm: { source: " instagram ", medium: 3 },
    },
    AHORA,
  )!;
  assert.equal(r.descartados, 0);
  assert.equal(r.lote.eventos.length, 3);
  assert.equal(r.lote.eventos[0].t, AHORA - 5000);
  assert.equal(r.lote.eventos[2].t, AHORA);
  assert.deepEqual(r.lote.utm, { source: "instagram" });
});

test("descarta eventos inválidos sin perder el resto", () => {
  const r = validarLote(
    {
      eventos: [
        { tipo: "inventado", propertyId: U, sesion: S, t: AHORA },
        { tipo: "view_property", sesion: S, t: AHORA },
        { tipo: "scene_view", propertyId: U, sesion: S, t: AHORA },
        { tipo: "plan_view", propertyId: U, planId: "no-uuid", sesion: S, t: AHORA },
        { tipo: "tour_start", propertyId: U, sesion: "x", t: AHORA },
        { tipo: "scene_view", propertyId: U, sceneId: U, duracionMs: -1, sesion: S, t: AHORA },
        { tipo: "photo_view", propertyId: U, sesion: S, t: AHORA, meta: { "<script>": 1 } },
        { tipo: "share", propertyId: U, sesion: S, t: AHORA, meta: { via: { anidado: true } } },
        { tipo: "tour_start", propertyId: U, sesion: S, t: AHORA },
      ],
    },
    AHORA,
  )!;
  assert.equal(r.lote.eventos.length, 1);
  assert.equal(r.descartados, 8);
  assert.equal(validarLote("hola"), null);
  assert.equal(validarLote({ eventos: "no" }), null);
});

test("máximo 50 eventos por lote", () => {
  const eventos = Array.from({ length: 80 }, () => ({ tipo: "photo_view", propertyId: U, sesion: S, t: AHORA }));
  const r = validarLote({ eventos }, AHORA)!;
  assert.equal(r.lote.eventos.length, 50);
  assert.equal(r.descartados, 30);
});

test("códigos cortos sin caracteres ambiguos", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(codigoRef(), /^[A-HJ-NP-Z2-9]{4}$/);
    assert.match(codigoLink(), /^[a-hj-km-np-z0-9]{8}$/);
  }
  assert.equal(normalizarCodigo("ref. a7k2"), "A7K2");
  assert.equal(normalizarCodigo("Ref A7-K2"), "A7K2");
  assert.equal(normalizarCodigo("hola mundo"), null);
});

test("límite de tasa por ventana", () => {
  const l = new Limitador(3, 1000);
  assert.deepEqual([1, 2, 3, 4].map(() => l.permitir("ip", 0)), [true, true, true, false]);
  assert.equal(l.permitir("otra-ip", 0), true);
  assert.equal(l.permitir("ip", 1000), true);
});

test("pedido de visita: venta pide pago y si necesita vender; alquiler no", async () => {
  const { validarPedido } = await import("../../src/lib/previsita/validacion.ts");
  const base = { nombre: "Ana", telefono: "11 2233-4455", plazo: "1_3_meses", franja: "tarde", acepto: true };
  const venta = validarPedido({ ...base, formaPago: "credito_hipotecario", necesitaVender: "no" }, "venta");
  assert.deepEqual(venta.errores, {});
  assert.equal(venta.pedido?.forma_pago, "credito_hipotecario");
  assert.equal(venta.pedido?.necesita_vender, false);

  const incompleto = validarPedido({ ...base }, "venta");
  assert.ok(incompleto.errores.formaPago && incompleto.errores.necesitaVender);
  assert.equal(incompleto.pedido, null);

  const alquiler = validarPedido({ ...base }, "alquiler");
  assert.deepEqual(alquiler.errores, {});
  assert.equal(alquiler.pedido?.forma_pago, null);
  assert.equal(alquiler.pedido?.necesita_vender, null);

  const mal = validarPedido({ nombre: "", telefono: "12", plazo: "ya", franja: "noche", acepto: false }, "alquiler");
  assert.deepEqual(Object.keys(mal.errores).sort(), ["acepto", "franja", "nombre", "plazo", "telefono"]);
});
