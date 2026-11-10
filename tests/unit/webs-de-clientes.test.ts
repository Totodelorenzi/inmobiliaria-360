import assert from "node:assert/strict";
import { test } from "node:test";
import { validarDatos } from "../../src/lib/admin/propiedad.ts";
import { contrastRatio } from "../../src/lib/color.ts";
import { mensajeWhatsapp } from "../../src/lib/format.ts";
import { resumenParaAsesor, type EventoHistorial } from "../../src/lib/previsita/linea-tiempo.ts";
import { leerTema, problemasDeContraste, variablesTema } from "../../src/lib/tema.ts";
import { etapaRecorrido } from "../../src/lib/tracking/avance.ts";

test("tema vacío: queda el sistema base con el color del panel", () => {
  const vars = variablesTema("#1f4e5f", leerTema({}));
  assert.equal(vars["--brand"], "#1f4e5f");
  assert.equal(vars["--fg"], undefined);
  assert.equal(vars["--font-texto"], undefined);
});

test("tema completo: colores, radios y familias válidas", () => {
  const tema = leerTema({
    color: { marca: "#7a2e1f", tinta: "#1b1f24", tintaSuave: "#55606c", fondo: "#fbfaf7", superficie: "#f1eee8", acento: "#e8b04a", estado: { reservada: "#9a5b00" } },
    tipografia: { display: { familia: "Fraunces" }, texto: { familia: "Figtree" } },
    radios: { control: 6, medio: 2 },
  });
  assert.deepEqual(tema.tipografia, { display: "Fraunces", texto: "Figtree" });
  const vars = variablesTema("#000000", tema);
  assert.equal(vars["--brand"], "#7a2e1f", "el color del tema manda sobre el del panel");
  assert.equal(vars["--fg"], "#1b1f24");
  assert.equal(vars["--bg"], "#fbfaf7");
  assert.equal(vars["--radius-control"], "6px");
  assert.equal(vars["--radius-card"], "2px");
  assert.ok(contrastRatio(vars["--accent-fg"], "#e8b04a") >= 4.5, "texto del acento legible");
  assert.equal(vars["--estado-reservada"], "#9a5b00");
  assert.deepEqual(problemasDeContraste(tema), []);
});

test("tema: lo que no cumple contraste o no es válido se ignora", () => {
  const tema = leerTema({
    color: { marca: "rojo", tinta: "#bbbbbb", estado: { vendida: "#f5f5f5" } },
    tipografia: { texto: { familia: "Comic Sans" } },
    radios: { control: 200 },
  });
  assert.equal(tema.color.marca, undefined);
  assert.equal(tema.tipografia.texto, undefined);
  assert.equal(tema.radios.control, undefined);
  const vars = variablesTema("#1f4e5f", tema);
  assert.equal(vars["--fg"], undefined, "tinta clara sobre blanco no pasa AA");
  assert.equal(vars["--estado-vendida"], undefined);
  assert.equal(problemasDeContraste(tema).length, 3);
});

test("mensaje de WhatsApp: asesor, propiedad, recorrido y link", () => {
  const base = { asesor: "Lucía Fernández", tipo: "casa" as const, barrio: "Tolosa", inmobiliaria: "Horizonte", accion: "coordinar una visita", url: "https://x.com/p" };
  assert.equal(mensajeWhatsapp(base), "Hola Lucía, vi la casa en Tolosa en la web de Horizonte. Quiero coordinar una visita. https://x.com/p");
  assert.equal(
    mensajeWhatsapp({ ...base, asesor: null, barrio: null, yaRecorrio: true, tipo: "ph" }),
    "Hola, vi el PH en la web de Horizonte. Ya hice el recorrido virtual. Quiero coordinar una visita. https://x.com/p",
  );
});

test("etapa del recorrido para el CTA de la ficha", () => {
  assert.equal(etapaRecorrido(null), "sin_empezar");
  assert.equal(etapaRecorrido({ vistas: 0, total: 5, completo: false }), "sin_empezar");
  assert.equal(etapaRecorrido({ vistas: 2, total: 5, completo: false }), "en_curso");
  assert.equal(etapaRecorrido({ vistas: 4, total: 5, completo: false }), "completo", "80 % de los ambientes");
  assert.equal(etapaRecorrido({ vistas: 1, total: 5, completo: true }), "completo", "lo marcó el visor");
});

const ev = (tipo: EventoHistorial["tipo"], extra: Partial<EventoHistorial> = {}): EventoHistorial => ({
  tipo,
  created_at: "2026-11-01T10:00:00Z",
  sesion_id: "s1",
  duracion_ms: null,
  propiedad: "Casa",
  escena: null,
  plano: null,
  meta: {},
  ...extra,
});

test("resumen para el asesor: solo con lo registrado", () => {
  const eventos = [
    ev("view_property"),
    ev("tour_start", { meta: { origen: "cartel" } }),
    ev("scene_view", { escena: "Living", duracion_ms: 60_000 }),
    ev("scene_view", { escena: "Cocina", duracion_ms: 150_000 }),
    ev("scene_view", { escena: "Patio", duracion_ms: 90_000, sesion_id: "s2" }),
    ev("tour_complete"),
    ev("plan_view", { plano: "Planta baja", duracion_ms: 5000 }),
  ];
  assert.equal(
    resumenParaAsesor(eventos, { totalAmbientes: 4 }),
    "Recorrido (completo): 3 de 4 ambientes en 5 min, volvió 1 vez; donde más se quedó: cocina y patio. Abrió el plano. Llegó desde el QR del cartel.",
  );
  assert.equal(resumenParaAsesor([ev("view_property"), ev("tour_start")]), "Abrió el recorrido, sin detalle por ambiente.");
  assert.equal(resumenParaAsesor([]), "");
});

test("datos de la propiedad: estado comercial y asesor", () => {
  const ok = validarDatos({ estado_comercial: "reservada", asesor_id: "" });
  assert.deepEqual(ok.cambios, { estado_comercial: "reservada", asesor_id: null });
  const mal = validarDatos({ estado_comercial: "regalada", asesor_id: "lucia" });
  assert.ok(mal.errores.estado_comercial);
  assert.ok(mal.errores.asesor_id);
});
