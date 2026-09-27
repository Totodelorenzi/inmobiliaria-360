"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/states";

export default function ErrorSitio({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Container className="py-16">
      <EmptyState
        tone="danger"
        icon={<TriangleAlert aria-hidden />}
        title="No pudimos cargar esta página"
        description="Puede ser un problema de conexión. Probá de nuevo en unos segundos."
        action={<Button onClick={() => retry()}>Reintentar</Button>}
      />
    </Container>
  );
}
