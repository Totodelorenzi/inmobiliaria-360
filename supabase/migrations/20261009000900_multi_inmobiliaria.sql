-- Varias inmobiliarias en una sola plataforma: cada web se reconoce por su dominio, las
-- direcciones de propiedades son únicas por inmobiliaria y hay superadmins de la plataforma.

-- ---------------------------------------------------------------------------
-- Dominios de cada inmobiliaria
-- ---------------------------------------------------------------------------
alter table public.agencies
  add column subdominio text,
  add column dominio_propio text;

-- Las existentes reciben un subdominio a partir del nombre (con sufijo si se repite).
with base as (
  select id, created_at,
    coalesce(nullif(left(trim(both '-' from regexp_replace(private.sin_acentos(nombre), '[^a-z0-9]+', '-', 'g')), 36), ''), 'inmobiliaria') as b
  from public.agencies
), numerada as (
  select id, b, row_number() over (partition by b order by created_at, id) as n from base
)
update public.agencies a
set subdominio = case when n.n = 1 and length(n.b) >= 3 then n.b else n.b || '-' || n.n end
from numerada n
where a.id = n.id;

alter table public.agencies
  alter column subdominio set not null,
  add constraint agencies_subdominio_key unique (subdominio),
  add constraint agencies_dominio_propio_key unique (dominio_propio),
  -- 3 a 40 letras minúsculas, números o guiones (sin guion al principio, al final ni doble).
  add constraint agencies_subdominio_formato check (
    subdominio ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' and subdominio !~ '--'
    and subdominio not in ('app', 'www', 'admin', 'api', 'panel', 'mail', 'smtp', 'ftp', 'static', 'assets', 'cdn', 's')
  ),
  -- Dominio en minúsculas, sin protocolo, sin "www." y con al menos un punto.
  add constraint agencies_dominio_propio_formato check (
    dominio_propio is null or (
      length(dominio_propio) <= 253
      and dominio_propio ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$'
      and dominio_propio !~ '^www\.'
    )
  );

comment on column public.agencies.subdominio is 'Web pública en <subdominio>.<DOMINIO_BASE>. Solo lo cambia la plataforma.';
comment on column public.agencies.dominio_propio is 'Dominio propio opcional (sin www). Solo lo cambia la plataforma.';

-- El admin de una inmobiliaria edita su marca y contacto, no sus dominios.
revoke update on public.agencies from authenticated;
grant update (nombre, logo_url, color_primario, whatsapp, email, telefono, direccion, instagram, facebook)
  on public.agencies to authenticated;

-- ---------------------------------------------------------------------------
-- Slugs únicos por inmobiliaria
-- ---------------------------------------------------------------------------
alter table public.properties drop constraint properties_slug_key;
alter table public.properties add constraint properties_agencia_slug_key unique (agency_id, slug);

-- ---------------------------------------------------------------------------
-- Superadmins de la plataforma (crean inmobiliarias y configuran dominios)
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;
-- Cada usuario solo puede ver si él mismo es superadmin. Las altas se hacen con la clave secreta.
create policy "plataforma: cada uno se ve a sí mismo" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));
