"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function ErrorPanel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="p-4 py-12">
      <EmptyState
        tone="danger"
        icon={<TriangleAlert aria-hidden />}
        title="Algo salió mal"
        description={
          <>
            No pudimos cargar esta pantalla. Probá de nuevo; si sigue pasando, avisá al soporte
            {error.digest ? ` con el código ${error.digest}` : ""}.
          </>
        }
        action={<Button onClick={() => retry()}>Reintentar</Button>}
      />
    </div>
  );
}
