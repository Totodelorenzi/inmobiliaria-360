-- Restricciones que usan los valores de origen_lead agregados en la migración anterior.

-- Un pedido de visita siempre trae nombre y teléfono.
alter table public.leads add constraint leads_pedido_visita_contacto check (
  origen <> 'pedido_visita'
  or (coalesce(length(trim(nombre)), 0) > 0 and coalesce(length(trim(telefono)), 0) > 0)
);

-- Un link personalizado siempre tiene el nombre del prospecto.
alter table public.leads add constraint leads_link_nombre check (
  origen <> 'link_personalizado' or coalesce(length(trim(nombre)), 0) > 0
);
