import { Rotate3d, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/states";

// Provisoria: la etapa 3 la reemplaza por el inicio de la web pública.
export default function Home() {
  return (
    <main className="flex flex-1 items-center py-16">
      <Container className="flex max-w-xl flex-col gap-6">
        <Badge tone="brand" className="self-start">
          En construcción
        </Badge>
        <h1 className="text-4xl font-bold">Propiedades con tour 360° y planos</h1>
        <p className="text-lg text-muted">Muy pronto vas a poder recorrer cada propiedad desde tu celular.</p>
        <div className="flex flex-col gap-3">
          <span className={buttonStyles({ variant: "accent", size: "lg", fullWidth: true })}>
            <Rotate3d aria-hidden /> Recorrer la propiedad en 360°
          </span>
          <span className={buttonStyles({ variant: "accent", size: "lg", fullWidth: true })}>
            <Ruler aria-hidden /> Ver planos
          </span>
        </div>
      </Container>
    </main>
  );
}
