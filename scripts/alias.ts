/**
 * Permite que Node (tests y scripts) importe el código de src/ igual que Next:
 * resuelve el alias "@/", agrega la extensión .ts/.tsx faltante y neutraliza "server-only".
 * Uso: node --import ./scripts/alias.ts archivo.ts
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const SRC = new URL("../src/", import.meta.url);
const EXTENSIONES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    }
    const esAlias = specifier.startsWith("@/");
    const esRelativo = specifier.startsWith("./") || specifier.startsWith("../");
    if ((esAlias || esRelativo) && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const base = esAlias ? new URL(specifier.slice(2), SRC) : new URL(specifier, context.parentURL);
      for (const ext of EXTENSIONES) {
        const url = new URL(base.href + ext);
        if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
