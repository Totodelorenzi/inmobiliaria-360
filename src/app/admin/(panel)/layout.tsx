import { UserX } from "lucide-react";
import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/admin/(acceso)/acciones";
import { NavPanel } from "@/components/admin/nav-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getEstadoSesion } from "@/lib/admin/sesion";
import { brandStyle } from "@/lib/color";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const estado = await getEstadoSesion();
  if (estado.tipo === "sin-sesion") redirect("/admin/login");
  if (estado.tipo === "sin-agencia") {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <EmptyState
          icon={<UserX aria-hidden />}
          title="Tu usuario no tiene inmobiliaria asignada"
          description={`Entraste como ${estado.email}. Pedile al administrador que te invite desde Usuarios.`}
          action={
            <form action={cerrarSesion}>
              <Button type="submit" variant="outline">
                Salir
              </Button>
            </form>
          }
        />
      </main>
    );
  }

  const { agencia, email, rol } = estado.sesion;
  return (
    <div style={brandStyle(agencia.color_primario)} className="flex min-h-dvh flex-col lg:flex-row">
      <NavPanel agencia={agencia.nombre} email={email} esAdmin={rol === "admin"} />
      <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
