-- Moderación a mano.
-- Revisiones automáticas (reglas, sin IA) llenan una cola de pendientes. Los moderadores la
-- atienden con el servidor MCP (Edge Function `moderacion`), que llama a las funciones mod_*.
-- Las reglas viven aquí: la función solo traduce herramientas a llamadas.
-- Al ocultar algo, su autor recibe un aviso que cuenta como advertencia.

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Tablas ──────────────────────────────────────────────────────────────────────────────────

-- Moderadores. Se crean desde el SQL editor con private.create_moderator('nombre').
create table private.moderators (
  id          bigint generated always as identity primary key,
  name        text not null unique check (char_length(btrim(name)) between 1 and 60),
  token_hash  text not null unique,              -- sha256 del token; el token solo se muestra al crearlo
  created_at  timestamptz not null default now(),
  disabled_at timestamptz
);

-- Palabras que mandan algo a revisión. Se guardan en minúsculas y sin acentos:
--   insert into private.flag_words (word) values ('palabra');
--   delete from private.flag_words where word = 'martillo';
create table private.flag_words (
  word text primary key check (word = lower(word) and char_length(word) between 2 and 60)
);

-- Pendientes de revisión. Una sola fila abierta por publicación o respuesta.
create table private.review_items (
  id          bigint generated always as identity primary key,
  post_id     bigint references public.posts (id) on delete cascade,
  comment_id  bigint references public.comments (id) on delete cascade,
  reasons     text[] not null check (reasons <@ array['reportado', 'palabra', 'enlace', 'repetido', '10_reportes']
                                     and cardinality(reasons) > 0),
  state       text not null default 'open' check (state in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by bigint references private.moderators (id),
  constraint review_items_one_target check (num_nonnulls(post_id, comment_id) = 1),
  constraint review_items_resolved_has_date check ((state = 'resolved') = (resolved_at is not null))
);
create unique index review_items_open_post_idx on private.review_items (post_id)
  where state = 'open' and post_id is not null;
create unique index review_items_open_comment_idx on private.review_items (comment_id)
  where state = 'open' and comment_id is not null;
create index review_items_open_created_idx on private.review_items (created_at) where state = 'open';
create index review_items_post_idx on private.review_items (post_id) where post_id is not null;
create index review_items_comment_idx on private.review_items (comment_id) where comment_id is not null;

-- Bitácora de todo lo que hace moderación. moderator_id null = lo hizo el sistema.
create table private.moderation_actions (
  id           bigint generated always as identity primary key,
  moderator_id bigint references private.moderators (id),
  action       text not null check (action in ('reviewed', 'hide', 'restore', 'auto_hide')),
  post_id      bigint references public.posts (id) on delete set null,
  comment_id   bigint references public.comments (id) on delete set null,
  user_id      uuid references public.profiles (id) on delete set null,
  category     text check (category in ('spam', 'acoso', 'inapropiado', 'otro')),
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now()
);
create index moderation_actions_created_idx on private.moderation_actions (created_at desc);
create index moderation_actions_user_idx on private.moderation_actions (user_id, created_at desc);
create index moderation_actions_post_idx on private.moderation_actions (post_id) where post_id is not null;
create index moderation_actions_comment_idx on private.moderation_actions (comment_id) where comment_id is not null;
create index moderation_actions_moderator_idx on private.moderation_actions (moderator_id);

-- Las tablas privadas no se exponen, pero igual activamos RLS (sin políticas) por si acaso.
alter table private.moderators enable row level security;
alter table private.flag_words enable row level security;
alter table private.review_items enable row level security;
alter table private.moderation_actions enable row level security;

-- Avisos para el autor de lo que se ocultó. La app solo lee los suyos y los marca como vistos.
create table public.moderation_notices (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  post_id           bigint references public.posts (id) on delete cascade,
  comment_id        bigint references public.comments (id) on delete cascade,
  category          text not null check (category in ('spam', 'acoso', 'inapropiado', 'otro')),
  message           text not null check (char_length(btrim(message)) between 1 and 300),
  excerpt           text not null,                    -- lo ocultado, recortado, para mostrarlo en el aviso
  counts_as_warning boolean not null default true,    -- false en el ocultado automático por 10 reportes
  created_at        timestamptz not null default now(),
  seen_at           timestamptz,
  withdrawn_at      timestamptz,                      -- se restauró: ya no cuenta
  constraint moderation_notices_one_target check (num_nonnulls(post_id, comment_id) = 1)
);
comment on table public.moderation_notices is 'Avisos de moderación. Los escribe solo la base; la app marca seen_at.';
create index moderation_notices_user_idx on public.moderation_notices (user_id, created_at desc);
create index moderation_notices_post_idx on public.moderation_notices (post_id) where post_id is not null;
create index moderation_notices_comment_idx on public.moderation_notices (comment_id) where comment_id is not null;

alter table public.moderation_notices enable row level security;
revoke all on public.moderation_notices from anon, authenticated;
grant select on public.moderation_notices to authenticated;
grant update (seen_at) on public.moderation_notices to authenticated;

create policy "Ves tus avisos"
  on public.moderation_notices for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Marcas como vistos tus avisos"
  on public.moderation_notices for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Revisiones automáticas ──────────────────────────────────────────────────────────────────

-- Minúsculas, sin acentos y con un solo espacio, para comparar textos.
create function private.normalize_text(body text)
returns text
language sql
stable
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent(btrim(body))), '\s+', ' ', 'g');
$$;

