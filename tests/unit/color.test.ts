import assert from "node:assert/strict";
import { test } from "node:test";
import { brandStyle, contrastRatio, DEFAULT_BRAND, normalizeHex } from "../../src/lib/color.ts";

type BrandVars = Record<"--brand" | "--brand-fg" | "--brand-ink", string>;
const vars = (color: string | null) => brandStyle(color) as unknown as BrandVars;

test("normalizeHex acepta #rgb y #rrggbb, rechaza lo demás", () => {
  assert.equal(normalizeHex("#ABC"), "#aabbcc");
  assert.equal(normalizeHex(" 1f3a5f "), "#1f3a5f");
  assert.equal(normalizeHex("azul"), null);
  assert.equal(normalizeHex(null), null);
});

test("color inválido o vacío usa el color por defecto", () => {
  assert.equal(vars(null)["--brand"], DEFAULT_BRAND);
  assert.equal(vars("rojo")["--brand"], DEFAULT_BRAND);
});

test("el texto sobre el color principal y el color de texto cumplen AA", () => {
  // #7b7b7b y #e63946 son tonos medios donde ni blanco ni negro llegan a 4.5 sin ajustar.
  for (const color of ["#1f3a5f", "#ffc83d", "#ffffff", "#e63946", "#2a9d8f", "#7b7b7b", "#000000"]) {
    const v = vars(color);
    assert.ok(contrastRatio(v["--brand"], v["--brand-fg"]) >= 4.5, color);
    assert.ok(contrastRatio(v["--brand-ink"], "#ffffff") >= 4.5, `${color} ink`);
  }
});

test("fondo oscuro lleva texto blanco; fondo claro, texto oscuro", () => {
  assert.equal(vars("#1f3a5f")["--brand-fg"], "#ffffff");
  assert.equal(vars("#ffc83d")["--brand-fg"], "#14161a");
});
