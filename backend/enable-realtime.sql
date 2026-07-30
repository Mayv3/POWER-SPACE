-- Todas las tablas que alimentan /publico deben publicar sus cambios.
-- El bloque es idempotente: se puede ejecutar aunque alguna ya esté habilitada.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'estado_competencia',
    'intentos',
    'atletas',
    'equipos',
    'coaches'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tabla
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        tabla
      );
    end if;
  end loop;
end
$$;

-- Verificar que esté habilitado
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
