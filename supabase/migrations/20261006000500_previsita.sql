-- Pre-visita y calificación: visitantes anónimos, eventos de navegación, pedidos de visita,
-- links personalizados y datos de calificación en los leads.
-- Seguridad: el público no lee ni escribe estas tablas (entran por el servidor con la clave
-- secreta, después de validar). Los miembros de la agencia solo leen lo suyo.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.tipo_evento as enum (
  'view_property', 'photo_view', 'tour_start', 'scene_view', 'tour_complete',
  'plan_view', 'plan_point_click', 'whatsapp_click', 'form_submit', 'visit_request', 'share'
);
create type public.nivel_lead as enum ('frio', 'tibio', 'caliente');
create type public.estado_lead as enum ('nuevo', 'contactado', 'visita_agendada', 'descartado', 'cerrado');
create type public.forma_pago as enum ('contado', 'credito_hipotecario', 'financiacion', 'no_sabe');
create type public.plazo_compra as enum ('inmediato', '1_3_meses', '3_6_meses', 'mas_6_meses');

-- Se usan recién en la migración siguiente (no se puede usar un valor nuevo en la misma transacción).
alter type public.origen_lead add value if not exists 'pedido_visita';
alter type public.origen_lead add value if not exists 'link_personalizado';

-- ---------------------------------------------------------------------------
-- Visitantes y links personalizados
-- ---------------------------------------------------------------------------
create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  -- Código corto que viaja en el "Ref." de WhatsApp y se copia al lead.
  codigo_ref text not null check (codigo_ref ~ '^[A-Z0-9]{4,6}$'),
  -- null: visitante creado por un link personalizado que todavía no se abrió.
  first_seen timestamptz,
  last_seen timestamptz,
  utm_source text check (length(utm_source) <= 100),
  utm_medium text check (length(utm_medium) <= 100),
  utm_campaign text check (length(utm_campaign) <= 100),
  tracked_link_id uuid,
  es_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (agency_id, codigo_ref)
);
create index visitors_agency_idx on public.visitors (agency_id, last_seen desc);

create table public.tracked_links (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[a-z0-9]{6,12}$'),
  nombre_prospecto text not null check (length(trim(nombre_prospecto)) between 1 and 120),
  telefono_prospecto text check (length(telefono_prospecto) <= 40),
  -- Visitante creado junto con el link: el navegador que lo abre lo adopta.
  visitor_id uuid references public.visitors (id) on delete set null,
  creado_por uuid references auth.users (id) on delete set null,
  es_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index tracked_links_agency_idx on public.tracked_links (agency_id, created_at desc);
create index tracked_links_property_idx on public.tracked_links (property_id);
create index tracked_links_visitor_idx on public.tracked_links (visitor_id);

alter table public.visitors
  add constraint visitors_tracked_link_id_fkey foreign key (tracked_link_id) references public.tracked_links (id) on delete set null;
create index visitors_tracked_link_idx on public.visitors (tracked_link_id);

-- ---------------------------------------------------------------------------
-- Eventos de navegación
-- ---------------------------------------------------------------------------
create table public.visitor_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  tipo public.tipo_evento not null,
  scene_id uuid references public.tour_scenes (id) on delete set null,
  plan_id uuid references public.property_plans (id) on delete set null,
  duracion_ms integer check (duracion_ms between 0 and 3600000),
  -- Sesión del navegador (se renueva tras 30 min sin actividad): cuenta visitas repetidas.
  sesion_id uuid,
  meta jsonb not null default '{}' check (jsonb_typeof(meta) = 'object' and pg_column_size(meta) <= 2048),
  created_at timestamptz not null default now()
);
create index visitor_events_visitor_idx on public.visitor_events (visitor_id, created_at);
create index visitor_events_property_idx on public.visitor_events (property_id, tipo, created_at);
create index visitor_events_agency_idx on public.visitor_events (agency_id, created_at desc);
create index visitor_events_scene_idx on public.visitor_events (scene_id);
create index visitor_events_plan_idx on public.visitor_events (plan_id);

-- ---------------------------------------------------------------------------
-- Leads: calificación
-- ---------------------------------------------------------------------------
alter table public.leads
  add column visitor_id uuid references public.visitors (id) on delete set null,
  add column codigo_ref text check (codigo_ref ~ '^[A-Z0-9]{4,6}$'),
  add column score smallint not null default 0 check (score between 0 and 100),
  add column score_detalle jsonb not null default '[]' check (jsonb_typeof(score_detalle) = 'array'),
  add column nivel public.nivel_lead not null default 'frio',
  add column estado public.estado_lead not null default 'nuevo',
  add column notas text check (length(notas) <= 5000),
  add column consentimiento_at timestamptz,
  add column ultima_actividad timestamptz not null default now(),
  add column es_demo boolean not null default false,
  add column updated_at timestamptz not null default now();

