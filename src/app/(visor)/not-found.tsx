import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid size-full place-items-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <h1 className="text-2xl font-bold">No encontramos este recorrido</h1>
        <p className="text-white/80">Puede que la propiedad ya no esté publicada o que todavía no tenga tour o planos.</p>
        <Link href="/" className={buttonStyles({ variant: "accent" })}>
          Ver propiedades
        </Link>
      </div>
    </div>
  );
}
