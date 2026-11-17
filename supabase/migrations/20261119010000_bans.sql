-- Suspensiones y baneos.
-- Un moderador suspende (con fecha de fin) o banea (sin fecha) una cuenta desde el servidor MCP.
-- El baneo alcanza a la cuenta y a los teléfonos que usó, así que una cuenta nueva en ese teléfono
-- tampoco puede escribir. Leer sigue funcionando. La regla vive en private.can_write() y la aplican
-- las políticas de posts, comments y reports.

-- ── Tablas ──────────────────────────────────────────────────────────────────────────────────

-- Teléfonos de cada cuenta. La app registra el suyo al iniciar sesión.
-- El identificador lo manda la app: frena a la gente normal, no a quien lo falsifique.
create table public.user_devices (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  device_id  text not null check (char_length(device_id) between 8 and 128),
  platform   text not null check (platform in ('ios', 'android')),
  first_seen timestamptz not null default now(),
  primary key (user_id, device_id)
);
create index user_devices_device_idx on public.user_devices (device_id);
alter table public.user_devices enable row level security;

create policy "Registras tus teléfonos"
  on public.user_devices for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Ves tus teléfonos"
  on public.user_devices for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Baneos. Una fila por cuenta y una por cada teléfono que tenía al banearla: así el baneo del
-- teléfono sigue aunque la cuenta se borre. ends_at null = sin fecha de fin.
-- Nadie los lee desde la app; solo por las funciones de abajo.
create table private.bans (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles (id) on delete cascade,
  device_id  text,
  reason     text not null check (char_length(btrim(reason)) between 1 and 300),
  ends_at    timestamptz,
  created_at timestamptz not null default now(),
  created_by bigint not null references private.moderators (id),
  lifted_at  timestamptz,
  lifted_by  bigint references private.moderators (id),
  constraint bans_one_target check (num_nonnulls(user_id, device_id) = 1),
  constraint bans_ends_after_start check (ends_at is null or ends_at > created_at)
);
create index bans_user_active_idx on private.bans (user_id) where lifted_at is null and user_id is not null;
create index bans_device_active_idx on private.bans (device_id) where lifted_at is null and device_id is not null;
create index bans_created_by_idx on private.bans (created_by);
create index bans_lifted_by_idx on private.bans (lifted_by) where lifted_by is not null;
alter table private.bans enable row level security;

-- La bitácora ahora también guarda baneos y hasta cuándo.
alter table private.moderation_actions drop constraint moderation_actions_action_check;
alter table private.moderation_actions add constraint moderation_actions_action_check
  check (action in ('reviewed', 'hide', 'restore', 'auto_hide', 'ban', 'unban'));
alter table private.moderation_actions add column ends_at timestamptz;

-- ── Funciones para la app ───────────────────────────────────────────────────────────────────

-- Baneos vigentes que alcanzan a una cuenta: los suyos y los de sus teléfonos.
-- Una suspensión vencida deja de contar sola, sin tareas programadas.
create function private.active_bans_for(target uuid)
returns setof private.bans
language sql
stable
set search_path = ''
as $$
  select * from private.bans
  where lifted_at is null
    and (ends_at is null or ends_at > now())
    and (
      user_id = target
      or device_id in (select device_id from public.user_devices where user_id = target)
    );
$$;

-- La única regla de "puede escribir": tiene un teléfono registrado y ningún baneo vigente.
-- security definer porque lee private.bans, que la app no puede leer.
create function private.can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_devices where user_id = (select auth.uid()))
    and not exists (select 1 from private.active_bans_for((select auth.uid())));
$$;