create unique index leads_un_lead_por_visitante on public.leads (agency_id, visitor_id) where visitor_id is not null;
create unique index leads_codigo_ref_unico on public.leads (agency_id, codigo_ref) where codigo_ref is not null;
create index leads_score_idx on public.leads (agency_id, score desc, ultima_actividad desc);

create trigger leads_updated_at before update on public.leads
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pedidos de visita
-- ---------------------------------------------------------------------------
create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  franja_preferida text not null default 'cualquiera' check (franja_preferida in ('manana', 'tarde', 'fin_de_semana', 'cualquiera')),
  -- null en alquileres: no aplica.
  forma_pago public.forma_pago,
  plazo public.plazo_compra,
  necesita_vender boolean,
  presupuesto_aprox numeric(14, 2) check (presupuesto_aprox >= 0),
  comentario text check (length(comentario) <= 1000),
  created_at timestamptz not null default now()
);
create index visit_requests_lead_idx on public.visit_requests (lead_id, created_at desc);
create index visit_requests_property_idx on public.visit_requests (property_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------------
create function private.agencia_de_lead(p_lead uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select agency_id from public.leads where id = p_lead;
$$;
revoke all on function private.agencia_de_lead(uuid) from public;
grant execute on function private.agencia_de_lead(uuid) to authenticated, service_role;

-- Leads: el público ya no inserta (entran por el servidor). Los miembros cambian estado y notas.
drop policy "leads: cualquiera consulta" on public.leads;
revoke insert on public.leads from anon, authenticated;
grant update (estado, notas) on public.leads to authenticated;
create policy "leads: la agencia cambia estado y notas" on public.leads
  for update to authenticated using (private.es_miembro(agency_id)) with check (private.es_miembro(agency_id));

revoke all on public.visitors, public.tracked_links, public.visitor_events, public.visit_requests from anon, authenticated;
grant select on public.visitors, public.tracked_links, public.visitor_events, public.visit_requests to authenticated;
grant all on public.visitors, public.tracked_links, public.visitor_events, public.visit_requests to service_role;
grant usage, select on all sequences in schema public to service_role;

alter table public.visitors enable row level security;
alter table public.tracked_links enable row level security;
alter table public.visitor_events enable row level security;
alter table public.visit_requests enable row level security;

create policy "visitantes: la agencia los ve" on public.visitors
  for select to authenticated using (private.es_miembro(agency_id));
create policy "links: la agencia los ve" on public.tracked_links
  for select to authenticated using (private.es_miembro(agency_id));
create policy "eventos: la agencia los ve" on public.visitor_events
  for select to authenticated using (private.es_miembro(agency_id));
create policy "pedidos de visita: la agencia los ve" on public.visit_requests
  for select to authenticated using (private.es_miembro(private.agencia_de_lead(lead_id)));

-- ---------------------------------------------------------------------------
-- Estadísticas por propiedad (security invoker: RLS limita a la agencia del usuario)
-- ---------------------------------------------------------------------------
create function public.estadisticas_propiedades(p_desde timestamptz)
returns table (
  property_id uuid,
  vistas bigint,
  visitantes bigint,
  tours_iniciados bigint,
  tours_completos bigint,
  segundos_tour_promedio numeric,
  vieron_planos bigint,
  pedidos_visita bigint
)
language sql stable security invoker set search_path = '' as $$
  with ev as (
    select e.* from public.visitor_events e
     where e.created_at >= p_desde and e.property_id is not null
  ),
  tour as (
    -- Tiempo de tour por sesión que lo inició (suma de los tiempos visibles por escena).
    select e.property_id, e.sesion_id, sum(coalesce(e.duracion_ms, 0)) as ms
      from ev e
     where e.tipo = 'scene_view'
       and exists (select 1 from ev t where t.property_id = e.property_id and t.sesion_id = e.sesion_id and t.tipo = 'tour_start')
     group by e.property_id, e.sesion_id
  )
  select
    p.id,
    count(*) filter (where ev.tipo = 'view_property'),
    count(distinct ev.visitor_id) filter (where ev.tipo = 'view_property'),
    count(distinct (ev.visitor_id, ev.sesion_id)) filter (where ev.tipo = 'tour_start'),
    count(distinct ev.visitor_id) filter (where ev.tipo = 'tour_complete'),
    coalesce((select round(avg(t.ms) / 1000.0, 1) from tour t where t.property_id = p.id), 0),
    count(distinct ev.visitor_id) filter (where ev.tipo = 'plan_view'),
    (select count(*) from public.visit_requests v where v.property_id = p.id and v.created_at >= p_desde)
  from public.properties p
  left join ev on ev.property_id = p.id
  group by p.id;
$$;
revoke all on function public.estadisticas_propiedades(timestamptz) from public, anon;
grant execute on function public.estadisticas_propiedades(timestamptz) to authenticated, service_role;
