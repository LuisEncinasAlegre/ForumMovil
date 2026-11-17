-- Las fechas de tu perfil solo las ves tú.
-- profiles lo lee cualquier sesión (alias y color junto a cada publicación), así que ahí no pueden
-- quedarse cuándo se creó la cuenta ni cuándo aceptó las reglas. Pasan a public.profile_private,
-- que solo lee su dueño. No se ocultan con grants por columna: el campo calculado
-- public.restriction(profiles) recibe la fila completa y necesita leer todas sus columnas.
-- Va junto con el cambio de la app que lee profile_private: una versión vieja pediría columnas
-- que ya no existen.

-- ── Tabla ───────────────────────────────────────────────────────────────────────────────────

create table public.profile_private (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  rules_accepted_at timestamptz
);

comment on table public.profile_private is 'Datos del perfil que solo ve su dueño.';
comment on column public.profile_private.rules_accepted_at is
  'Cuándo aceptó las reglas en la bienvenida. La hora la pone el servidor.';

alter table public.profile_private enable row level security;
revoke all on public.profile_private from anon, authenticated;
grant select on public.profile_private to authenticated;
grant update (rules_accepted_at) on public.profile_private to authenticated;
grant select, insert, update, delete on public.profile_private to service_role;

create policy "Ves tus datos privados"
  on public.profile_private for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Aceptas las reglas en tu perfil"
  on public.profile_private for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Copia lo que ya había antes de borrar las columnas.
insert into public.profile_private (user_id, created_at, rules_accepted_at)
select id, created_at, rules_accepted_at from public.profiles;

-- ── Triggers ────────────────────────────────────────────────────────────────────────────────

-- El perfil nuevo también crea su fila privada.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    begin
      insert into public.profiles (id, display_name)
      values (new.id, private.generate_alias());
      insert into public.profile_private (user_id) values (new.id);
      return new;
    exception when unique_violation then
      -- el alias ya existía: probamos otro, pero sin ciclar para siempre
      if attempt >= 10 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- La hora de aceptar las reglas la sigue poniendo el servidor (misma función, otra tabla).
drop trigger profiles_keep_rules_acceptance on public.profiles;
create trigger profile_private_keep_rules_acceptance
  before update on public.profile_private
  for each row execute function private.keep_rules_acceptance();

-- ── Políticas: "aceptó las reglas" se lee de profile_private ────────────────────────────────

alter policy "Publicas como tú y después de aceptar las reglas"
  on public.posts
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profile_private
      where user_id = (select auth.uid()) and rules_accepted_at is not null
    )
    and (select private.can_write())
  );

alter policy "Respondes como tú, con las reglas aceptadas, a publicaciones visibles"
  on public.comments
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profile_private
      where user_id = (select auth.uid()) and rules_accepted_at is not null
    )
    and exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and posts.status = 'visible'
        and posts.deleted_at is null
    )
    and (select private.can_write())
  );

alter policy "Reportas con las reglas aceptadas algo visible que no es tuyo"
  on public.reports
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from public.profile_private
      where user_id = (select auth.uid()) and rules_accepted_at is not null
    )
    and (
      exists (
        select 1 from public.posts
        where posts.id = reports.post_id
          and posts.status = 'visible'
          and posts.deleted_at is null
          and posts.author_id <> (select auth.uid())
      )
      or exists (
        select 1 from public.comments
        where comments.id = reports.comment_id
          and comments.status = 'visible'
          and comments.deleted_at is null
          and comments.author_id <> (select auth.uid())
      )
    )
    and (select private.can_write())
  );


-- ── ver_autor lee "desde" de profile_private ───────────────────────────────────────────────

create or replace function public.mod_get_author(alias text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  found_author_id uuid;
  result jsonb;
begin
  select id into found_author_id from public.profiles where display_name = lower(btrim(alias));
  if found_author_id is null then
    raise exception 'alias_no_existe';
  end if;

  select jsonb_build_object(
    'alias', profiles.display_name,
    'desde', (select profile_private.created_at from public.profile_private where profile_private.user_id = profiles.id),
    'publicaciones', (select count(*) from public.posts where posts.author_id = profiles.id),
    'publicaciones_ocultas', (select count(*) from public.posts where posts.author_id = profiles.id and status = 'hidden'),
    'respuestas', (select count(*) from public.comments where comments.author_id = profiles.id),
    'respuestas_ocultas', (select count(*) from public.comments where comments.author_id = profiles.id and status = 'hidden'),
    'advertencias', private.warning_count(profiles.id),
    'dispositivos', (select count(*) from public.user_devices where user_devices.user_id = profiles.id),
    'baneo_activo', (
      select jsonb_build_object('motivo', reason, 'termina', ends_at, 'desde', created_at)
      from private.bans
      where bans.user_id = profiles.id and lifted_at is null and (ends_at is null or ends_at > now())
      order by ends_at desc nulls first
      limit 1
    ),
    -- bloqueado por el baneo de otra cuenta que usó el mismo teléfono
    'bloqueado_por_telefono', exists (
      select 1 from private.active_bans_for(profiles.id) as device_bans where device_bans.user_id is null
    ) and not exists (
      select 1 from private.bans
      where bans.user_id = profiles.id and lifted_at is null and (ends_at is null or ends_at > now())
    ),
    'baneos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'motivo', reason, 'desde', created_at, 'termina', ends_at, 'quitado', lifted_at
      ) order by created_at desc), '[]'::jsonb)
      from private.bans where bans.user_id = profiles.id
    ),
    'avisos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'post_id', post_id, 'comment_id', comment_id, 'categoria', category, 'mensaje', message,
        'cuenta', counts_as_warning, 'retirado', withdrawn_at is not null, 'fecha', created_at
      ) order by created_at desc), '[]'::jsonb)
      from public.moderation_notices where user_id = profiles.id
    ),
    'acciones_recientes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'accion', action, 'post_id', post_id, 'comment_id', comment_id, 'categoria', category,
        'nota', note, 'termina', ends_at, 'fecha', created_at
      ) order by created_at desc), '[]'::jsonb)
      from (
        select * from private.moderation_actions
        where moderation_actions.user_id = profiles.id
        order by created_at desc
        limit 20
      ) as recent
    )
  ) into result
  from public.profiles
  where profiles.id = found_author_id;

  return result;
end;
$$;

-- ── Columnas que ya no van en profiles ─────────────────────────────────────────────────────

alter table public.profiles drop column rules_accepted_at, drop column created_at;

-- ── Deshacer (a mano, en el SQL editor, junto con la versión anterior de la app) ────────────
-- 1. alter table public.profiles add column rules_accepted_at timestamptz,
--      add column created_at timestamptz not null default now();
--    update public.profiles set rules_accepted_at = p.rules_accepted_at, created_at = p.created_at
--      from public.profile_private p where p.user_id = profiles.id;
--    grant update (rules_accepted_at) on public.profiles to authenticated;
-- 2. Volver a crear las tres políticas, private.handle_new_user y public.mod_get_author
--    desde 20261119010000_bans.sql y 20261116032910_profiles.sql.
-- 3. drop trigger profile_private_keep_rules_acceptance on public.profile_private;
--    create trigger profiles_keep_rules_acceptance before update on public.profiles
--      for each row execute function private.keep_rules_acceptance();
-- 4. drop table public.profile_private;
