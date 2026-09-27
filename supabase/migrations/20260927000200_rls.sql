-- Seguridad: permisos por rol + Row Level Security en todas las tablas.
-- Público (anon): lee agencias y propiedades publicadas con sus fotos, tour y planos; solo inserta leads.
-- Miembros (authenticated): leen y escriben los datos de su propia agencia.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer: evitan recursión de RLS entre tablas)
-- ---------------------------------------------------------------------------
create function private.es_miembro(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members m
     where m.agency_id = p_agency and m.user_id = (select auth.uid())
  );
$$;

create function private.es_admin(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members m
     where m.agency_id = p_agency and m.user_id = (select auth.uid()) and m.rol = 'admin'
  );
$$;

create function private.propiedad_visible(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.properties p
     where p.id = p_property and (p.publicada or private.es_miembro(p.agency_id))
  );
$$;

create function private.puede_editar_propiedad(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.properties p
      join public.agency_members m on m.agency_id = p.agency_id
     where p.id = p_property and m.user_id = (select auth.uid())
  );
$$;

create function private.propiedad_de_escena(p_scene uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select property_id from public.tour_scenes where id = p_scene;
$$;

create function private.propiedad_de_plano(p_plan uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select property_id from public.property_plans where id = p_plan;
$$;

-- Un lead sin propiedad va a la agencia; con propiedad, esta tiene que estar publicada y ser de esa agencia.
create function private.lead_valido(p_agency uuid, p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_property is null or exists (
    select 1 from public.properties p
     where p.id = p_property and p.agency_id = p_agency and p.publicada
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function
  private.es_miembro(uuid), private.es_admin(uuid), private.propiedad_visible(uuid),
  private.puede_editar_propiedad(uuid), private.propiedad_de_escena(uuid),
  private.propiedad_de_plano(uuid), private.lead_valido(uuid, uuid)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Permisos por rol (Supabase da todo por defecto; se deja solo lo necesario)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.agencies, public.properties, public.property_photos, public.tour_scenes,
  public.tour_hotspots, public.property_plans, public.plan_hotspots
  to anon, authenticated;
grant insert on public.leads to anon, authenticated;

grant update on public.agencies to authenticated;
grant insert, update, delete on
  public.properties, public.property_photos, public.tour_scenes,
  public.tour_hotspots, public.property_plans, public.plan_hotspots
  to authenticated;
grant select, insert, update, delete on public.agency_members to authenticated;
grant select, delete on public.leads to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.tour_scenes enable row level security;
alter table public.tour_hotspots enable row level security;
alter table public.property_plans enable row level security;
alter table public.plan_hotspots enable row level security;
alter table public.leads enable row level security;

-- Agencias
create policy "agencias: lectura pública" on public.agencies
  for select to anon, authenticated using (true);
create policy "agencias: el admin edita la suya" on public.agencies
  for update to authenticated using (private.es_admin(id)) with check (private.es_admin(id));

-- Miembros
create policy "miembros: ver los de mi agencia" on public.agency_members
  for select to authenticated using (user_id = (select auth.uid()) or private.es_miembro(agency_id));
create policy "miembros: el admin agrega" on public.agency_members
  for insert to authenticated with check (private.es_admin(agency_id));
create policy "miembros: el admin modifica" on public.agency_members
  for update to authenticated using (private.es_admin(agency_id)) with check (private.es_admin(agency_id));
create policy "miembros: el admin quita" on public.agency_members
  for delete to authenticated using (private.es_admin(agency_id));

-- Propiedades
create policy "propiedades: publicadas o de mi agencia" on public.properties
  for select to anon, authenticated using (publicada or private.es_miembro(agency_id));
create policy "propiedades: crear en mi agencia" on public.properties
  for insert to authenticated with check (private.es_miembro(agency_id));
create policy "propiedades: editar las de mi agencia" on public.properties
  for update to authenticated using (private.es_miembro(agency_id)) with check (private.es_miembro(agency_id));
create policy "propiedades: borrar las de mi agencia" on public.properties
  for delete to authenticated using (private.es_miembro(agency_id));

-- Fotos, escenas y planos: visibles si la propiedad lo es; editables por su agencia.
create policy "fotos: lectura" on public.property_photos
  for select to anon, authenticated using (private.propiedad_visible(property_id));
create policy "fotos: alta" on public.property_photos
  for insert to authenticated with check (private.puede_editar_propiedad(property_id));
create policy "fotos: edición" on public.property_photos
  for update to authenticated using (private.puede_editar_propiedad(property_id))
  with check (private.puede_editar_propiedad(property_id));
create policy "fotos: baja" on public.property_photos
  for delete to authenticated using (private.puede_editar_propiedad(property_id));

create policy "escenas: lectura" on public.tour_scenes
  for select to anon, authenticated using (private.propiedad_visible(property_id));
create policy "escenas: alta" on public.tour_scenes
  for insert to authenticated with check (private.puede_editar_propiedad(property_id));
create policy "escenas: edición" on public.tour_scenes
  for update to authenticated using (private.puede_editar_propiedad(property_id))
  with check (private.puede_editar_propiedad(property_id));
create policy "escenas: baja" on public.tour_scenes
  for delete to authenticated using (private.puede_editar_propiedad(property_id));

create policy "planos: lectura" on public.property_plans
  for select to anon, authenticated using (private.propiedad_visible(property_id));
create policy "planos: alta" on public.property_plans
  for insert to authenticated with check (private.puede_editar_propiedad(property_id));
create policy "planos: edición" on public.property_plans
  for update to authenticated using (private.puede_editar_propiedad(property_id))
  with check (private.puede_editar_propiedad(property_id));
create policy "planos: baja" on public.property_plans
  for delete to authenticated using (private.puede_editar_propiedad(property_id));

-- Hotspots: heredan la propiedad de su escena o plano.
create policy "hotspots tour: lectura" on public.tour_hotspots
  for select to anon, authenticated using (private.propiedad_visible(private.propiedad_de_escena(scene_id)));
create policy "hotspots tour: alta" on public.tour_hotspots
  for insert to authenticated with check (private.puede_editar_propiedad(private.propiedad_de_escena(scene_id)));
create policy "hotspots tour: edición" on public.tour_hotspots
  for update to authenticated using (private.puede_editar_propiedad(private.propiedad_de_escena(scene_id)))
  with check (private.puede_editar_propiedad(private.propiedad_de_escena(scene_id)));
create policy "hotspots tour: baja" on public.tour_hotspots
  for delete to authenticated using (private.puede_editar_propiedad(private.propiedad_de_escena(scene_id)));

create policy "puntos plano: lectura" on public.plan_hotspots
  for select to anon, authenticated using (private.propiedad_visible(private.propiedad_de_plano(plan_id)));
create policy "puntos plano: alta" on public.plan_hotspots
  for insert to authenticated with check (private.puede_editar_propiedad(private.propiedad_de_plano(plan_id)));
create policy "puntos plano: edición" on public.plan_hotspots
  for update to authenticated using (private.puede_editar_propiedad(private.propiedad_de_plano(plan_id)))
  with check (private.puede_editar_propiedad(private.propiedad_de_plano(plan_id)));
create policy "puntos plano: baja" on public.plan_hotspots
  for delete to authenticated using (private.puede_editar_propiedad(private.propiedad_de_plano(plan_id)));

-- Leads: el público solo inserta; la agencia los lee y los borra.
create policy "leads: cualquiera consulta" on public.leads
  for insert to anon, authenticated with check (private.lead_valido(agency_id, property_id));
create policy "leads: la agencia los ve" on public.leads
  for select to authenticated using (private.es_miembro(agency_id));
create policy "leads: la agencia los borra" on public.leads
  for delete to authenticated using (private.es_miembro(agency_id));
