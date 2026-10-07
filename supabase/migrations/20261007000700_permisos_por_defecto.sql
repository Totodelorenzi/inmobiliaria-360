-- Supabase ("Automatically expose new tables") da a anon y authenticated todos los
-- permisos sobre cada tabla, secuencia y función nueva de public. Las migraciones
-- anteriores declaran sus grants una por una; esto apaga el default para que un
-- objeto futuro sin grants explícitos nunca quede expuesto por olvido.

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
-- El execute para PUBLIC es un default global de Postgres (no se puede quitar por esquema).
-- Los triggers no lo necesitan; las funciones que llama la API o una política declaran su grant.
alter default privileges for role postgres revoke execute on functions from public;

-- Las secuencias existentes (identity de visitor_events) solo las usa el servidor.
revoke all on all sequences in schema public from anon, authenticated;
