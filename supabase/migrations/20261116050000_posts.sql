-- Publicaciones del foro.
-- Todos leen las visibles; cada quien crea, edita y borra las suyas.
-- Borrar es "soft delete": la fila se queda (para moderación), solo sale del foro.
-- Cada edición guarda la versión anterior en post_edits, y cualquiera que pueda ver la
-- publicación puede ver sus versiones anteriores.

create table public.posts (
  id         bigint generated always as identity primary key,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 3 and 120),
  content    text not null check (char_length(btrim(content)) between 1 and 2000),
  status     text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

comment on column public.posts.status is
  'hidden = la quitó moderación (fase siguiente). La app nunca cambia este valor.';
comment on column public.posts.edited_at is 'Última edición. La pone el trigger; la app muestra "editado".';
comment on column public.posts.deleted_at is 'Cuándo la borró su autor. La pone el servidor y no se puede deshacer.';

-- Para el límite por minuto y, después, "tus publicaciones" en Tú.
-- También sirve de índice para la llave foránea author_id.
create index posts_author_created_idx on public.posts (author_id, created_at desc);

-- Permisos: primero quitamos todo y luego damos solo lo necesario.
-- Autor, estado y fechas los pone la base, no la app.
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to authenticated;
grant insert (title, content) on public.posts to authenticated;
grant update (title, content, deleted_at) on public.posts to authenticated;

create policy "Las sesiones leen las publicaciones visibles"
  on public.posts for select
  to authenticated
  using (status = 'visible' and deleted_at is null);

-- Necesaria para editar y borrar: Postgres revisa que la fila nueva de un UPDATE se pueda leer,
-- y una publicación recién borrada ya no pasa la política de arriba.
create policy "Cada quien lee sus propias publicaciones"
  on public.posts for select
  to authenticated
  using (author_id = (select auth.uid()));

create policy "Publicas como tú y después de aceptar las reglas"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and rules_accepted_at is not null
    )
  );

-- Solo lo tuyo, y solo si sigue visible y sin borrar (lo oculto por moderación no se toca).
-- Como solo encuentra filas sin borrar, una publicación borrada no se puede "desborrar".
create policy "Editas o borras solo tus publicaciones"
  on public.posts for update
  to authenticated
  using (author_id = (select auth.uid()) and status = 'visible' and deleted_at is null)
  with check (author_id = (select auth.uid()));

-- Fechas de edición y borrado las pone el servidor. Al borrar se conserva el texto original.
create function private.stamp_post_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    new.deleted_at := now();
    new.title := old.title;
    new.content := old.content;
    return new;
  end if;
  if new.title is distinct from old.title or new.content is distinct from old.content then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_stamp_update
  before update on public.posts
  for each row execute function private.stamp_post_update();

-- Máximo 2 publicaciones por minuto por persona (las sesiones anónimas son baratas de crear).
-- Es security definer para contar también las ocultas y las borradas, que RLS no deja ver.
create function private.limit_post_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- dos inserts al mismo tiempo de la misma persona esperan su turno y no se saltan el límite
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));
  if (
    select count(*) from public.posts
    where author_id = new.author_id and created_at > now() - interval '1 minute'
  ) >= 2 then
    raise exception 'demasiadas_publicaciones' using hint = 'Espera un minuto.';
  end if;
  return new;
end;
$$;

create trigger posts_limit_rate
  before insert on public.posts
  for each row execute function private.limit_post_rate();

-- Versiones anteriores de cada publicación. Las escribe solo el trigger de abajo.
create table public.post_edits (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts (id) on delete cascade,
  title       text not null,
  content     text not null,
  written_at  timestamptz not null,               -- cuándo se escribió esa versión
  replaced_at timestamptz not null default now()  -- cuándo la reemplazó la edición
);

create index post_edits_post_idx on public.post_edits (post_id, id desc);

alter table public.post_edits enable row level security;
revoke all on public.post_edits from anon, authenticated;
grant select on public.post_edits to authenticated;

-- La subconsulta pasa por las políticas de posts: ves el historial si puedes ver la
-- publicación (todos si está visible; solo su autor si la borró).
create policy "Ves las versiones de las publicaciones que puedes leer"
  on public.post_edits for select
  to authenticated
  using (exists (select 1 from public.posts where posts.id = post_edits.post_id));

-- Es security definer porque nadie tiene permiso de insertar en post_edits desde la app.
create function private.save_post_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.post_edits (post_id, title, content, written_at)
  values (old.id, old.title, old.content, coalesce(old.edited_at, old.created_at));
  return null;
end;
$$;

-- Solo cuando cambió el texto (al borrar, el trigger de antes deja el texto igual).
create trigger posts_save_edit
  after update on public.posts
  for each row
  when (old.title is distinct from new.title or old.content is distinct from new.content)
  execute function private.save_post_edit();

revoke execute on all functions in schema private from public, anon, authenticated;
