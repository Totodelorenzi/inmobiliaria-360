import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <h1 className="text-2xl font-bold">No encontramos esta página</h1>
        <p className="text-muted">Puede que el proyecto ya no esté publicado o que la dirección esté mal escrita.</p>
        <Link href="/" className={buttonStyles({ variant: "brand" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
