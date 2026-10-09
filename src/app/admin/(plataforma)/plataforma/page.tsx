import type { Metadata } from "next";
import { FormDominio, FormNuevaInmobiliaria } from "@/components/admin/plataforma";
import { Encabezado, Pagina, Panel } from "@/components/admin/ui";
import { requerirSuperadmin } from "@/lib/admin/sesion";
import { DNS_POR_DEFECTO, vercelConfigurado } from "@/lib/admin/vercel";
import { createAdminClient } from "@/lib/supabase/admin";
import { entornoActual, PARAM_PRUEBA, urlEnSitio } from "@/lib/tenancy";

export const metadata: Metadata = { title: "Plataforma" };

export default async function PlataformaPage() {
  await requerirSuperadmin();
  // Verificado el superadmin: se listan todas con la clave secreta.
  const { data: agencias, error } = await createAdminClient()
    .from("agencies")
    .select("id, nombre, subdominio, dominio_propio, created_at, miembros:agency_members(count), propiedades:properties(count)")
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar las inmobiliarias: ${error.message}`);

  const base = entornoActual().dominioBase;
  const plantilla = base ? `https://{subdominio}.${base}` : urlEnSitio({ subdominio: "{subdominio}", dominio_propio: null }).replace(encodeURIComponent("{subdominio}"), "{subdominio}");

  return (
    <Pagina>
      <Encabezado
        titulo="Inmobiliarias de la plataforma"
        descripcion={
          base
            ? `Cada una tiene su web en <subdominio>.${base} o en su dominio propio. El panel de todas es app.${base}.`
            : `Todavía no hay dominio de la plataforma (DOMINIO_BASE): las webs se prueban con ?${PARAM_PRUEBA}=<subdominio>.`
        }
      />
      <div className="flex flex-col gap-5">
        <Panel titulo="Nueva inmobiliaria">
          <FormNuevaInmobiliaria plantillaDireccion={plantilla} />
        </Panel>
        <Panel titulo={`Inmobiliarias (${agencias.length})`}>
          <ul className="flex flex-col divide-y divide-border">
            {agencias.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{a.nombre}</p>
                  <p className="text-sm text-muted">
                    {a.propiedades[0]?.count ?? 0} propiedades · {a.miembros[0]?.count ?? 0} usuarios
                  </p>
                </div>
                <a href={urlEnSitio(a)} target="_blank" className="w-fit text-sm font-medium text-brand-ink underline">
                  {urlEnSitio(a)}
                </a>
                <FormDominio agencyId={a.id} actual={a.dominio_propio} dnsActual={DNS_POR_DEFECTO} />
              </li>
            ))}
          </ul>
          {!vercelConfigurado() && (
            <p className="mt-3 text-sm text-muted">
              Para que los dominios propios se agreguen solos en Vercel, cargá VERCEL_API_TOKEN y VERCEL_PROJECT_ID (ver .env.example).
            </p>
          )}
        </Panel>
      </div>
    </Pagina>
  );
}
