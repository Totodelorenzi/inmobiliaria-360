import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { PaginaNeutra } from "@/components/plataforma/neutra";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { COOKIE_PRUEBA, entornoActual, PARAM_PRUEBA, resolverHost } from "@/lib/tenancy";

export const metadata: Metadata = { title: "Pre-visita digital para inmobiliarias", robots: { index: false } };

/** Host sin inmobiliaria (dominio de la plataforma, o de prueba sin elegir ninguna). */
export default async function Plataforma() {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const destino = resolverHost(h.get("host") ?? "", entornoActual(), c.get(COOKIE_PRUEBA)?.value);
  const prueba = destino.tipo !== "panel" && destino.prueba;

  return (
    <PaginaNeutra titulo="Pre-visita digital para inmobiliarias">
      <p className="text-muted">Esta dirección no corresponde a la web de ninguna inmobiliaria.</p>
      {prueba && (
        <form method="get" className="flex w-full flex-col gap-2 text-left">
          <label htmlFor="agencia" className="text-sm font-medium">
            Ver la web de una inmobiliaria (solo en pruebas)
          </label>
          <div className="flex gap-2">
            <Input id="agencia" name={PARAM_PRUEBA} placeholder="subdominio, ej. horizonte" required />
            <Button type="submit">Ver</Button>
          </div>
        </form>
      )}
      <Link href="/admin" className={buttonStyles({ variant: "outline" })}>
        Entrar al panel
      </Link>
    </PaginaNeutra>
  );
}
