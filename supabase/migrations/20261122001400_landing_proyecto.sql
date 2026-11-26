-- Landing del proyecto (uDevelop): dos vistas de la fachada con transición por scroll, textos que
-- edita la desarrolladora, espacios comunes con sus imágenes, local en alquiler, cocheras y los UTM
-- de cada consulta. Todo es aditivo y con valor por defecto: lo publicado sigue igual.

-- Un local en alquiler queda "alquilada" (los departamentos y cocheras siguen con vendida/reservada).
alter type public.estado_unidad add value if not exists 'alquilada';
-- Se usa desde el servidor (no se puede usar un valor nuevo en la misma transacción).
alter type public.tipo_evento add value if not exists 'space_view';

-- Punto sobre una imagen: [x, y] en porcentajes.
create function private.punto_valido(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (
    jsonb_typeof(p) = 'array' and jsonb_array_length(p) = 2
    and jsonb_typeof(p -> 0) = 'number' and jsonb_typeof(p -> 1) = 'number'
    and (p ->> 0)::numeric between 0 and 100 and (p ->> 1)::numeric between 0 and 100
  );
$$;

-- Secuencia de cuadros para el giro del edificio (modo "secuencia"):
-- {"patron": "https://…/cuadro-{n}.webp", "cuadros": 90, "digitos": 4, "inicio": 1, "ancho": 1920, "alto": 1080}
create function private.secuencia_valida(s jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select s is null or (
    jsonb_typeof(s) = 'object'
    and jsonb_typeof(s -> 'patron') = 'string'
    and length(s ->> 'patron') <= 500
    and (s ->> 'patron') like 'https://%{n}%'
    and jsonb_typeof(s -> 'cuadros') = 'number' and (s ->> 'cuadros')::numeric between 2 and 600
    and jsonb_typeof(s -> 'ancho') = 'number' and (s ->> 'ancho')::numeric > 0
    and jsonb_typeof(s -> 'alto') = 'number' and (s ->> 'alto')::numeric > 0
    and (s -> 'digitos' is null or (jsonb_typeof(s -> 'digitos') = 'number' and (s ->> 'digitos')::numeric between 1 and 8))
    and (s -> 'inicio' is null or (jsonb_typeof(s -> 'inicio') = 'number' and (s ->> 'inicio')::numeric between 0 and 1))
  );
$$;

-- Lista corta de textos (amenities): sin vacíos y con largo acotado.
create function private.lista_textos_valida(l text[], max_items integer, max_largo integer) returns boolean
language sql immutable set search_path = '' as $$
  select l is null or (
    cardinality(l) <= max_items
    and not exists (select 1 from unnest(l) t where length(trim(t)) = 0 or length(t) > max_largo)
  );
$$;

-- ---------------------------------------------------------------------------
-- Proyecto: segunda vista, transición, textos y color de fondo
-- ---------------------------------------------------------------------------
alter table public.projects
  add column fachada2_url text check (length(fachada2_url) <= 500),
  add column fachada2_ancho integer check (fachada2_ancho > 0),
  add column fachada2_alto integer check (fachada2_alto > 0),
  add column vista1_nombre text check (length(vista1_nombre) <= 60),
  add column vista2_nombre text check (length(vista2_nombre) <= 60),
  add column transicion text not null default 'fundido' check (transicion in ('fundido', 'secuencia')),
  add column secuencia jsonb check (private.secuencia_valida(secuencia)),
  add column sobre_titulo text check (length(sobre_titulo) <= 120),
  add column sobre_texto text check (length(sobre_texto) <= 1200),
  add column entrega text check (length(entrega) <= 80),
  add column amenities text[] check (private.lista_textos_valida(amenities, 20, 80)),
  add column color_fondo text check (color_fondo ~ '^#[0-9a-f]{6}$');
comment on column public.projects.transicion is 'Paso de la vista 1 a la 2 con el scroll: fundido de dos imágenes o secuencia de cuadros.';
comment on column public.projects.color_fondo is 'Fondo liso de plantas y maquetas: la página usa el mismo color para que se fundan.';

-- Zona de cada piso sobre la segunda vista de la fachada.
alter table public.project_floors
  add column poligono2 jsonb check (private.poligono_valido(poligono2));

-- Qué es cada unidad y cómo se comercializa (el local se alquila; las cocheras se venden aparte).
alter table public.units
  add column categoria text not null default 'departamento' check (categoria in ('departamento', 'local', 'cochera')),
  add column operacion text not null default 'venta' check (operacion in ('venta', 'alquiler'));
create index units_categoria_idx on public.units (project_id, categoria);

-- ---------------------------------------------------------------------------
-- Espacios comunes (amenities, lobby) con un punto sobre la planta y sus imágenes
-- ---------------------------------------------------------------------------
create table public.project_spaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  floor_id uuid not null references public.project_floors (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  descripcion text check (length(descripcion) <= 300),
  punto jsonb check (private.punto_valido(punto)),
  orden integer not null default 0,
  unique (project_id, slug)
);
create index project_spaces_floor_idx on public.project_spaces (floor_id, orden);

create table public.project_space_images (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.project_spaces (id) on delete cascade,
  nombre text check (length(nombre) <= 60),
  -- null: imagen todavía no cargada (no aparece en la galería).
  url text check (length(url) <= 500),
  orden integer not null default 0
);
create index project_space_images_space_idx on public.project_space_images (space_id, orden);

-- El piso de un espacio tiene que ser de su mismo proyecto.
create function private.validar_espacio() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select project_id from public.project_floors where id = new.floor_id) is distinct from new.project_id then
    raise exception 'El piso tiene que ser del mismo proyecto.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger project_spaces_validar before insert or update of project_id, floor_id on public.project_spaces
  for each row execute function private.validar_espacio();

create function private.proyecto_de_espacio(p_space uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select project_id from public.project_spaces where id = p_space;
$$;
revoke all on function private.punto_valido(jsonb), private.secuencia_valida(jsonb),
  private.lista_textos_valida(text[], integer, integer), private.proyecto_de_espacio(uuid) from public;
grant execute on function private.punto_valido(jsonb), private.secuencia_valida(jsonb),
  private.lista_textos_valida(text[], integer, integer), private.proyecto_de_espacio(uuid)
  to anon, authenticated, service_role;

grant select on public.project_spaces, public.project_space_images to anon, authenticated;
grant insert, update, delete on public.project_spaces, public.project_space_images to authenticated;
grant all on public.project_spaces, public.project_space_images to service_role;

alter table public.project_spaces enable row level security;
alter table public.project_space_images enable row level security;

create policy "espacios: lectura" on public.project_spaces
  for select to anon, authenticated using (private.proyecto_visible(project_id));
create policy "espacios: alta" on public.project_spaces
  for insert to authenticated with check (private.puede_editar_proyecto(project_id));
create policy "espacios: edición" on public.project_spaces
  for update to authenticated using (private.puede_editar_proyecto(project_id))
  with check (private.puede_editar_proyecto(project_id));
create policy "espacios: baja" on public.project_spaces
  for delete to authenticated using (private.puede_editar_proyecto(project_id));

create policy "imágenes de espacios: lectura" on public.project_space_images
  for select to anon, authenticated using (private.proyecto_visible(private.proyecto_de_espacio(space_id)));
create policy "imágenes de espacios: alta" on public.project_space_images
  for insert to authenticated with check (private.puede_editar_proyecto(private.proyecto_de_espacio(space_id)));
create policy "imágenes de espacios: edición" on public.project_space_images
  for update to authenticated using (private.puede_editar_proyecto(private.proyecto_de_espacio(space_id)))
  with check (private.puede_editar_proyecto(private.proyecto_de_espacio(space_id)));
create policy "imágenes de espacios: baja" on public.project_space_images
  for delete to authenticated using (private.puede_editar_proyecto(private.proyecto_de_espacio(space_id)));

-- ---------------------------------------------------------------------------
-- Seguimiento: espacio que miró el visitante
-- ---------------------------------------------------------------------------
alter table public.visitor_events
  add column space_id uuid references public.project_spaces (id) on delete set null;
create index visitor_events_space_idx on public.visitor_events (space_id);

-- ---------------------------------------------------------------------------
-- Leads: campaña de la visita en la que consultó (el visitante guarda la de su primera visita)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column utm_source text check (length(utm_source) <= 100),
  add column utm_medium text check (length(utm_medium) <= 100),
  add column utm_campaign text check (length(utm_campaign) <= 100),
  add column utm_content text check (length(utm_content) <= 100),
  add column utm_term text check (length(utm_term) <= 100);
-- Sin grant de update: el admin solo cambia estado y notas (migración 0005).
