-- Inmobiliarias de prueba (tests automáticos): los tests que escriben en producción solo operan
-- dentro de una de estas, nunca en la demo ni en inmobiliarias reales.
alter table public.agencies add column es_test boolean not null default false;
comment on column public.agencies.es_test is 'Creada por los tests automáticos (subdominio e2e-…). Solo la marca la clave secreta.';
-- No entra en el grant de columnas editables del admin (migración 0009): nadie con sesión la cambia.
