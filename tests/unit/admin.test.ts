import assert from "node:assert/strict";
import { test } from "node:test";
import {
  esPanoramica,
  numero,
  requisitosPublicacion,
  slugDisponible,
  slugify,
  TITULO_BORRADOR,
  validarDatos,
} from "../../src/lib/admin/propiedad.ts";

test("slug a partir del título", () => {
  assert.equal(slugify("Depto 3 amb. en Núñez con balcón!"), "depto-3-amb-en-nunez-con-balcon");
  assert.equal(slugify("   "), "propiedad");
  assert.equal(slugDisponible("casa", ["casa", "casa-2"]), "casa-3");
  assert.equal(slugDisponible("ph", []), "ph");
});

test("números escritos a la argentina", () => {
  assert.equal(numero("95.000"), 95000);
  assert.equal(numero("1.234.567"), 1234567);
  assert.equal(numero("65,5"), 65.5);
  assert.equal(numero(""), null);
  assert.equal(numero("abc"), undefined);
});

test("validación de datos: convierte y da mensajes claros", () => {
  const { cambios, errores } = validarDatos({
    titulo: "  Casa con jardín  ",
    operacion: "venta",
    tipo: "casa",
    precio: "180.000",
    ambientes: "4",
    fecha_entrega: "2027-03",
    apto_credito: "on",
    amenities: "Pileta, Parrilla\nPileta",
    superficie_total: "100",
    superficie_cubierta: "120",
  });
  assert.equal(cambios.titulo, "Casa con jardín");
  assert.equal(cambios.precio, 180000);
  assert.equal(cambios.ambientes, 4);
  assert.equal(cambios.fecha_entrega, "2027-03-01");
  assert.equal(cambios.apto_credito, true);
  assert.deepEqual(cambios.amenities, ["Pileta", "Parrilla"]);
  assert.match(errores.superficie_cubierta!, /no puede ser mayor/);

  const mal = validarDatos({ titulo: "a", operacion: "permuta", precio: "mucho", avance_obra_pct: "150" });
  assert.ok(mal.errores.titulo && mal.errores.operacion && mal.errores.precio && mal.errores.avance_obra_pct);
  assert.deepEqual(mal.cambios, {});
});

test("solo valida los campos que llegan (autoguardado parcial)", () => {
  const { cambios, errores } = validarDatos({ barrio: " Palermo " });
  assert.deepEqual(cambios, { barrio: "Palermo" });
  assert.deepEqual(errores, {});
  assert.deepEqual(validarDatos({ precio: "" }).cambios, { precio: null });
});

test("checklist de publicación", () => {
  const base = {
    titulo: "Casa",
    precio: null,
    barrio: "Palermo",
    ciudad: null,
    descripcion: null,
    lat: null,
    estado_obra: "terminada" as const,
    fecha_entrega: null,
    fotos: 1,
    escenas: 0,
    planos: 0,
  };
  const obligatoriosOk = (r: ReturnType<typeof requisitosPublicacion>) => r.filter((x) => x.obligatorio).every((x) => x.ok);
  assert.equal(obligatoriosOk(requisitosPublicacion(base)), true);
  assert.equal(obligatoriosOk(requisitosPublicacion({ ...base, fotos: 0 })), false);
  assert.equal(obligatoriosOk(requisitosPublicacion({ ...base, titulo: TITULO_BORRADOR })), false);
});

test("panorámica 2:1", () => {
  assert.equal(esPanoramica(6000, 3000), true);
  assert.equal(esPanoramica(4032, 2016), true);
  assert.equal(esPanoramica(4000, 3000), false);
});