-- Qué razones aplican a un texto. own_post_id / own_comment_id es la fila que se revisa,
-- para no compararla consigo misma al buscar repetidos.
create function private.flag_reasons(author uuid, body text, own_post_id bigint, own_comment_id bigint)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized text := private.normalize_text(body);
  found_reasons text[] := '{}';
begin
  if exists (
    select 1 from private.flag_words
    where normalized ~ ('\m' || flag_words.word || '\M')
  ) then
    found_reasons := array_append(found_reasons, 'palabra');
  end if;

  if body ~* '(https?://|www\.)' then
    found_reasons := array_append(found_reasons, 'enlace');
  end if;

  -- el mismo texto de la misma persona en las últimas 24 horas (incluye lo borrado u oculto)
  if own_post_id is not null and exists (
    select 1 from public.posts
    where author_id = author
      and id <> own_post_id
      and created_at > now() - interval '24 hours'
      and private.normalize_text(title || ' ' || content) = normalized
  ) then
    found_reasons := array_append(found_reasons, 'repetido');
  elsif own_comment_id is not null and exists (
    select 1 from public.comments
    where author_id = author
      and id <> own_comment_id
      and created_at > now() - interval '24 hours'
      and private.normalize_text(content) = normalized
  ) then
    found_reasons := array_append(found_reasons, 'repetido');
  end if;

  return found_reasons;
end;
$$;

