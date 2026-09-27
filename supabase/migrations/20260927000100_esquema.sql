-- Esquema principal: inmobiliarias, propiedades, tour 360°, planos y consultas.

-- Esquema privado para funciones auxiliares: no lo expone la API de datos.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.rol_miembro as enum ('admin', 'agente');
create type public.operacion as enum ('alquiler', 'venta');
create type public.tipo_propiedad as enum ('departamento', 'casa', 'ph', 'local', 'terreno', 'oficina', 'cochera');
create type public.estado_obra as enum ('terminada', 'en_construccion', 'en_pozo');
create type public.moneda as enum ('ARS', 'USD');
create type public.tipo_plano as enum ('imagen', 'pdf');
create type public.origen_lead as enum ('formulario', 'whatsapp_click');

-- ---------------------------------------------------------------------------
-- Inmobiliarias y miembros
-- ---------------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  logo_url text,
  color_primario text not null default '#1f3a5f' check (color_primario ~ '^#[0-9a-fA-F]{6}$'),
  whatsapp text check (whatsapp ~ '^[0-9]{8,15}$'),
  email text check (length(email) <= 200),
  telefono text check (length(telefono) <= 40),
  direccion text check (length(direccion) <= 200),
  instagram text check (length(instagram) <= 200),
  facebook text check (length(facebook) <= 200),
  created_at timestamptz not null default now()
);
comment on column public.agencies.whatsapp is 'Solo dígitos con código de país, formato wa.me (ej. 5491122334455).';

create table public.agency_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  rol public.rol_miembro not null default 'agente',
  created_at timestamptz not null default now(),
  primary key (user_id, agency_id)
);
create index agency_members_agency_idx on public.agency_members (agency_id);

-- ---------------------------------------------------------------------------
-- Propiedades
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  operacion public.operacion not null,
  tipo public.tipo_propiedad not null,
  estado_obra public.estado_obra not null default 'terminada',
  fecha_entrega date,
  avance_obra_pct smallint check (avance_obra_pct between 0 and 100),
  precio numeric(14, 2) check (precio >= 0),
  moneda public.moneda not null default 'USD',
  expensas numeric(12, 2) check (expensas >= 0),
  acepta_financiacion boolean not null default false,
  detalle_financiacion text check (length(detalle_financiacion) <= 1000),
  apto_credito boolean not null default false,
  direccion text check (length(direccion) <= 200),
  mostrar_direccion_exacta boolean not null default false,
  barrio text check (length(barrio) <= 80),
  ciudad text check (length(ciudad) <= 80),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  ambientes smallint check (ambientes between 0 and 50),
  dormitorios smallint check (dormitorios between 0 and 50),
  banos smallint check (banos between 0 and 50),
  superficie_total numeric(10, 2) check (superficie_total >= 0),
  superficie_cubierta numeric(10, 2) check (superficie_cubierta >= 0),
  cochera smallint not null default 0 check (cochera between 0 and 20),
  amenities text[] not null default '{}',
  descripcion text check (length(descripcion) <= 10000),
  destacada boolean not null default false,
  publicada boolean not null default false,
  es_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.properties.precio is 'null = "Consultar".';
comment on column public.properties.cochera is 'Cantidad de cocheras.';
comment on column public.properties.es_demo is 'Datos de ejemplo: los borra el botón "Borrar datos de ejemplo".';

create index properties_listado_idx on public.properties (agency_id, publicada, operacion, created_at desc);
create index properties_obra_idx on public.properties (agency_id, estado_obra) where estado_obra <> 'terminada';

-- ---------------------------------------------------------------------------
-- Fotos, tour y planos
-- ---------------------------------------------------------------------------
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  url text not null,
  thumb_url text,
  orden integer not null default 0,
  es_principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index property_photos_property_idx on public.property_photos (property_id, orden);
create unique index property_photos_una_principal on public.property_photos (property_id) where es_principal;

