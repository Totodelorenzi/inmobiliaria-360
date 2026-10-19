import { randomInt } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ENV_LOCAL = new URL("../../.env.local", import.meta.url);

/** 20 caracteres sin ambiguos (0/O, 1/l), siempre con letras y números. */
export function generarClave() {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const todos = letras + numeros;
  const chars = [letras[randomInt(letras.length)], numeros[randomInt(numeros.length)]];
  while (chars.length < 20) chars.push(todos[randomInt(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Guarda (o reemplaza) una variable en .env.local. */
export async function guardarEnEnvLocal(nombre: string, valor: string) {
  const actual = await readFile(ENV_LOCAL, "utf8");
  const linea = `${nombre}=${valor}`;
  const regex = new RegExp(`^${nombre}=.*$`, "m");
  await writeFile(ENV_LOCAL, regex.test(actual) ? actual.replace(regex, linea) : `${actual.trimEnd()}\n${linea}\n`);
}
