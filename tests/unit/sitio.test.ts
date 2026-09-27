import assert from "node:assert/strict";
import { test } from "node:test";
import { contarFiltros, filtrosAQuery, parseFiltros } from "../../src/lib/filtros.ts";
import {
  badgeObra,
  formatExpensas,
  formatPrecio,
  formatUbicacion,
  normalizarBusqueda,
  whatsappLink,
} from "../../src/lib/format.ts";
import { distanciaM, RADIO_ZONA_M, ubicacionPublica } from "../../src/lib/geo.ts";

test("precios con formato argentino", () => {
  assert.equal(formatPrecio(95000, "USD", "venta"), "USD 95.000");
  assert.equal(formatPrecio(450000, "ARS", "alquiler"), "$ 450.000/mes");
  assert.equal(formatPrecio(null, "USD", "venta"), "Consultar precio");
  assert.equal(formatExpensas(80000), "$ 80.000");
  assert.equal(formatExpensas(null), null);
});

test("badge de obra", () => {
  assert.equal(badgeObra("terminada", null), null);
  assert.equal(badgeObra("en_pozo", "2027-03-01"), "En pozo");
  assert.equal(badgeObra("en_construccion", "2027-03-01"), "En construcción, entrega marzo de 2027");
  assert.equal(badgeObra("en_construccion", null), "En construcción");
});

test("la dirección oculta muestra solo barrio y ciudad", () => {
  const p = { direccion: "Cuba 3100", barrio: "Núñez", ciudad: "CABA" };
  assert.equal(formatUbicacion({ ...p, mostrar_direccion_exacta: true }), "Cuba 3100, Núñez, CABA");
  assert.equal(formatUbicacion({ ...p, mostrar_direccion_exacta: false }), "Núñez, CABA");
});

test("búsqueda normalizada igual que la base", () => {
  assert.equal(normalizarBusqueda("  NÚÑEZ, (Belgrano) %_ "), "nunez belgrano");
});

test("link de WhatsApp con mensaje", () => {
  assert.equal(whatsappLink("+54 9 11 2233-4455", "Hola ¿qué tal?"), "https://wa.me/5491122334455?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
});

test("filtros: lee la URL ignorando basura y vuelve a armarla corta", () => {
  const f = parseFiltros(
    { tipo: "casa", ambientes: "9", desde: "abc", hasta: "200000", tour: "1", orden: "precio_asc", pagina: "2", obra: "xx" },
    "venta",
  );
  assert.equal(f.tipo, "casa");
  assert.equal(f.ambientes, undefined);
  assert.equal(f.desde, undefined);
  assert.equal(f.hasta, 200000);
  assert.equal(f.moneda, "USD");
  assert.equal(f.obra, undefined);
  assert.equal(contarFiltros(f), 3);
  assert.equal(filtrosAQuery(f, "venta"), "?tipo=casa&hasta=200000&tour=1&orden=precio_asc&pagina=2");
  assert.equal(filtrosAQuery(f, "venta", { pagina: 1 }), "?tipo=casa&hasta=200000&tour=1&orden=precio_asc");
  assert.equal(parseFiltros({}, "alquiler").moneda, "ARS");
  assert.equal(parseFiltros({ obra: "terminada" }, "emprendimientos").obra, undefined);
});

test("ubicación aproximada: estable, redondeada y dentro del círculo", () => {
  const exacta = ubicacionPublica("abc", -34.55, -58.46, true);
  assert.deepEqual(exacta, { lat: -34.55, lng: -58.46, exacta: true });

  const a = ubicacionPublica("prop-1", -34.5512345, -58.4612345, false)!;
  const b = ubicacionPublica("prop-1", -34.5512345, -58.4612345, false)!;
  assert.deepEqual(a, b);
  assert.equal(a.exacta, false);
  const d = distanciaM(a, { lat: -34.5512345, lng: -58.4612345 });
  assert.ok(d > 100 && d < RADIO_ZONA_M - 100, `distancia ${d}`);
  assert.equal(ubicacionPublica("x", null, -58, false), null);
});

test("consulta: valida nombre, contacto y email con mensajes claros", async () => {
  const { validarConsulta } = await import("../../src/lib/consulta.ts");
  const base = {
    agencyId: "10000000-0000-4000-8000-00000000000a",
    propertyId: "20000000-0000-4000-8000-00000000000a",
    nombre: "Ana",
    telefono: "11 2233-4455",
    email: "",
    mensaje: "Hola",
  };
  assert.equal(validarConsulta(base), null);
  assert.match(validarConsulta({ ...base, nombre: "" })!.nombre!, /nombre/);
  assert.match(validarConsulta({ ...base, telefono: "" })!.contacto!, /teléfono o un email/);
  assert.match(validarConsulta({ ...base, telefono: "12" })!.contacto!, /entre 6 y 15/);
  assert.match(validarConsulta({ ...base, email: "ana@" })!.email!, /email/);
  assert.ok(validarConsulta({ ...base, agencyId: "x" })!.general);
  assert.equal(validarConsulta({ ...base, telefono: "", email: "ana@mail.com" }), null);
});
