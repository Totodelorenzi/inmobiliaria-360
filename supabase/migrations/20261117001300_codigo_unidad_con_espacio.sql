-- Códigos de unidad de planta baja con espacio ("PB A"). Solo afloja el check de una tabla
-- del módulo desarrolladora: los códigos existentes siguen siendo válidos.
alter table public.units drop constraint units_codigo_check;
alter table public.units add constraint units_codigo_check
  check (codigo ~ '^[A-Za-z0-9]{1,8}( [A-Za-z0-9]{1,8})?$' and length(codigo) <= 12);
