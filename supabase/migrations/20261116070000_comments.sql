-- Respuestas de un hilo. Lista plana y cronológica (sin respuestas anidadas).
-- Mismas reglas que posts: cada quien crea, edita y borra (borrado suave) las suyas,
-- y cada edición guarda la versión anterior en comment_edits.

create table public.comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content    text not null check (char_length(btrim(content)) between 1 and 1000),
  status     text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

comment on column public.comments.status is
  'hidden = la quitó moderación (fase siguiente). La app nunca cambia este valor.';
comment on column public.comments.edited_at is 'Última edición. La pone el trigger; la app muestra "editado".';
comment on column public.comments.deleted_at is 'Cuándo la borró su autor. La pone el servidor y no se puede deshacer.';

-- El hilo se ordena y pagina por id, y el conteo de respuestas busca por post_id.
create index comments_post_idx on public.comments (post_id, id);
-- Para el límite por minuto; también sirve de índice para la llave foránea author_id.
create index comments_author_created_idx on public.comments (author_id, created_at desc);

-- Permisos: primero quitamos todo y luego damos solo lo necesario.
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to authenticated;
grant insert (post_id, content) on public.comments to authenticated;
grant update (content, deleted_at) on public.comments to authenticated;

-- La publicación se revisa aquí a mano: la política de posts deja al autor leer sus
-- publicaciones borradas, y las respuestas de una publicación borrada no deben verse.
create policy "Las sesiones leen las respuestas visibles de publicaciones visibles"
  on public.comments for select
  to authenticated
  using (
    status = 'visible'
    and deleted_at is null
    and exists (
      select 1 from public.posts
      where posts.id = comments.post_id
        and posts.status = 'visible'
        and posts.deleted_at is null
    )
  );

-- Igual que en posts: Postgres revisa que la fila nueva de un UPDATE se pueda leer,
-- y una respuesta recién borrada ya no pasa la política de arriba.
create policy "Cada quien lee sus propias respuestas"
  on public.comments for select
  to authenticated
  using (author_id = (select auth.uid()));

-- Ni el autor de una publicación borrada puede responderle.
create policy "Respondes como tú, con las reglas aceptadas, a publicaciones visibles"
  on public.comments for insert
  to authenticated
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
  );

create policy "Editas o borras solo tus respuestas"
  on public.comments for update
  to authenticated
  using (author_id = (select auth.uid()) and status = 'visible' and deleted_at is null)
  with check (author_id = (select auth.uid()));

-- Fechas de edición y borrado las pone el servidor. Al borrar se conserva el texto original.
create function private.stamp_comment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    new.deleted_at := now();
    new.content := old.content;
    return new;
  end if;
  if new.content is distinct from old.content then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_stamp_update
  before update on public.comments
  for each row execute function private.stamp_comment_update();

-- Versiones anteriores de cada respuesta. Las escribe solo el trigger de abajo.
create table public.comment_edits (
  id          bigint generated always as identity primary key,
  comment_id  bigint not null references public.comments (id) on delete cascade,
  content     text not null,
  written_at  timestamptz not null,               -- cuándo se escribió esa versión
  replaced_at timestamptz not null default now()  -- cuándo la reemplazó la edición
);

create index comment_edits_comment_idx on public.comment_edits (comment_id, id desc);

alter table public.comment_edits enable row level security;
revoke all on public.comment_edits from anon, authenticated;
grant select on public.comment_edits to authenticated;

-- La subconsulta pasa por las políticas de comments: ves el historial si puedes ver la respuesta.
create policy "Ves las versiones de las respuestas que puedes leer"
  on public.comment_edits for select
  to authenticated
  using (exists (select 1 from public.comments where comments.id = comment_edits.comment_id));

-- security definer porque nadie tiene permiso de insertar en comment_edits desde la app.
create function private.save_comment_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.comment_edits (comment_id, content, written_at)
  values (old.id, old.content, coalesce(old.edited_at, old.created_at));
  return null;
end;
$$;

-- Solo cuando cambió el texto (al borrar, el trigger de antes deja el texto igual).
create trigger comments_save_edit
  after update on public.comments
  for each row
  when (old.content is distinct from new.content)
  execute function private.save_comment_edit();

-- Máximo 3 respuestas por minuto por persona (las sesiones anónimas son baratas de crear).
-- security definer para contar también las ocultas y borradas.
create function private.limit_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- dos inserts al mismo tiempo de la misma persona esperan su turno y no se saltan el límite;
  -- el prefijo evita compartir el candado con el límite de publicaciones
  perform pg_advisory_xact_lock(hashtextextended('comments:' || new.author_id::text, 0));
  if (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'demasiadas_respuestas' using hint = 'Espera un minuto.';
  end if;
  return new;
end;
$$;

create trigger comments_limit_rate
  before insert on public.comments
  for each row execute function private.limit_comment_rate();

revoke execute on all functions in schema private from public, anon, authenticated;