create table public.tour_scenes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  nombre_ambiente text not null check (length(trim(nombre_ambiente)) between 1 and 60),
  panorama_url text not null,
  thumb_url text,
  orden integer not null default 0,
  yaw_inicial real not null default 0 check (yaw_inicial between -180 and 180),
  pitch_inicial real not null default 0 check (pitch_inicial between -90 and 90),
  created_at timestamptz not null default now()
);
create index tour_scenes_property_idx on public.tour_scenes (property_id, orden);

create table public.tour_hotspots (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.tour_scenes (id) on delete cascade,
  target_scene_id uuid not null references public.tour_scenes (id) on delete cascade,
  yaw real not null check (yaw between -180 and 180),
  pitch real not null check (pitch between -90 and 90),
  texto text check (length(texto) <= 60),
  check (scene_id <> target_scene_id)
);
create index tour_hotspots_scene_idx on public.tour_hotspots (scene_id);
create index tour_hotspots_target_idx on public.tour_hotspots (target_scene_id);

create table public.property_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  url text not null,
  thumb_url text,
  orden integer not null default 0,
  tipo_original public.tipo_plano not null default 'imagen',
  created_at timestamptz not null default now()
);
create index property_plans_property_idx on public.property_plans (property_id, orden);

create table public.plan_hotspots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.property_plans (id) on delete cascade,
  x_pct real not null check (x_pct between 0 and 100),
  y_pct real not null check (y_pct between 0 and 100),
  texto text not null check (length(trim(texto)) between 1 and 60),
  scene_id uuid references public.tour_scenes (id) on delete set null
);
create index plan_hotspots_plan_idx on public.plan_hotspots (plan_id);
create index plan_hotspots_scene_idx on public.plan_hotspots (scene_id);

-- ---------------------------------------------------------------------------
-- Consultas (leads)
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  nombre text check (length(nombre) <= 120),
  telefono text check (length(telefono) <= 40),
  email text check (length(email) <= 200),
  mensaje text check (length(mensaje) <= 2000),
  origen public.origen_lead not null default 'formulario',
  created_at timestamptz not null default now(),
  -- Un formulario necesita nombre y al menos un medio de contacto (coalesce: un CHECK con NULL pasaría).
  check (
    origen <> 'formulario'
    or (
      coalesce(length(trim(nombre)), 0) > 0
      and (coalesce(length(trim(telefono)), 0) > 0 or coalesce(length(trim(email)), 0) > 0)
    )
  )
);
create index leads_agency_idx on public.leads (agency_id, created_at desc);
create index leads_property_idx on public.leads (property_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger properties_updated_at before update on public.properties
  for each row execute function private.set_updated_at();

-- Al marcar una foto como principal, las demás de la propiedad dejan de serlo.
create function private.unica_foto_principal() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.es_principal then
    update public.property_photos
       set es_principal = false
     where property_id = new.property_id and id <> new.id and es_principal;
  end if;
  return new;
end;
$$;

create trigger property_photos_principal before insert or update of es_principal on public.property_photos
  for each row when (new.es_principal) execute function private.unica_foto_principal();

-- Un hotspot del tour solo puede llevar a una escena de la misma propiedad.
create function private.validar_tour_hotspot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select property_id from public.tour_scenes where id = new.scene_id)
     is distinct from (select property_id from public.tour_scenes where id = new.target_scene_id) then
    raise exception 'La escena destino tiene que ser de la misma propiedad.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger tour_hotspots_validar before insert or update on public.tour_hotspots
  for each row execute function private.validar_tour_hotspot();

-- Un punto del plano solo puede abrir una escena de la misma propiedad.
create function private.validar_plan_hotspot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.scene_id is not null
     and (select property_id from public.property_plans where id = new.plan_id)
         is distinct from (select property_id from public.tour_scenes where id = new.scene_id) then
    raise exception 'La escena tiene que ser de la misma propiedad que el plano.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger plan_hotspots_validar before insert or update on public.plan_hotspots
  for each row execute function private.validar_plan_hotspot();
