import type { Metadata } from "next";
import Link from "next/link";
import { PaginaNeutra } from "@/components/plataforma/neutra";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

// 404 fuera de la web de una inmobiliaria (cada una tiene el suyo, con su marca).
export default function NotFound() {
  return (
    <PaginaNeutra titulo="No encontramos esta página">
      <p className="text-muted">Revisá la dirección. Si buscabas la web de una inmobiliaria, puede que todavía no esté publicada.</p>
      <Link href="/" className={buttonStyles({ variant: "outline" })}>
        Ir al inicio
      </Link>
    </PaginaNeutra>
  );
}