-- Lo que se muestra junto al alias. Solo mira baneos de la cuenta, nunca de teléfonos.
create function private.account_restriction(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when bool_or(ends_at is null) then 'banned'
    when count(*) > 0 then 'suspended'
  end
  from private.bans
  where user_id = target
    and lifted_at is null
    and (ends_at is null or ends_at > now());
$$;

-- Tu baneo vigente: el que termina más tarde (sin fecha primero). Solo el motivo y la fecha.
create function private.my_active_ban()
returns table (reason text, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select reason, ends_at
  from private.active_bans_for((select auth.uid()))
  order by ends_at desc nulls first
  limit 1;
$$;

-- Campo calculado: author:profiles(..., restriction) en los selects de la app.
create function public.restriction(public.profiles)
returns text
language sql
stable
set search_path = ''
as $$
  select private.account_restriction($1.id);
$$;

create function public.get_my_active_ban()
returns table (reason text, ends_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select * from private.my_active_ban();
$$;

-- ── Funciones para moderación (service_role) ────────────────────────────────────────────────

-- hours null = baneo sin fecha de fin; si no, de 1 a 720 horas (30 días).
-- Banear sobre una suspensión la reemplaza. Suspender sobre cualquier baneo falla: primero quitar_ban.
create function public.mod_ban(moderator_id bigint, alias text, reason text, hours int default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  target_user uuid;
  target_alias text;
  current_ends_at timestamptz;
  has_active_ban boolean;
  new_ends_at timestamptz;
  replaced_suspension boolean := false;
begin
  if reason is null or char_length(btrim(reason)) not between 1 and 300 then
    raise exception 'motivo_invalido';
  end if;
  if hours is not null and hours not between 1 and 720 then
    raise exception 'duracion_invalida';
  end if;

  -- for update: dos baneos al mismo tiempo sobre la misma cuenta esperan su turno
  select id, display_name into target_user, target_alias
  from public.profiles where display_name = lower(btrim(alias))
  for update;
  if target_user is null then
    raise exception 'alias_no_existe';
  end if;

  select true, ends_at into has_active_ban, current_ends_at
  from private.bans
  where user_id = target_user and lifted_at is null and (ends_at is null or ends_at > now())
  order by ends_at desc nulls first
  limit 1;

  if has_active_ban then
    if current_ends_at is null or hours is not null then
      raise exception 'ya_tiene_baneo';
    end if;
    -- banear sobre una suspensión: se levanta la suspensión (cuenta y teléfonos) y sigue el baneo
    update private.bans set lifted_at = now(), lifted_by = mod_ban.moderator_id
    where lifted_at is null
      and (user_id = target_user
        or device_id in (select device_id from public.user_devices where user_id = target_user));
    replaced_suspension := true;
  end if;

  if hours is not null then
    new_ends_at := now() + make_interval(hours => hours);
  end if;

  insert into private.bans (user_id, reason, ends_at, created_by)
  values (target_user, btrim(reason), new_ends_at, moderator_id);

  insert into private.bans (device_id, reason, ends_at, created_by)
  select device_id, btrim(reason), new_ends_at, moderator_id
  from public.user_devices where user_id = target_user;

  insert into private.moderation_actions (moderator_id, action, user_id, note, ends_at)
  values (
    moderator_id, 'ban', target_user,
    case when replaced_suspension then 'Reemplaza una suspensión. ' else '' end || btrim(reason),
    new_ends_at
  );

  return jsonb_build_object(
    'alias', target_alias,
    'termina', new_ends_at,
    'reemplazo_suspension', replaced_suspension
  );
end;
$$;

-- Levanta todo baneo vigente de la cuenta y de sus teléfonos.
create function public.mod_unban(moderator_id bigint, alias text, note text default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_user uuid;
begin
  select id into target_user
  from public.profiles where display_name = lower(btrim(alias))
  for update;
  if target_user is null then
    raise exception 'alias_no_existe';
  end if;

  update private.bans set lifted_at = now(), lifted_by = mod_unban.moderator_id
  where lifted_at is null
    and (ends_at is null or ends_at > now())
    and (user_id = target_user
      or device_id in (select device_id from public.user_devices where user_id = target_user));
  if not found then
    raise exception 'sin_baneo';
  end if;

  insert into private.moderation_actions (moderator_id, action, user_id, note)
  values (moderator_id, 'unban', target_user, nullif(btrim(note), ''));
end;
$$;

-- ver_autor ahora muestra el baneo vigente, el historial y cuántos teléfonos tiene (nunca cuáles).
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
    'desde', profiles.created_at,
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

-- ── Políticas: escribir pide private.can_write() ────────────────────────────────────────────

alter policy "Publicas como tú y después de aceptar las reglas"
  on public.posts
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and rules_accepted_at is not null
    )
    and (select private.can_write())
  );

-- En with check y no en using: así un baneado recibe un error y no un "0 filas" silencioso.
alter policy "Editas o borras solo tus publicaciones"
  on public.posts
  with check (author_id = (select auth.uid()) and (select private.can_write()));

alter policy "Respondes como tú, con las reglas aceptadas, a publicaciones visibles"
  on public.comments
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and rules_accepted_at is not null
    )
    and exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and posts.status = 'visible'
        and posts.deleted_at is null
    )
    and (select private.can_write())
  );

alter policy "Editas o borras solo tus respuestas"
  on public.comments
  with check (author_id = (select auth.uid()) and (select private.can_write()));

alter policy "Reportas con las reglas aceptadas algo visible que no es tuyo"
  on public.reports
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and rules_accepted_at is not null
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

-- ── Permisos ────────────────────────────────────────────────────────────────────────────────

revoke all on public.user_devices from anon, authenticated;
grant select on public.user_devices to authenticated;
grant insert (device_id, platform) on public.user_devices to authenticated;

revoke execute on function public.mod_ban(bigint, text, text, int), public.mod_unban(bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.mod_ban(bigint, text, text, int), public.mod_unban(bigint, text, text)
  to service_role;
grant select, insert, update on private.bans to service_role;
grant select on public.user_devices to service_role;

-- Primero se cierra todo lo de private y después se abren solo las tres funciones que usan las
-- políticas y la app. Si una migración futura repite este revoke, debe volver a dar estos grants.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.active_bans_for(uuid) to service_role;

-- Las políticas corren como la sesión: necesita entrar a private para llamar a estas funciones.
-- Ninguna tabla de private tiene grants para authenticated, y private no está expuesto en la API.
grant usage on schema private to authenticated;
grant execute on function private.can_write(), private.account_restriction(uuid), private.my_active_ban()
  to authenticated;

revoke execute on function public.restriction(public.profiles), public.get_my_active_ban() from public, anon;
grant execute on function public.restriction(public.profiles), public.get_my_active_ban() to authenticated;

-- Las funciones nuevas en private no quedan abiertas a nadie por defecto.
alter default privileges in schema private revoke execute on functions from public;

-- ── Deshacer (a mano, en el SQL editor) ─────────────────────────────────────────────────────
-- 1. Volver a crear las cinco políticas de arriba sin "and (select private.can_write())".
-- 2. drop function public.mod_ban(bigint, text, text, int), public.mod_unban(bigint, text, text),
--      public.get_my_active_ban(), public.restriction(public.profiles), private.my_active_ban(),
--      private.account_restriction(uuid), private.can_write(), private.active_bans_for(uuid);
--    y volver a crear public.mod_get_author desde 20261118010000_moderation.sql.
-- 3. drop table private.bans; drop table public.user_devices;
-- 4. delete from private.moderation_actions where action in ('ban', 'unban');
--    alter table private.moderation_actions drop column ends_at; y el check anterior de action.
-- 5. revoke usage on schema private from authenticated;
