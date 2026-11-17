-- Consultas para el SQL editor del dashboard durante la prueba de carga. Se corren a mano, una
-- sección a la vez. Ninguna cambia datos (la 3 se deshace con rollback).

-- 1. Antes de correr: empezar las estadísticas de cero.
select extensions.pg_stat_statements_reset();

-- 2. Después: las consultas que más tiempo tomaron dentro de la base de datos. El tiempo que ve
--    load:run incluye la red; esto es solo lo que tarda Postgres.
select
  calls,
  round(total_exec_time) as total_ms,
  round(mean_exec_time::numeric, 2) as mean_ms,
  round(max_exec_time::numeric, 1) as max_ms,
  left(regexp_replace(query, '\s+', ' ', 'g'), 200) as query
from extensions.pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by total_exec_time desc
limit 15;

-- 3. Cuánto tarda cada trigger al escribir, como un miembro (el id de un usuario de
--    load-tests/.pool.json y una publicación de otra persona). Se deshace al final.
--    Las primeras escrituras en una conexión tardan más (Postgres prepara las funciones); los dos
--    inserts de antes calientan para que el explain mida lo normal.
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<id del usuario>', 'role', 'authenticated')::text, true);
insert into public.comments (post_id, content) values (<id de la publicación>, 'Calentando, se deshace.');
insert into public.comments (post_id, content) values (<id de la publicación>, 'Calentando otra vez, se deshace.');
explain (analyze, timing)
insert into public.posts (title, content) values ('Plan de prueba de carga', 'Texto normal para medir, se deshace.');
rollback;

-- 4. Después de load:clean: debe dar 0.
select count(*) as usuarios_de_carga from public.user_devices where device_id like 'carga-%';
