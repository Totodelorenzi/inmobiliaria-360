-- Demo "viva": corre en el tiempo la actividad de ejemplo de la inmobiliaria demo para que lo más
-- reciente sea de hace 2 horas (el panel muestra leads calientes de la semana, visitas recientes…).
-- Solo filas es_demo de la demo: no toca datos reales ni las pruebas manuales del usuario.
-- Uso: npm run demo:actualizar-fechas (antes de una presentación). Idempotente.
do $$
declare
  demo constant uuid := 'a9c0e3a1-5b1e-4c7a-9f2e-3d6b8e1f0c11';
  corrimiento interval;
begin
  select now() - interval '2 hours' - max(e.created_at) into corrimiento
  from public.visitor_events e
  join public.visitors v on v.id = e.visitor_id
  where v.agency_id = demo and v.es_demo;
  if corrimiento is null or corrimiento <= interval '0' then
    raise notice 'Nada que correr: la actividad de ejemplo ya está al día.';
    return;
  end if;

  update public.visitor_events e set created_at = e.created_at + corrimiento
  from public.visitors v
  where v.id = e.visitor_id and v.agency_id = demo and v.es_demo;

  update public.visitors
  set created_at = created_at + corrimiento, first_seen = first_seen + corrimiento, last_seen = last_seen + corrimiento
  where agency_id = demo and es_demo;

  update public.leads
  set created_at = created_at + corrimiento,
      ultima_actividad = ultima_actividad + corrimiento,
      consentimiento_at = consentimiento_at + corrimiento
  where agency_id = demo and es_demo;

  update public.visit_requests r set created_at = r.created_at + corrimiento
  from public.leads l
  where l.id = r.lead_id and l.agency_id = demo and l.es_demo;

  update public.tracked_links set created_at = created_at + corrimiento
  where agency_id = demo and es_demo;

  raise notice 'Actividad de ejemplo corrida %', corrimiento;
end $$;
