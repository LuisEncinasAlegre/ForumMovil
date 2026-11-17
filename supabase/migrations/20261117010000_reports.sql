-- Reportes de publicaciones o respuestas. La app solo los escribe: nadie los puede leer desde la
-- app, ni quien reportó. Moderación los revisa desde el dashboard (fase siguiente).

create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id     bigint references public.posts (id) on delete cascade,
  comment_id  bigint references public.comments (id) on delete cascade,
  reason      text not null check (reason in ('spam', 'acoso', 'inapropiado', 'otro')),
  created_at  timestamptz not null default now(),
  -- un reporte apunta a una publicación o a una respuesta, nunca a las dos
  constraint reports_one_target check (num_nonnulls(post_id, comment_id) = 1),
  -- una vez por persona y por cosa; también sirven de índice para reporter_id
  constraint reports_once_per_post unique (reporter_id, post_id),
  constraint reports_once_per_comment unique (reporter_id, comment_id)
);

comment on table public.reports is 'Solo escritura desde la app. Sin políticas de lectura a propósito.';

-- Para que moderación encuentre los reportes de algo y para el borrado en cascada.
create index reports_post_idx on public.reports (post_id) where post_id is not null;
create index reports_comment_idx on public.reports (comment_id) where comment_id is not null;

-- Permisos: primero quitamos todo y luego damos solo lo necesario.
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
-- sin select: la app inserta sin pedir la fila de vuelta
grant insert (post_id, comment_id, reason) on public.reports to authenticated;

-- Las subconsultas pasan por las políticas de posts y comments, pero esas dejan al autor leer lo
-- suyo aunque esté borrado; por eso revisamos estado y borrado a mano.
create policy "Reportas con las reglas aceptadas algo visible que no es tuyo"
  on public.reports for insert
  to authenticated
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
  );

-- Sin políticas de select, update ni delete: todo eso queda negado.
