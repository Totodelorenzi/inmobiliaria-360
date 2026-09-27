-- Storage: buckets públicos (lectura por URL pública) y escritura solo para miembros.
-- Convención de rutas: {agency_id}/{property_id}/{archivo}. El logo va en fotos/{agency_id}/agencia/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos', 'fotos', true, 10485760, array['image/webp', 'image/jpeg', 'image/png']),
  ('panoramas', 'panoramas', true, 20971520, array['image/webp', 'image/jpeg']),
  ('planos', 'planos', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Agencia dueña de un archivo según la primera carpeta de la ruta (null si no es un uuid).
create function private.agencia_de_ruta(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

revoke all on function private.agencia_de_ruta(text) from public;
grant execute on function private.agencia_de_ruta(text) to anon, authenticated, service_role;

create policy "storage: miembros listan su carpeta" on storage.objects
  for select to authenticated
  using (bucket_id in ('fotos', 'panoramas', 'planos') and private.es_miembro(private.agencia_de_ruta(name)));

create policy "storage: miembros suben a su carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('fotos', 'panoramas', 'planos') and private.es_miembro(private.agencia_de_ruta(name)));

create policy "storage: miembros reemplazan en su carpeta" on storage.objects
  for update to authenticated
  using (bucket_id in ('fotos', 'panoramas', 'planos') and private.es_miembro(private.agencia_de_ruta(name)))
  with check (bucket_id in ('fotos', 'panoramas', 'planos') and private.es_miembro(private.agencia_de_ruta(name)));

create policy "storage: miembros borran en su carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id in ('fotos', 'panoramas', 'planos') and private.es_miembro(private.agencia_de_ruta(name)));
