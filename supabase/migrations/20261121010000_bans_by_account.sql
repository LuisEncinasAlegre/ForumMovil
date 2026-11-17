-- Cada baneo de teléfono recuerda de qué cuenta salió.
-- Antes, quitar el baneo de una cuenta levantaba todos los baneos de sus teléfonos, también los
-- que puso otra cuenta baneada en el mismo teléfono. Ahora solo se levantan los suyos.

-- set null: si la cuenta se borra, el baneo del teléfono sigue (es justo para lo que existe).
alter table private.bans
  add column source_user_id uuid references public.profiles (id) on delete set null;

-- solo las filas de teléfono lo tienen
alter table private.bans
  add constraint bans_source_only_for_devices check (source_user_id is null or device_id is not null);

create index bans_source_user_active_idx on private.bans (source_user_id)
  where lifted_at is null and source_user_id is not null;

-- Las filas que ya existen: mod_ban crea la de la cuenta y las de sus teléfonos en la misma
-- transacción, así que comparten created_at (now()) y moderador.
update private.bans as device_ban
set source_user_id = (
  select account_ban.user_id
  from private.bans as account_ban
  where account_ban.user_id is not null
    and account_ban.created_at = device_ban.created_at
    and account_ban.created_by = device_ban.created_by
  limit 1
)
where device_ban.device_id is not null;

create or replace function public.mod_ban(moderator_id bigint, alias text, reason text, hours int default null)
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
    -- banear sobre una suspensión: se levanta la suspensión de esta cuenta (y los teléfonos que
    -- ella baneó) y sigue el baneo; los baneos de otras cuentas en el mismo teléfono no se tocan
    update private.bans set lifted_at = now(), lifted_by = mod_ban.moderator_id
    where lifted_at is null
      and (user_id = target_user or source_user_id = target_user);
    replaced_suspension := true;
  end if;

  if hours is not null then
    new_ends_at := now() + make_interval(hours => hours);
  end if;

  insert into private.bans (user_id, reason, ends_at, created_by)
  values (target_user, btrim(reason), new_ends_at, moderator_id);

  insert into private.bans (device_id, source_user_id, reason, ends_at, created_by)
  select device_id, target_user, btrim(reason), new_ends_at, moderator_id
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

-- Levanta el baneo vigente de la cuenta y los de teléfono que salieron de ella.
-- Si otra cuenta baneada usó el mismo teléfono, ese baneo sigue.
create or replace function public.mod_unban(moderator_id bigint, alias text, note text default null)
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
    and (user_id = target_user or source_user_id = target_user);
  if not found then
    raise exception 'sin_baneo';
  end if;

  insert into private.moderation_actions (moderator_id, action, user_id, note)
  values (moderator_id, 'unban', target_user, nullif(btrim(note), ''));
end;
$$;
