-- Ajustes que pidió el asesor de seguridad y rendimiento de Supabase.

-- "Enable automatic RLS" crea public.rls_auto_enable() (security definer) ejecutable por
-- cualquiera vía /rest/v1/rpc. El event trigger no necesita el permiso: se le quita al público.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- Claves foráneas sin índice que las cubra (borrar un visitante o un usuario las recorre).
create index leads_visitor_idx on public.leads (visitor_id);
create index tracked_links_creado_por_idx on public.tracked_links (creado_por);
