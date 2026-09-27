-- Búsqueda por barrio, calle, ciudad, título o tipo, sin distinguir mayúsculas ni tildes.
-- La calle solo se indexa si la propiedad muestra la dirección exacta (no se filtra por búsqueda).

create function private.sin_acentos(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(translate(
    p,
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',
    'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc'
  ));
$$;

-- Declarada immutable a propósito: el cast de enum a texto es estable en la práctica
-- y una columna generada exige funciones immutable.
create function private.texto_busqueda(
  p_titulo text, p_barrio text, p_ciudad text, p_direccion text,
  p_mostrar_direccion boolean, p_tipo public.tipo_propiedad
) returns text
language sql immutable parallel safe set search_path = '' as $$
  select private.sin_acentos(concat_ws(' ',
    p_titulo, p_barrio, p_ciudad,
    case when p_mostrar_direccion then p_direccion end,
    p_tipo::text,
    case p_tipo when 'departamento' then 'depto' end
  ));
$$;

alter table public.properties add column busqueda text not null generated always as (
  private.texto_busqueda(titulo, barrio, ciudad, direccion, mostrar_direccion_exacta, tipo)
) stored;
comment on column public.properties.busqueda is 'Texto normalizado para el buscador (columna generada).';