-- Abre el pendiente de una cosa o le suma razones si ya estaba abierto.
create function private.flag_item(target_post_id bigint, target_comment_id bigint, new_reasons text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if cardinality(new_reasons) = 0 then
    return;
  end if;

  if target_post_id is not null then
    insert into private.review_items (post_id, reasons)
    values (target_post_id, new_reasons)
    on conflict (post_id) where state = 'open' and post_id is not null
    do update set reasons = array(
      select distinct unnest(review_items.reasons || excluded.reasons) order by 1
    );
  else
    insert into private.review_items (comment_id, reasons)
    values (target_comment_id, new_reasons)
    on conflict (comment_id) where state = 'open' and comment_id is not null
    do update set reasons = array(
      select distinct unnest(review_items.reasons || excluded.reasons) order by 1
    );
  end if;
end;
$$;

create function private.check_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is null then
    perform private.flag_item(
      new.id, null,
      private.flag_reasons(new.author_id, new.title || ' ' || new.content, new.id, null)
    );
  end if;
  return null;
end;
$$;

create trigger posts_check_insert
  after insert on public.posts
  for each row execute function private.check_post();

-- Solo cuando cambió el texto: ocultar o borrar no vuelve a revisar.
create trigger posts_check_update
  after update of title, content on public.posts
  for each row
  when (old.title is distinct from new.title or old.content is distinct from new.content)
  execute function private.check_post();

create function private.check_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is null then
    perform private.flag_item(
      null, new.id,
      private.flag_reasons(new.author_id, new.content, null, new.id)
    );
  end if;
  return null;
end;
$$;

create trigger comments_check_insert
  after insert on public.comments
  for each row execute function private.check_comment();

create trigger comments_check_update
  after update of content on public.comments
  for each row
  when (old.content is distinct from new.content)
  execute function private.check_comment();

-- Cada reporte abre o amplía el pendiente. Al décimo reporte (son uno por persona) se oculta
-- solo mientras moderación lo revisa, salvo que un moderador ya lo haya restaurado antes.
create function private.check_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_count int;
  top_reason text;
  target_author uuid;
  target_excerpt text;
begin
  perform private.flag_item(new.post_id, new.comment_id, array['reportado']);

  select count(*) into report_count from public.reports
  where post_id is not distinct from new.post_id and comment_id is not distinct from new.comment_id;

  if report_count < 10 then
    return null;
  end if;

  if exists (
    select 1 from private.moderation_actions
    where action = 'restore'
      and post_id is not distinct from new.post_id
      and comment_id is not distinct from new.comment_id
  ) then
    return null;
  end if;

  -- la razón más reportada; 'otro' si empatan con ella
  select reason into top_reason from public.reports
  where post_id is not distinct from new.post_id and comment_id is not distinct from new.comment_id
  group by reason
  order by count(*) desc, (reason = 'otro') desc
  limit 1;

  if new.post_id is not null then
    update public.posts set status = 'hidden'
    where id = new.post_id and status = 'visible' and deleted_at is null
    returning author_id, left(title, 140) into target_author, target_excerpt;
  else
    update public.comments set status = 'hidden'
    where id = new.comment_id and status = 'visible' and deleted_at is null
    returning author_id, left(content, 140) into target_author, target_excerpt;
  end if;

  if target_author is null then
    return null;  -- ya estaba oculto o borrado
  end if;

  perform private.flag_item(new.post_id, new.comment_id, array['10_reportes']);

  insert into public.moderation_notices
    (user_id, post_id, comment_id, category, message, excerpt, counts_as_warning)
  values (
    target_author, new.post_id, new.comment_id, top_reason,
    'Varias personas lo reportaron. Lo ocultamos mientras moderación lo revisa.',
    target_excerpt, false
  );

  insert into private.moderation_actions (action, post_id, comment_id, user_id, category, note)
  values ('auto_hide', new.post_id, new.comment_id, target_author, top_reason, '10 reportes');

  return null;
end;
$$;

create trigger reports_check_insert
  after insert on public.reports
  for each row execute function private.check_report();

-- ── Moderadores ─────────────────────────────────────────────────────────────────────────────

-- Desde el SQL editor: select private.create_moderator('Ana');
-- Devuelve el token una sola vez; en la base solo queda su sha256.
create function private.create_moderator(moderator_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into private.moderators (name, token_hash)
  values (moderator_name, encode(extensions.digest(new_token, 'sha256'), 'hex'));
  return new_token;
end;
$$;

-- ── Funciones mod_* (solo service_role: las llama el servidor MCP) ─────────────────────────

-- Token → id del moderador activo.
create function public.mod_whoami(token text)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  found_id bigint;
begin
  select id into found_id from private.moderators
  where token_hash = encode(extensions.digest(token, 'sha256'), 'hex') and disabled_at is null;
  if found_id is null then
    raise exception 'token_invalido';
  end if;
  return found_id;
end;
$$;

-- Revisa que venga exactamente una cosa (publicación o respuesta).
create function private.require_one_target(target_post_id bigint, target_comment_id bigint)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if num_nonnulls(target_post_id, target_comment_id) <> 1 then
    raise exception 'objetivo_invalido' using hint = 'Manda post_id o comment_id, no los dos.';
  end if;
end;
$$;

-- Cuántas advertencias vigentes tiene una persona.
create function private.warning_count(target_user uuid)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.moderation_notices
  where user_id = target_user and counts_as_warning and withdrawn_at is null;
$$;

create function public.mod_list_pending(max_items int default 20)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb)
  from (
    select
      review_items.created_at,
      jsonb_build_object(
        'tipo', case when review_items.post_id is not null then 'publicacion' else 'respuesta' end,
        'post_id', coalesce(review_items.post_id, comments.post_id),
        'comment_id', review_items.comment_id,
        'titulo', posts.title,
        'texto', coalesce(comments.content, posts.content),
        'estado', coalesce(comments.status, posts.status),
        'razones', review_items.reasons,
        'reportes', (
          select coalesce(jsonb_object_agg(reason, total), '{}'::jsonb)
          from (
            select reason, count(*) as total from public.reports
            where reports.post_id is not distinct from review_items.post_id
              and reports.comment_id is not distinct from review_items.comment_id
            group by reason
          ) as counts
        ),
        'autor', profiles.display_name,
        'advertencias_del_autor', private.warning_count(profiles.id),
        'pendiente_desde', review_items.created_at
      ) as item
    from private.review_items
    left join public.comments on comments.id = review_items.comment_id
    left join public.posts on posts.id = coalesce(review_items.post_id, comments.post_id)
    join public.profiles on profiles.id = coalesce(comments.author_id, posts.author_id)
    where review_items.state = 'open'
    order by review_items.created_at
    limit least(greatest(max_items, 1), 50)
  ) as pending;
$$;

create function public.mod_get_content(target_post_id bigint, target_comment_id bigint)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform private.require_one_target(target_post_id, target_comment_id);

  if target_post_id is not null then
    select jsonb_build_object(
      'tipo', 'publicacion',
      'post_id', posts.id,
      'titulo', posts.title,
      'texto', posts.content,
      'estado', posts.status,
      'borrada', posts.deleted_at is not null,
      'autor', profiles.display_name,
      'creada', posts.created_at,
      'editada', posts.edited_at,
      'versiones_anteriores', (
        select coalesce(jsonb_agg(jsonb_build_object('titulo', title, 'texto', content, 'escrita', written_at) order by id), '[]'::jsonb)
        from public.post_edits where post_id = posts.id
      ),
      'respuestas', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'comment_id', comments.id, 'autor', reply_authors.display_name,
          'texto', comments.content, 'estado', comments.status,
          'borrada', comments.deleted_at is not null) order by comments.id), '[]'::jsonb)
        from public.comments
        join public.profiles as reply_authors on reply_authors.id = comments.author_id
        where comments.post_id = posts.id
      )
    ) into result
    from public.posts
    join public.profiles on profiles.id = posts.author_id
    where posts.id = target_post_id;
  else
    select jsonb_build_object(
      'tipo', 'respuesta',
      'comment_id', comments.id,
      'post_id', comments.post_id,
      'titulo_de_la_publicacion', posts.title,
      'texto', comments.content,
      'estado', comments.status,
      'borrada', comments.deleted_at is not null,
      'autor', profiles.display_name,
      'creada', comments.created_at,
      'editada', comments.edited_at,
      'versiones_anteriores', (
        select coalesce(jsonb_agg(jsonb_build_object('texto', content, 'escrita', written_at) order by id), '[]'::jsonb)
        from public.comment_edits where comment_id = comments.id
      )
    ) into result
    from public.comments
    join public.posts on posts.id = comments.post_id
    join public.profiles on profiles.id = comments.author_id
    where comments.id = target_comment_id;
  end if;

  if result is null then
    raise exception 'no_existe';
  end if;

  return result || jsonb_build_object(
    'reportes', (
      select coalesce(jsonb_object_agg(reason, total), '{}'::jsonb)
      from (
        select reason, count(*) as total from public.reports
        where post_id is not distinct from target_post_id and comment_id is not distinct from target_comment_id
        group by reason
      ) as counts
    ),
    'pendiente', (
      select jsonb_build_object('razones', reasons, 'desde', created_at)
      from private.review_items
      where state = 'open'
        and post_id is not distinct from target_post_id and comment_id is not distinct from target_comment_id
    )
  );
