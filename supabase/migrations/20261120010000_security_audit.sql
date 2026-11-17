-- Auditoría de seguridad.
-- 1. Lo que se crea de aquí en adelante ya no nace abierto para anon ni authenticated: cada
--    migración da sus grants a mano (como ya hacíamos) y si alguien olvida uno, falla cerrado.
-- 2. public.audit_api_surface() lista lo que la API deja ver o hacer a anon y authenticated.
--    La usa la prueba de instantánea (db-tests/api-surface.test.ts); solo la llama service_role.

-- ── Privilegios por defecto ─────────────────────────────────────────────────────────────────

-- Supabase da todo a anon y authenticated en cada tabla, secuencia y función nueva de public.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- Postgres da execute a public en toda función nueva. Eso solo se quita sin "in schema":
-- el revoke por esquema de 20261119010000_bans.sql no tenía efecto. Aplica a public y a private.
alter default privileges for role postgres revoke execute on functions from public;

-- ── Lo que ve la API ────────────────────────────────────────────────────────────────────────

create function public.audit_api_surface()
returns table (kind text, object_name text, role_name text, detail text)
language sql
stable
security invoker
set search_path = ''
as $$
  with api_roles (role_name) as (values ('anon'), ('authenticated')),
  relations as (
    select c.oid, n.nspname || '.' || c.relname as name, c.relkind, c.relrowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and c.relkind in ('r', 'v', 'm', 'f', 'p')
  ),
  table_privileges (privilege) as (
    values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
  )
  -- uso de los esquemas
  select 'schema', n.nspname::text, r.role_name, 'USAGE'
  from pg_catalog.pg_namespace n
  cross join api_roles r
  where n.nspname in ('public', 'private') and pg_catalog.has_schema_privilege(r.role_name, n.oid, 'USAGE')

  -- privilegios sobre la tabla completa
  union all
  select 'table', t.name, r.role_name, p.privilege
  from relations t
  cross join api_roles r
  cross join table_privileges p
  where pg_catalog.has_table_privilege(r.role_name, t.oid, p.privilege)

  -- privilegios solo sobre algunas columnas
  union all
  select 'column', t.name || '.' || a.attname, r.role_name, p.privilege
  from relations t
  join pg_catalog.pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  cross join api_roles r
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE')) as p (privilege)
  where pg_catalog.has_column_privilege(r.role_name, t.oid, a.attnum, p.privilege)
    and not pg_catalog.has_table_privilege(r.role_name, t.oid, p.privilege)

  -- rls activado o no, por tabla
  union all
  select 'rls', t.name, null, case when t.relrowsecurity then 'enabled' else 'DISABLED' end
  from relations t
  where t.relkind in ('r', 'p')

  -- políticas, con su condición, para que un cambio de lógica también se note
  union all
  select 'policy', p.schemaname || '.' || p.tablename || ': ' || p.policyname,
    pg_catalog.array_to_string(p.roles, ','),
    p.cmd || ' using (' || coalesce(p.qual, '-') || ') check (' || coalesce(p.with_check, '-') || ')'
  from pg_catalog.pg_policies p
  where p.schemaname in ('public', 'private')

  -- funciones que se pueden llamar
  union all
  select 'function', n.nspname || '.' || f.proname || '(' || pg_catalog.pg_get_function_identity_arguments(f.oid) || ')',
    r.role_name, case when f.prosecdef then 'EXECUTE security definer' else 'EXECUTE' end
  from pg_catalog.pg_proc f
  join pg_catalog.pg_namespace n on n.oid = f.pronamespace
  cross join api_roles r
  where n.nspname in ('public', 'private') and pg_catalog.has_function_privilege(r.role_name, f.oid, 'EXECUTE')

  -- privilegios por defecto de lo que crea postgres (las migraciones); '*' = todos los esquemas
  union all
  select 'default_privilege',
    coalesce(n.nspname, '*') || ' ' || case d.defaclobjtype
      when 'r' then 'tables' when 'S' then 'sequences' when 'f' then 'functions'
      when 'T' then 'types' when 'n' then 'schemas' else d.defaclobjtype::text end,
    case when a.grantee = 0 then 'public' else a.grantee::regrole::text end,
    a.privilege_type
  from pg_catalog.pg_default_acl d
  left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral pg_catalog.aclexplode(d.defaclacl) a
  where d.defaclrole = 'postgres'::regrole
    and (n.nspname is null or n.nspname in ('public', 'private'))
    and (a.grantee = 0 or a.grantee::regrole::text in ('anon', 'authenticated', 'postgres'))
$$;

comment on function public.audit_api_surface() is
  'Lo que anon y authenticated pueden ver o hacer en public y private. Solo para las pruebas.';

revoke execute on function public.audit_api_surface() from public, anon, authenticated;
grant execute on function public.audit_api_surface() to service_role;

-- ── Deshacer (a mano, en el SQL editor) ─────────────────────────────────────────────────────
-- drop function public.audit_api_surface();
-- alter default privileges for role postgres grant execute on functions to public;
-- alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
-- alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;
-- alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;
