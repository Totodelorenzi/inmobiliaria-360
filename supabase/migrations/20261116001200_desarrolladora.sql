-- Módulo "desarrolladora": edificios en pozo con fachada, plantas, tipologías y unidades, hechos con
-- imágenes y zonas tocables. Todo es aditivo y con valor por defecto: la base es una sola y lo que ya
-- está publicado sigue igual.

-- ---------------------------------------------------------------------------
-- Módulos por inmobiliaria (no excluyentes)
-- ---------------------------------------------------------------------------
alter table public.agencies
  add column modulos text[] not null default '{inmobiliaria}'
    check (cardinality(modulos) >= 1 and modulos <@ array['inmobiliaria', 'desarrolladora']);
comment on column public.agencies.modulos is 'Qué secciones tiene habilitadas. Lo carga la plataforma, no el admin.';
-- No entra en el grant de columnas editables del admin (migración 0009): nadie con sesión la cambia.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.estado_unidad as enum ('disponible', 'reservada', 'vendida');

-- Se usan desde el servidor (no se puede usar un valor nuevo en la misma transacción).
alter type public.tipo_evento add value if not exists 'floor_view';
alter type public.tipo_evento add value if not exists 'unit_view';
alter type public.tipo_evento add value if not exists 'rooms_open';
alter type public.tipo_evento add value if not exists 'room_view';

-- Zona tocable sobre una imagen: lista de vértices [x, y] en porcentajes (como los puntos de los planos).
create function private.poligono_valido(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (
    jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) between 3 and 60
    and not exists (
      select 1 from jsonb_array_elements(p) v
       where jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 2
          or jsonb_typeof(v -> 0) <> 'number' or jsonb_typeof(v -> 1) <> 'number'
          or (v ->> 0)::numeric not between 0 and 100 or (v ->> 1)::numeric not between 0 and 100
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Proyectos, pisos, tipologías, ambientes y unidades
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  ciudad text check (length(ciudad) <= 80),
  direccion text check (length(direccion) <= 200),
  descripcion text check (length(descripcion) <= 2000),
  fachada_url text check (length(fachada_url) <= 500),
  -- Medidas de la imagen: reservan el lugar antes de que cargue y dan la proporción a las zonas.
  fachada_ancho integer check (fachada_ancho > 0),
  fachada_alto integer check (fachada_alto > 0),
  publicado boolean not null default false,
  es_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug)
);
create trigger projects_updated_at before update on public.projects
  for each row execute function private.set_updated_at();

create table public.project_floors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  numero smallint not null check (numero between -5 and 200),
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  planta_url text check (length(planta_url) <= 500),
  planta_ancho integer check (planta_ancho > 0),
  planta_alto integer check (planta_alto > 0),
  -- Zona del piso sobre la fachada.
  poligono jsonb check (private.poligono_valido(poligono)),
  unique (project_id, numero)
);

create table public.unit_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  ambientes smallint check (ambientes between 0 and 50),
  dormitorios smallint check (dormitorios between 0 and 50),
  banos smallint check (banos between 0 and 50),
  -- Maqueta vista desde arriba.
  maqueta_url text check (length(maqueta_url) <= 500),
  maqueta_ancho integer check (maqueta_ancho > 0),
  maqueta_alto integer check (maqueta_alto > 0),
  orden integer not null default 0
);
create index unit_types_project_idx on public.unit_types (project_id, orden);

create table public.unit_type_rooms (
  id uuid primary key default gen_random_uuid(),
  unit_type_id uuid not null references public.unit_types (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  -- null: ambiente sin render cargado todavía (no aparece en el recorrido).
  render_url text check (length(render_url) <= 500),
  orden integer not null default 0
);
create index unit_type_rooms_type_idx on public.unit_type_rooms (unit_type_id, orden);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  floor_id uuid not null references public.project_floors (id) on delete cascade,
  unit_type_id uuid not null references public.unit_types (id) on delete restrict,
  codigo text not null check (codigo ~ '^[A-Za-z0-9]{1,8}$'),
  superficie_cubierta numeric(8, 2) check (superficie_cubierta >= 0),
  superficie_total numeric(8, 2) check (superficie_total >= 0),
  orientacion text check (length(orientacion) <= 40),
  precio numeric(14, 2) check (precio >= 0),
  moneda public.moneda not null default 'USD',
  estado public.estado_unidad not null default 'disponible',
  -- Versión espejada de su tipología: la maqueta y los renders se muestran espejados.
  espejada boolean not null default false,
  -- Zona de la unidad sobre la planta del piso.
  poligono jsonb check (private.poligono_valido(poligono)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, codigo)
);
comment on column public.units.precio is 'null = "Consultar".';
create index units_floor_idx on public.units (floor_id);
create index units_type_idx on public.units (unit_type_id);
create trigger units_updated_at before update on public.units
  for each row execute function private.set_updated_at();

-- El piso y la tipología de una unidad tienen que ser de su mismo proyecto.
create function private.validar_unidad() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select project_id from public.project_floors where id = new.floor_id) is distinct from new.project_id
     or (select project_id from public.unit_types where id = new.unit_type_id) is distinct from new.project_id then
    raise exception 'El piso y la tipología tienen que ser del mismo proyecto.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger units_validar before insert or update of project_id, floor_id, unit_type_id on public.units
  for each row execute function private.validar_unidad();