end;
$$;

create function public.mod_get_author(alias text)
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
        'nota', note, 'fecha', created_at
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

create function public.mod_summary(since timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'desde', since,
    'publicaciones_nuevas', (select count(*) from public.posts where created_at >= since),
    'respuestas_nuevas', (select count(*) from public.comments where created_at >= since),
    'reportes', (
      select coalesce(jsonb_object_agg(reason, total), '{}'::jsonb)
      from (select reason, count(*) as total from public.reports where created_at >= since group by reason) as counts
    ),
    'pendientes_abiertos', (select count(*) from private.review_items where state = 'open'),
    'pendientes_nuevos', (select count(*) from private.review_items where created_at >= since),
    'acciones', (
      select coalesce(jsonb_object_agg(action, total), '{}'::jsonb)
      from (select action, count(*) as total from private.moderation_actions where created_at >= since group by action) as counts
    )
  );
$$;

-- Cierra el pendiente abierto de una cosa, si hay uno. Devuelve si había.
create function private.resolve_item(moderator bigint, target_post_id bigint, target_comment_id bigint)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update private.review_items
  set state = 'resolved', resolved_at = now(), resolved_by = moderator
  where state = 'open'
    and post_id is not distinct from target_post_id and comment_id is not distinct from target_comment_id;
  return found;
