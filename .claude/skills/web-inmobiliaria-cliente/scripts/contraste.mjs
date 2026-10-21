#!/usr/bin/env node
// Verifica contraste WCAG 2.x.
//
// Uso:
//   node contraste.mjs "#1B1F24" "#FFFFFF"     -> contraste entre dos colores
//   node contraste.mjs ruta/al/tema.json       -> revisa los pares clave del tema
//
// Umbrales: 4.5 para texto normal; 3 para texto grande, íconos y bordes de controles.
// En PowerShell, poné los colores entre comillas: el # sin comillas inicia un comentario.
// Con un tema, sale con código 1 si algún par no llega a su umbral.

import { readFileSync } from 'node:fs';

function hexARgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Color inválido: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminancia([r, g, b]) {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contraste(a, b) {
  const la = luminancia(hexARgb(a));
  const lb = luminancia(hexARgb(b));
  const [alta, baja] = la >= lb ? [la, lb] : [lb, la];
  return (alta + 0.05) / (baja + 0.05);
}

function nivel(ratio) {
  if (ratio >= 7) return 'AAA texto';
  if (ratio >= 4.5) return 'AA texto';
  if (ratio >= 3) return 'solo texto grande o UI';
  return 'no pasa';
}

function revisarTema(ruta) {
  const tema = JSON.parse(readFileSync(ruta, 'utf8'));
  const c = tema.color ?? {};
  const pares = [
    ['tinta sobre fondo', c.tinta, c.fondo, 4.5],
    ['tintaSuave sobre fondo', c.tintaSuave, c.fondo, 4.5],
    ['tinta sobre superficie', c.tinta, c.superficie, 4.5],
    ['tintaSuave sobre superficie', c.tintaSuave, c.superficie, 4.5],
    ['marcaContraste sobre marca (botón)', c.marcaContraste, c.marca, 4.5],
    ['marca sobre fondo (acentos y UI)', c.marca, c.fondo, 3],
    ['foco sobre fondo', c.foco, c.fondo, 3],
  ];
  // Aviso, no falla: los bordes de controles (campos, botones con contorno) necesitan 3:1;
  // las divisiones decorativas no.
  const avisos = [['borde sobre fondo', c.borde, c.fondo, 3]];
  for (const [nombre, valor] of Object.entries(c.estado ?? {})) {
    pares.push([`estado.${nombre} sobre fondo`, valor, c.fondo, 3]);
  }

  let fallas = 0;
  for (const [nombre, primerPlano, fondo, minimo] of pares) {
    if (!primerPlano || !fondo) {
      console.log(`-  ${nombre}: falta un color en el tema`);
      continue;
    }
    const ratio = contraste(primerPlano, fondo);
    const ok = ratio >= minimo;
    if (!ok) fallas += 1;
    console.log(
      `${ok ? 'OK' : 'X '} ${nombre}: ${ratio.toFixed(2)}:1 (mínimo ${minimo}:1, ${nivel(ratio)})`
    );
  }
  for (const [nombre, primerPlano, fondo, minimo] of avisos) {
    if (!primerPlano || !fondo) continue;
    const ratio = contraste(primerPlano, fondo);
    if (ratio < minimo) {
      console.log(
        `!  ${nombre}: ${ratio.toFixed(2)}:1. Sirve para divisiones; los bordes de campos y botones con contorno necesitan ${minimo}:1.`
      );
    }
  }
  console.log(
    'Si un badge usa texto blanco sobre el color de estado, verificalo con: node contraste.mjs "#FFFFFF" "#color"'
  );
  console.log(fallas ? `\n${fallas} par(es) no llegan al mínimo.` : '\nTodos los pares pasan.');
  process.exit(fallas ? 1 : 0);
}

const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0].toLowerCase().endsWith('.json')) {
    revisarTema(args[0]);
  } else if (args.length === 2) {
    const ratio = contraste(args[0], args[1]);
    console.log(`${ratio.toFixed(2)}:1 (${nivel(ratio)})`);
  } else {
    console.log('Uso: node contraste.mjs "#hex1" "#hex2"  |  node contraste.mjs tema.json');
    process.exit(2);
  }
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