-- ---------------------------------------------------------------------------
-- Seguimiento y leads
-- ---------------------------------------------------------------------------
alter table public.visitor_events
  add column project_id uuid references public.projects (id) on delete cascade,
  add column floor_id uuid references public.project_floors (id) on delete set null,
  add column unit_id uuid references public.units (id) on delete set null,
  add column room_id uuid references public.unit_type_rooms (id) on delete set null;
create index visitor_events_project_idx on public.visitor_events (project_id, tipo, created_at);
create index visitor_events_floor_idx on public.visitor_events (floor_id);
create index visitor_events_unit_idx on public.visitor_events (unit_id);
create index visitor_events_room_idx on public.visitor_events (room_id);

-- Última unidad por la que el visitante pidió información (el resto queda en sus eventos).
alter table public.leads
  add column unit_id uuid references public.units (id) on delete set null;
create index leads_unit_idx on public.leads (unit_id);

-- ---------------------------------------------------------------------------
-- Seguridad: el público lee lo de proyectos publicados; cada inmobiliaria edita lo suyo.
-- ---------------------------------------------------------------------------
create function private.proyecto_visible(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
     where p.id = p_project and (p.publicado or private.es_miembro(p.agency_id))
  );
$$;

create function private.puede_editar_proyecto(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
      join public.agency_members m on m.agency_id = p.agency_id
     where p.id = p_project and m.user_id = (select auth.uid())
  );
$$;

create function private.proyecto_de_tipologia(p_type uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select project_id from public.unit_types where id = p_type;
$$;

revoke all on function
  private.poligono_valido(jsonb), private.proyecto_visible(uuid),
  private.puede_editar_proyecto(uuid), private.proyecto_de_tipologia(uuid)
  from public;
grant execute on function
  private.poligono_valido(jsonb), private.proyecto_visible(uuid),
  private.puede_editar_proyecto(uuid), private.proyecto_de_tipologia(uuid)
  to anon, authenticated, service_role;

grant select on
  public.projects, public.project_floors, public.unit_types, public.unit_type_rooms, public.units
  to anon, authenticated;
grant insert, update, delete on
  public.projects, public.project_floors, public.unit_types, public.unit_type_rooms, public.units
  to authenticated;
grant all on
  public.projects, public.project_floors, public.unit_types, public.unit_type_rooms, public.units
  to service_role;

alter table public.projects enable row level security;
alter table public.project_floors enable row level security;
alter table public.unit_types enable row level security;
alter table public.unit_type_rooms enable row level security;
alter table public.units enable row level security;

create policy "proyectos: publicados o de mi agencia" on public.projects
  for select to anon, authenticated using (publicado or private.es_miembro(agency_id));
create policy "proyectos: crear en mi agencia" on public.projects
  for insert to authenticated with check (private.es_miembro(agency_id));
create policy "proyectos: editar los de mi agencia" on public.projects
  for update to authenticated using (private.es_miembro(agency_id)) with check (private.es_miembro(agency_id));
create policy "proyectos: borrar los de mi agencia" on public.projects
  for delete to authenticated using (private.es_miembro(agency_id));

create policy "pisos: lectura" on public.project_floors
  for select to anon, authenticated using (private.proyecto_visible(project_id));
create policy "pisos: alta" on public.project_floors
  for insert to authenticated with check (private.puede_editar_proyecto(project_id));
create policy "pisos: edición" on public.project_floors
  for update to authenticated using (private.puede_editar_proyecto(project_id))
  with check (private.puede_editar_proyecto(project_id));
create policy "pisos: baja" on public.project_floors
  for delete to authenticated using (private.puede_editar_proyecto(project_id));

create policy "tipologías: lectura" on public.unit_types
  for select to anon, authenticated using (private.proyecto_visible(project_id));
create policy "tipologías: alta" on public.unit_types
  for insert to authenticated with check (private.puede_editar_proyecto(project_id));
create policy "tipologías: edición" on public.unit_types
  for update to authenticated using (private.puede_editar_proyecto(project_id))
  with check (private.puede_editar_proyecto(project_id));
create policy "tipologías: baja" on public.unit_types
  for delete to authenticated using (private.puede_editar_proyecto(project_id));

create policy "ambientes: lectura" on public.unit_type_rooms
  for select to anon, authenticated using (private.proyecto_visible(private.proyecto_de_tipologia(unit_type_id)));
create policy "ambientes: alta" on public.unit_type_rooms
  for insert to authenticated with check (private.puede_editar_proyecto(private.proyecto_de_tipologia(unit_type_id)));
create policy "ambientes: edición" on public.unit_type_rooms
  for update to authenticated using (private.puede_editar_proyecto(private.proyecto_de_tipologia(unit_type_id)))
  with check (private.puede_editar_proyecto(private.proyecto_de_tipologia(unit_type_id)));
create policy "ambientes: baja" on public.unit_type_rooms
  for delete to authenticated using (private.puede_editar_proyecto(private.proyecto_de_tipologia(unit_type_id)));

create policy "unidades: lectura" on public.units
  for select to anon, authenticated using (private.proyecto_visible(project_id));
create policy "unidades: alta" on public.units
  for insert to authenticated with check (private.puede_editar_proyecto(project_id));
create policy "unidades: edición" on public.units
  for update to authenticated using (private.puede_editar_proyecto(project_id))
  with check (private.puede_editar_proyecto(project_id));
create policy "unidades: baja" on public.units
  for delete to authenticated using (private.puede_editar_proyecto(project_id));