end;
$$;

create function public.mod_mark_reviewed(moderator_id bigint, target_post_id bigint, target_comment_id bigint, note text default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_author uuid;
begin
  perform private.require_one_target(target_post_id, target_comment_id);
  if not private.resolve_item(moderator_id, target_post_id, target_comment_id) then
    raise exception 'sin_pendiente' using hint = 'Eso no está en la cola de revisión.';
  end if;

  if target_post_id is not null then
    select author_id into target_author from public.posts where id = target_post_id;
  else
    select author_id into target_author from public.comments where id = target_comment_id;
  end if;

  insert into private.moderation_actions (moderator_id, action, post_id, comment_id, user_id, note)
  values (moderator_id, 'reviewed', target_post_id, target_comment_id, target_author, note);
end;
$$;

create function public.mod_hide(
  moderator_id bigint,
  target_post_id bigint,
  target_comment_id bigint,
  category text,
  message text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_status text;
  current_deleted_at timestamptz;
  target_author uuid;
  target_excerpt text;
  auto_notice_id bigint;
begin
  perform private.require_one_target(target_post_id, target_comment_id);
  if category is null or category not in ('spam', 'acoso', 'inapropiado', 'otro') then
    raise exception 'categoria_invalida';
  end if;
  if message is null or char_length(btrim(message)) not between 1 and 300 then
    raise exception 'mensaje_invalido' using hint = 'Entre 1 y 300 caracteres.';
  end if;

  if target_post_id is not null then
    select status, deleted_at, author_id, left(title, 140)
    into current_status, current_deleted_at, target_author, target_excerpt
    from public.posts where id = target_post_id for update;
  else
    select status, deleted_at, author_id, left(content, 140)
    into current_status, current_deleted_at, target_author, target_excerpt
    from public.comments where id = target_comment_id for update;
  end if;

  if target_author is null then
    raise exception 'no_existe';
  end if;
  if current_deleted_at is not null then
    raise exception 'esta_borrado';
  end if;

  if current_status = 'hidden' then
    -- solo se puede "confirmar" lo que ocultaron los 10 reportes
    select id into auto_notice_id from public.moderation_notices
    where post_id is not distinct from target_post_id and comment_id is not distinct from target_comment_id
      and not counts_as_warning and withdrawn_at is null;
    if auto_notice_id is null then
      raise exception 'ya_esta_oculto';
    end if;
    -- el aviso pasa a contar y se vuelve a mostrar con el motivo del moderador
    update public.moderation_notices
    set counts_as_warning = true, category = mod_hide.category, message = btrim(mod_hide.message), seen_at = null
    where id = auto_notice_id;
  else
    if target_post_id is not null then
      update public.posts set status = 'hidden' where id = target_post_id;
    else
      update public.comments set status = 'hidden' where id = target_comment_id;
    end if;
    insert into public.moderation_notices (user_id, post_id, comment_id, category, message, excerpt)
    values (target_author, target_post_id, target_comment_id, category, btrim(message), target_excerpt);
  end if;

  perform private.resolve_item(moderator_id, target_post_id, target_comment_id);

  insert into private.moderation_actions (moderator_id, action, post_id, comment_id, user_id, category, note)
  values (moderator_id, 'hide', target_post_id, target_comment_id, target_author, category, btrim(message));
end;
$$;

create function public.mod_restore(moderator_id bigint, target_post_id bigint, target_comment_id bigint, note text default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_status text;
  current_deleted_at timestamptz;
  target_author uuid;
begin
  perform private.require_one_target(target_post_id, target_comment_id);

  if target_post_id is not null then
    select status, deleted_at, author_id into current_status, current_deleted_at, target_author
    from public.posts where id = target_post_id for update;
  else
    select status, deleted_at, author_id into current_status, current_deleted_at, target_author
    from public.comments where id = target_comment_id for update;
  end if;

  if target_author is null then
    raise exception 'no_existe';
  end if;
  if current_deleted_at is not null then
    raise exception 'esta_borrado';
  end if;
  if current_status <> 'hidden' then
    raise exception 'no_esta_oculto';
  end if;

  if target_post_id is not null then
    update public.posts set status = 'visible' where id = target_post_id;
  else
    update public.comments set status = 'visible' where id = target_comment_id;
  end if;

  update public.moderation_notices set withdrawn_at = now()
  where post_id is not distinct from target_post_id and comment_id is not distinct from target_comment_id
    and withdrawn_at is null;

  perform private.resolve_item(moderator_id, target_post_id, target_comment_id);

  insert into private.moderation_actions (moderator_id, action, post_id, comment_id, user_id, note)
  values (moderator_id, 'restore', target_post_id, target_comment_id, target_author, note);
end;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────────────────────

-- Las mod_* solo las puede llamar service_role (el servidor MCP con la llave secreta).
revoke execute on function
  public.mod_whoami(text),
  public.mod_list_pending(int),
  public.mod_get_content(bigint, bigint),
  public.mod_get_author(text),
  public.mod_summary(timestamptz),
  public.mod_mark_reviewed(bigint, bigint, bigint, text),
  public.mod_hide(bigint, bigint, bigint, text, text),
  public.mod_restore(bigint, bigint, bigint, text)
from public, anon, authenticated;

grant execute on function
  public.mod_whoami(text),
  public.mod_list_pending(int),
  public.mod_get_content(bigint, bigint),
  public.mod_get_author(text),
  public.mod_summary(timestamptz),
  public.mod_mark_reviewed(bigint, bigint, bigint, text),
  public.mod_hide(bigint, bigint, bigint, text, text),
  public.mod_restore(bigint, bigint, bigint, text)
to service_role;

-- Las mod_* son security invoker: service_role necesita llegar a lo privado que usan.
grant usage on schema private to service_role;
grant select on private.moderators, private.flag_words to service_role;
grant select, update on private.review_items to service_role;
grant select, insert on private.moderation_actions to service_role;
grant select, insert, update on public.moderation_notices to service_role;
grant execute on function
  private.require_one_target(bigint, bigint),
  private.warning_count(uuid),
  private.resolve_item(bigint, bigint, bigint)
to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
