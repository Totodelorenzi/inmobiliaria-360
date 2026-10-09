import assert from "node:assert/strict";
import { test } from "node:test";
import {
  esClaveValida,
  normalizarDominio,
  resolverHost,
  urlDelPanel,
  urlEnSitio,
  validarSubdominio,
  type Entorno,
} from "../../src/lib/tenancy.ts";

const conDominio: Entorno = { dominioBase: "inmo360.com.ar", vercelEnv: "production" };
const sinDominio: Entorno = { dominioBase: null, vercelEnv: "production" };

test("con dominio base: panel, subdominios, raíz y dominios propios", () => {
  assert.deepEqual(resolverHost("app.inmo360.com.ar", conDominio), { tipo: "panel" });
  assert.deepEqual(resolverHost("umbral.inmo360.com.ar", conDominio), { tipo: "sitio", clave: "umbral", prueba: false });
  assert.deepEqual(resolverHost("UMBRAL.inmo360.com.ar.", conDominio), { tipo: "sitio", clave: "umbral", prueba: false });
  assert.deepEqual(resolverHost("inmo360.com.ar", conDominio), { tipo: "plataforma", prueba: false });
  assert.deepEqual(resolverHost("www.inmo360.com.ar", conDominio), { tipo: "plataforma", prueba: false });
  // Subdominio inválido o de dos niveles: no es ninguna inmobiliaria.
  assert.deepEqual(resolverHost("a.b.inmo360.com.ar", conDominio), { tipo: "plataforma", prueba: false });
  assert.deepEqual(resolverHost("www.umbralpropiedades.com.ar", conDominio), { tipo: "sitio", clave: "umbralpropiedades.com.ar", prueba: false });
});

test("la inmobiliaria elegida con ?agencia= solo cuenta en hosts de prueba", () => {
  assert.deepEqual(resolverHost("localhost:3000", sinDominio, "horizonte"), { tipo: "sitio", clave: "horizonte", prueba: true });
  assert.deepEqual(resolverHost("localhost:3000", sinDominio), { tipo: "plataforma", prueba: true });
  assert.deepEqual(resolverHost("x-git-main.vercel.app", { dominioBase: "inmo360.com.ar", vercelEnv: "preview" }, "horizonte"), {
    tipo: "sitio",
    clave: "horizonte",
    prueba: true,
  });
  // Producción sin dominio real: el *.vercel.app sigue siendo de prueba.
  assert.equal(resolverHost("inmo.vercel.app", sinDominio, "horizonte").tipo, "sitio");
  // Producción con dominio real: el parámetro se ignora en todos lados.
  assert.deepEqual(resolverHost("inmo.vercel.app", conDominio, "horizonte"), { tipo: "plataforma", prueba: false });
  assert.deepEqual(resolverHost("umbral.inmo360.com.ar", conDominio, "horizonte"), { tipo: "sitio", clave: "umbral", prueba: false });
  // Un valor inválido no elige nada.
  assert.equal(resolverHost("localhost", sinDominio, "../x").tipo, "plataforma");
});

test("validación de subdominios y dominios", () => {
  assert.equal(validarSubdominio("umbral-propiedades"), null);
  for (const malo of ["ab", "app", "Mayus", "-x", "x-", "a--b", "con espacio", "ñandu"]) assert.notEqual(validarSubdominio(malo), null, malo);
  assert.equal(normalizarDominio(" https://WWW.Umbral.com.ar/contacto?x=1 "), "umbral.com.ar");
  assert.equal(normalizarDominio("umbral.com.ar:443"), "umbral.com.ar");
  assert.ok(esClaveValida("umbral"));
  assert.ok(esClaveValida("umbral.com.ar"));
  assert.ok(!esClaveValida("../etc"));
});

test("direcciones de la web de cada inmobiliaria y del panel", () => {
  const umbral = { subdominio: "umbral", dominio_propio: null };
  assert.equal(urlEnSitio(umbral, "/propiedad/x", conDominio), "https://umbral.inmo360.com.ar/propiedad/x");
  assert.equal(urlEnSitio({ ...umbral, dominio_propio: "umbral.com.ar" }, "/", conDominio), "https://umbral.com.ar/");
  assert.match(urlEnSitio(umbral, "/v/abc123", sinDominio), /\/v\/abc123\?agencia=umbral$/);
  assert.equal(urlEnSitio(umbral, "/", { dominioBase: "prueba.localhost:3100" }), "http://umbral.prueba.localhost:3100/");
  assert.equal(urlDelPanel(conDominio), "https://app.inmo360.com.ar");
});
