-- Habilitar Realtime para la tabla estado_competencia
alter publication supabase_realtime add table estado_competencia;

-- Verificar que esté habilitado
select * from pg_publication_tables where pubname = 'supabase_realtime';
