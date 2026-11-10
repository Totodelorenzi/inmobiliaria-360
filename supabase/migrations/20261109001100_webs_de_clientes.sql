-- Webs de clientes (skill web-inmobiliaria-cliente): estado comercial, asesores, fotos por ambiente,
-- switch del recorrido 360 y tema por inmobiliaria. Todo es aditivo y con valor por defecto: la base
-- es una sola y lo que ya está publicado sigue igual.

-- ---------------------------------------------------------------------------
-- Estado comercial de cada propiedad
-- ---------------------------------------------------------------------------
create type public.estado_comercial as enum ('disponible', 'reservada', 'vendida', 'alquilada');
alter table public.properties
  add column estado_comercial public.estado_comercial not null default 'disponible';
comment on column public.properties.estado_comercial is
  'Vendida o alquilada: la ficha sigue accesible con su estado y similares, pero sale de listados y sitemap.';

-- ---------------------------------------------------------------------------
-- Fotos rotuladas por ambiente (mismo vocabulario que el tour y los planos)
-- ---------------------------------------------------------------------------
alter table public.property_photos
  add column ambiente text check (ambiente is null or length(trim(ambiente)) between 1 and 60);

-- ---------------------------------------------------------------------------
-- Asesores (perfil público; no hace falta que tengan usuario en el panel)
-- ---------------------------------------------------------------------------
create table public.advisors (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  rol text check (length(rol) <= 60),
  foto_url text check (length(foto_url) <= 500),
  whatsapp text check (whatsapp ~ '^[0-9]{8,15}$'),
  telefono text check (length(telefono) <= 40),
  email text check (length(email) <= 200),
  matricula text check (length(matricula) <= 120),
  orden integer not null default 0,
  activo boolean not null default true,
  es_demo boolean not null default false,
  created_at timestamptz not null default now()
);
comment on column public.advisors.whatsapp is 'Solo dígitos con código de país, formato wa.me (ej. 5492214567890).';
create index advisors_agency_idx on public.advisors (agency_id, orden);

alter table public.properties
  add column asesor_id uuid references public.advisors (id) on delete set null;
create index properties_asesor_idx on public.properties (asesor_id);

-- El asesor de una propiedad tiene que ser de la misma inmobiliaria.
create function private.validar_asesor_propiedad() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.asesor_id is not null
     and (select agency_id from public.advisors where id = new.asesor_id) is distinct from new.agency_id then
    raise exception 'El asesor tiene que ser de la misma inmobiliaria.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger properties_validar_asesor before insert or update of asesor_id, agency_id on public.properties
  for each row execute function private.validar_asesor_propiedad();

grant select on public.advisors to anon, authenticated;
grant insert, update, delete on public.advisors to authenticated;
grant all on public.advisors to service_role;
alter table public.advisors enable row level security;

create policy "asesores: activos públicos o de mi agencia" on public.advisors
  for select to anon, authenticated using (activo or private.es_miembro(agency_id));
create policy "asesores: el admin agrega" on public.advisors
  for insert to authenticated with check (private.es_admin(agency_id));
create policy "asesores: el admin edita" on public.advisors
  for update to authenticated using (private.es_admin(agency_id)) with check (private.es_admin(agency_id));
create policy "asesores: el admin quita" on public.advisors
  for delete to authenticated using (private.es_admin(agency_id));

-- ---------------------------------------------------------------------------
-- Inmobiliaria: matrícula, horarios, switch del 360 y tema
-- ---------------------------------------------------------------------------
alter table public.agencies
  add column matricula text check (length(matricula) <= 120),
  add column horarios text check (length(horarios) <= 200),
  add column recorrido_activo boolean not null default true,
  -- Tokens de la identidad (docs/clientes/{slug}/tema.json). Lo carga la plataforma, no el admin.
  add column tema jsonb not null default '{}' check (jsonb_typeof(tema) = 'object' and pg_column_size(tema) <= 8192);
comment on column public.agencies.recorrido_activo is 'Switch del tour 360 en toda la web de la inmobiliaria.';
comment on column public.agencies.tema is 'Tokens de color, tipografía y radios. Vacío: color_primario y el tema base.';

grant update (matricula, horarios, recorrido_activo) on public.agencies to authenticated;
