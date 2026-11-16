-- Perfiles anónimos.
-- Cada sesión anónima de Supabase Auth tiene un perfil con un alias generado
-- (dos palabras, p. ej. farol-veloz) y un color de identidad que el usuario puede elegir.
-- El cliente nunca elige su alias: lo pone el trigger al crear el usuario.

-- Funciones internas que no deben quedar expuestas por la API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null unique check (display_name ~ '^[a-z]+-[a-z]+$'),
  color             text check (color ~ '^#[0-9a-f]{6}$'),
  rules_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);

comment on column public.profiles.color is
  'Color del sello en hex (#rrggbb), elegido en la pantalla Tú. Null = aún no elige; la app usa uno por defecto.';
comment on column public.profiles.rules_accepted_at is 'Cuándo aceptó las reglas en la bienvenida. La hora la pone el servidor.';

-- Permisos: primero quitamos todo y luego damos solo lo necesario.
-- (Las tablas nuevas ya no se exponen solas a la API, pero así no dependemos de eso.)
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (color, rules_accepted_at) on public.profiles to authenticated;

create policy "Las sesiones pueden leer los perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada quien edita solo su perfil"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Palabras para los alias. Están en una tabla para poder cambiarlas sin tocar funciones:
--   insert into private.alias_words (word, kind) values ('cometa', 'sustantivo');
--   delete from private.alias_words where word = 'triste';
-- Los alias que ya existen no cambian. Los adjetivos deben servir igual para masculino y
-- femenino (verde, libre, veloz...) para que nunca salga algo como "nube-quieto".
create table private.alias_words (
  word text primary key check (word ~ '^[a-z]+$'),   -- sin acentos ni espacios
  kind text not null check (kind in ('sustantivo', 'adjetivo'))
);

insert into private.alias_words (word, kind) values
  ('farol', 'sustantivo'), ('nube', 'sustantivo'), ('puente', 'sustantivo'),
  ('llave', 'sustantivo'), ('ventana', 'sustantivo'), ('cuaderno', 'sustantivo'),
  ('mochila', 'sustantivo'), ('reloj', 'sustantivo'), ('silla', 'sustantivo'),
  ('taza', 'sustantivo'), ('cometa', 'sustantivo'), ('faro', 'sustantivo'), ('tren', 'sustantivo'),
  ('barco', 'sustantivo'), ('piedra', 'sustantivo'), ('hoja', 'sustantivo'),
  ('lago', 'sustantivo'), ('campana', 'sustantivo'), ('cable', 'sustantivo'),
  ('papel', 'sustantivo'), ('botella', 'sustantivo'), ('sombra', 'sustantivo'),
  ('eco', 'sustantivo'), ('chispa', 'sustantivo'), ('nudo', 'sustantivo'), ('globo', 'sustantivo'),
  ('pluma', 'sustantivo'), ('cinta', 'sustantivo'), ('espejo', 'sustantivo'),
  ('ancla', 'sustantivo'), ('tinta', 'sustantivo'), ('marea', 'sustantivo'),
  ('viento', 'sustantivo'), ('trueno', 'sustantivo'), ('radio', 'sustantivo'),
  ('mapa', 'sustantivo'), ('vela', 'sustantivo'), ('cuerda', 'sustantivo'),
  ('tambor', 'sustantivo'), ('guitarra', 'sustantivo'), ('piano', 'sustantivo'),
  ('sobre', 'sustantivo'), ('sello', 'sustantivo'), ('boleto', 'sustantivo'),
  ('banco', 'sustantivo'), ('parque', 'sustantivo'), ('plaza', 'sustantivo'),
  ('torre', 'sustantivo'), ('muro', 'sustantivo'), ('techo', 'sustantivo'),
  ('escalera', 'sustantivo'), ('puerta', 'sustantivo'), ('terraza', 'sustantivo'),
  ('nieve', 'sustantivo'), ('lluvia', 'sustantivo'), ('niebla', 'sustantivo'),
  ('rayo', 'sustantivo'), ('luna', 'sustantivo'), ('estrella', 'sustantivo'),
  ('semilla', 'sustantivo'), ('rama', 'sustantivo'), ('bosque', 'sustantivo'),
  ('isla', 'sustantivo'), ('ola', 'sustantivo'),
  ('verde', 'adjetivo'), ('gris', 'adjetivo'), ('azul', 'adjetivo'), ('leve', 'adjetivo'),
  ('breve', 'adjetivo'), ('fuerte', 'adjetivo'), ('libre', 'adjetivo'), ('dulce', 'adjetivo'),
  ('simple', 'adjetivo'), ('veloz', 'adjetivo'), ('tenaz', 'adjetivo'), ('audaz', 'adjetivo'),
  ('suave', 'adjetivo'), ('firme', 'adjetivo'), ('noble', 'adjetivo'), ('alegre', 'adjetivo'),
  ('triste', 'adjetivo'), ('tenue', 'adjetivo'), ('sutil', 'adjetivo'), ('fiel', 'adjetivo'),
  ('joven', 'adjetivo'), ('rebelde', 'adjetivo'), ('salvaje', 'adjetivo'),
  ('constante', 'adjetivo'), ('valiente', 'adjetivo'), ('amable', 'adjetivo'),
  ('brillante', 'adjetivo'), ('distante', 'adjetivo'), ('errante', 'adjetivo'),
  ('paciente', 'adjetivo'), ('prudente', 'adjetivo'), ('humilde', 'adjetivo'),
  ('elegante', 'adjetivo'), ('frecuente', 'adjetivo'), ('urgente', 'adjetivo'),
  ('puntual', 'adjetivo'), ('formal', 'adjetivo'), ('casual', 'adjetivo'), ('ideal', 'adjetivo'),
  ('central', 'adjetivo'), ('gentil', 'adjetivo'), ('feroz', 'adjetivo'), ('capaz', 'adjetivo'),
  ('fugaz', 'adjetivo'), ('celeste', 'adjetivo'), ('silvestre', 'adjetivo'),
  ('estable', 'adjetivo'), ('flexible', 'adjetivo'), ('sensible', 'adjetivo');

-- Solo se edita desde el SQL Editor del dashboard; la app no la puede ver.
alter table private.alias_words enable row level security;
revoke all on private.alias_words from public, anon, authenticated;

-- Alias: sustantivo + adjetivo al azar, p. ej. farol-veloz.
create function private.generate_alias()
returns text
language sql
volatile
set search_path = ''
as $$
  select
    (select word from private.alias_words where kind = 'sustantivo' order by random() limit 1)
    || '-'
    || (select word from private.alias_words where kind = 'adjetivo' order by random() limit 1);
$$;

-- Crea el perfil cuando Supabase Auth crea un usuario (incluidos los anónimos).
-- Es security definer porque los clientes no tienen permiso de insertar en profiles.
create function private.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- La hora de aceptar las reglas la pone el servidor y no se puede borrar ni cambiar después.
create function private.keep_rules_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rules_accepted_at is distinct from old.rules_accepted_at then
    new.rules_accepted_at := coalesce(old.rules_accepted_at, now());
  end if;
  return new;
end;
$$;

create trigger profiles_keep_rules_acceptance
  before update on public.profiles
  for each row execute function private.keep_rules_acceptance();

revoke execute on all functions in schema private from public, anon, authenticated;
