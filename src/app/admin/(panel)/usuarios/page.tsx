import type { Metadata } from "next";
import { Encabezado, Pagina, Panel } from "@/components/admin/ui";
import { FormInvitar, ListaMiembros, type Miembro } from "@/components/admin/usuarios";
import { requerirAdmin } from "@/lib/admin/sesion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const sesion = await requerirAdmin();
  const supabase = await createClient();
  const { data: filas, error } = await supabase.from("agency_members").select("user_id, rol").eq("agency_id", sesion.agencia.id);
  if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);

  // Los emails están en auth.users: se leen con la clave secreta, ya verificado que quien pide es admin.
  const admin = createAdminClient();
  const miembros: Miembro[] = await Promise.all(
    filas.map(async (f) => {
      const { data } = await admin.auth.admin.getUserById(f.user_id);
      return {
        userId: f.user_id,
        email: data.user?.email ?? "(sin email)",
        rol: f.rol,
        pendiente: Boolean(data.user && !data.user.last_sign_in_at),
      };
    }),
  );
  miembros.sort((a, b) => Number(b.userId === sesion.userId) - Number(a.userId === sesion.userId) || a.email.localeCompare(b.email));

  return (
    <Pagina>
      <Encabezado titulo="Usuarios" descripcion="Quiénes pueden entrar al panel de la inmobiliaria." />
      <div className="flex flex-col gap-5">
        <Panel titulo="Invitar a alguien">
          <FormInvitar />
        </Panel>
        <Panel titulo={`Equipo (${miembros.length})`}>
          <ListaMiembros miembros={miembros} yo={sesion.userId} />
        </Panel>
      </div>
    </Pagina>
  );
}
