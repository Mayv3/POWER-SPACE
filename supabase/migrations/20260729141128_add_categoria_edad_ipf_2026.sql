alter table if exists public.atletas
    add column if not exists categoria_edad text[];

-- Si una versión anterior de esta migración dejó el campo como texto,
-- lo convierte sin perder la categoría ya cargada.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'atletas'
          and column_name = 'categoria_edad'
          and udt_name <> '_text'
    ) then
        alter table public.atletas drop constraint if exists atletas_categoria_edad_check;
        alter table public.atletas
            alter column categoria_edad type text[]
            using case
                when categoria_edad is null then null
                else array[categoria_edad]
            end;
    end if;
end
$$;

-- Conserva operativos los atletas ya cargados. En las edades que también
-- admiten Open se asigna primero su división etaria natural; luego puede
-- cambiarse manualmente desde la edición del atleta.
update public.atletas
set categoria_edad = case
    when current_date < fecha_nacimiento + interval '14 years' then null
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 18 then array['Sub-Junior']
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 23 then array['Junior']
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 39 then array['Open']
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 49 then array['Master I']
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 59 then array['Master II']
    when extract(year from current_date)::int - extract(year from fecha_nacimiento)::int <= 69 then array['Master III']
    else array['Master IV']
end
where categoria_edad is null
  and fecha_nacimiento is not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'atletas_categoria_edad_check'
          and conrelid = 'public.atletas'::regclass
    ) then
        alter table public.atletas
            add constraint atletas_categoria_edad_check
            check (
                categoria_edad is null
                or categoria_edad <@ array[
                    'Sub-Junior',
                    'Junior',
                    'Open',
                    'Master I',
                    'Master II',
                    'Master III',
                    'Master IV'
                ]::text[]
            );
    end if;
end
$$;

drop index if exists public.atletas_categoria_edad_categoria_idx;

create index if not exists atletas_categoria_edad_gin_idx
    on public.atletas using gin (categoria_edad);

create index if not exists atletas_categoria_idx
    on public.atletas (categoria);
