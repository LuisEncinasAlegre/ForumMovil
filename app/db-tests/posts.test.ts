// Pruebas de las reglas de seguridad de posts y post_edits.
// Corren con `npm run test:db` contra el proyecto de Supabase del .env.
// Las pruebas van en orden y comparten datos: cada corrida crea solo tres usuarios anónimos
// (Supabase limita las sesiones anónimas por hora) y cada uno publica máximo 2 veces por minuto.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TestUser = {
  client: SupabaseClient;
  userId: string;
};

if (!existsSync('.env')) {
  throw new Error('Falta app/.env. Cópialo de .env.example y pon la URL y la llave publicable.');
}
// Leemos el .env a mano (ver profiles.test.ts).
const env = parseEnv(readFileSync('.env', 'utf8'));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

const POST_COLUMNS = 'id, author_id, title, content, created_at, edited_at, deleted_at';

function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInAsNewUser(): Promise<TestUser> {
  const client = createTestClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error('No se pudo iniciar sesión anónima: ' + error?.message);
  }
  return { client, userId: data.user.id };
}

async function signInAsMember(): Promise<TestUser> {
  const user = await signInAsNewUser();
  const { error } = await user.client
    .from('profiles')
    .update({ rules_accepted_at: new Date().toISOString() })
    .eq('id', user.userId);
  if (error) {
    throw new Error('No se pudieron aceptar las reglas: ' + error.message);
  }
  return user;
}

describe('tabla posts', () => {
  let ana: TestUser;
  let beto: TestUser;
  let anaFirstPostId: number;
  let anaSecondPostId: number;

  beforeAll(async () => {
    ana = await signInAsMember();
    beto = await signInAsMember();
  });

  test('puedo publicar y sale con mi alias', async () => {
    const { data, error } = await ana.client
      .from('posts')
      .insert({ title: 'Primera publicación', content: 'Hola, foro.' })
      .select('id, author_id, edited_at, author:profiles(display_name)')
      .single();

    expect(error).toBeNull();
    expect(data?.author_id).toBe(ana.userId);
    expect(data?.edited_at).toBeNull();
    expect(data?.author).toEqual({ display_name: expect.stringMatching(/^[a-z]+-[a-z]+$/) });
    anaFirstPostId = data?.id;
  });

  test('otra sesión puede leer mi publicación', async () => {
    const { data, error } = await beto.client.from('posts').select('title').eq('id', anaFirstPostId);

    expect(error).toBeNull();
    expect(data).toEqual([{ title: 'Primera publicación' }]);
  });

  test('no puedo elegir autor, estado ni fechas', async () => {
    const asSomeoneElse = await ana.client
      .from('posts')
      .insert({ title: 'Suplantando', content: 'texto', author_id: beto.userId });
    const asMyself = await ana.client
      .from('posts')
      .insert({ title: 'Mi autor', content: 'texto', author_id: ana.userId });
    const withStatus = await ana.client.from('posts').insert({ title: 'Oculta', content: 'texto', status: 'hidden' });
    const withDate = await ana.client
      .from('posts')
      .insert({ title: 'Del pasado', content: 'texto', created_at: '2000-01-01T00:00:00Z' });

    // sin permiso sobre esas columnas
    expect(asSomeoneElse.error?.code).toBe('42501');
    expect(asMyself.error?.code).toBe('42501');
    expect(withStatus.error?.code).toBe('42501');
    expect(withDate.error?.code).toBe('42501');
  });

  test('sin aceptar las reglas no se puede publicar', async () => {
    const newcomer = await signInAsNewUser();
    const { error } = await newcomer.client.from('posts').insert({ title: 'Me salté la bienvenida', content: 'texto' });

    expect(error?.code).toBe('42501'); // lo bloquea RLS
  });

  test('título y contenido respetan los límites', async () => {
    const shortTitle = await ana.client.from('posts').insert({ title: 'Ho', content: 'texto' });
    const longContent = await ana.client.from('posts').insert({ title: 'Muy largo', content: 'a'.repeat(2001) });
    const onlySpaces = await ana.client.from('posts').insert({ title: 'Sin texto', content: '    ' });

    expect(shortTitle.error?.code).toBe('23514');
    expect(longContent.error?.code).toBe('23514');
    expect(onlySpaces.error?.code).toBe('23514');
  });

  test('máximo 2 publicaciones por minuto', async () => {
    const second = await ana.client
      .from('posts')
      .insert({ title: 'Segunda publicación', content: 'Versión uno.' })
      .select('id')
      .single();
    const third = await ana.client.from('posts').insert({ title: 'Tercera publicación', content: 'texto' });

    expect(second.error).toBeNull();
    expect(third.error?.message).toBe('demasiadas_publicaciones');
    anaSecondPostId = second.data?.id;
  });

  test('al editar cambia el texto, se marca editada y la fecha de creación no cambia', async () => {
    const before = await ana.client.from('posts').select(POST_COLUMNS).eq('id', anaSecondPostId).single();
    const { data, error } = await ana.client
      .from('posts')
      .update({ content: 'Versión dos.' })
      .eq('id', anaSecondPostId)
      .select(POST_COLUMNS)
      .single();

    expect(error).toBeNull();
    expect(data?.content).toBe('Versión dos.');
    expect(data?.edited_at).not.toBeNull();
    expect(data?.created_at).toBe(before.data?.created_at);
  });

  test('cada edición guarda la versión anterior y otra sesión puede verlas', async () => {
    await ana.client.from('posts').update({ content: 'Versión tres.' }).eq('id', anaSecondPostId);
    const { data, error } = await beto.client
      .from('post_edits')
      .select('content')
      .eq('post_id', anaSecondPostId)
      .order('id', { ascending: false });

    expect(error).toBeNull();
    expect(data).toEqual([{ content: 'Versión dos.' }, { content: 'Versión uno.' }]);
  });

  test('no puedo editar ni borrar la publicación de otra persona', async () => {
    const edit = await beto.client.from('posts').update({ title: 'Cambiado por beto' }).eq('id', anaFirstPostId).select();
    const softDelete = await beto.client
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', anaFirstPostId)
      .select();
    const after = await ana.client.from('posts').select(POST_COLUMNS).eq('id', anaFirstPostId).single();

    // RLS no da error aquí: simplemente no encuentra filas que pueda editar
    expect(edit.data).toEqual([]);
    expect(softDelete.data).toEqual([]);
    expect(after.data?.title).toBe('Primera publicación');
    expect(after.data?.deleted_at).toBeNull();
  });

  test('nadie puede borrar filas de verdad', async () => {
    const { error } = await ana.client.from('posts').delete().eq('id', anaFirstPostId);

    expect(error?.code).toBe('42501');
  });

  test('al borrar, la publicación y sus versiones desaparecen para los demás', async () => {
    const { error } = await ana.client
      .from('posts')
      .update({ deleted_at: '2000-01-01T00:00:00Z', content: 'Texto cambiado al borrar' })
      .eq('id', anaSecondPostId);
    const othersPost = await beto.client.from('posts').select('id').eq('id', anaSecondPostId);
    const othersEdits = await beto.client.from('post_edits').select('id').eq('post_id', anaSecondPostId);

    expect(error).toBeNull();
    expect(othersPost.data).toEqual([]);
    expect(othersEdits.data).toEqual([]);
  });

  test('yo sigo viendo mi publicación borrada, con su texto y la hora del servidor', async () => {
    const mine = await ana.client.from('posts').select(POST_COLUMNS).eq('id', anaSecondPostId).single();
    const myEdits = await ana.client.from('post_edits').select('id').eq('post_id', anaSecondPostId);
    const deletedAt = new Date(mine.data?.deleted_at);

    expect(mine.data?.content).toBe('Versión tres.'); // borrar no cambia el texto
    expect(Math.abs(Date.now() - deletedAt.getTime())).toBeLessThan(5 * 60 * 1000); // no el año 2000
    expect(myEdits.data).toHaveLength(2); // borrar no agrega versiones
  });

  test('una publicación borrada no se edita ni se recupera', async () => {
    const edit = await ana.client.from('posts').update({ title: 'Revivida' }).eq('id', anaSecondPostId).select();
    const restore = await ana.client.from('posts').update({ deleted_at: null }).eq('id', anaSecondPostId).select();

    expect(edit.data).toEqual([]);
    expect(restore.data).toEqual([]);
  });

  test('nadie escribe en post_edits desde la app', async () => {
    const insert = await ana.client
      .from('post_edits')
      .insert({ post_id: anaFirstPostId, title: 'Falsa', content: 'versión', written_at: new Date().toISOString() });
    const update = await ana.client.from('post_edits').update({ content: 'otra' }).eq('post_id', anaSecondPostId);
    const remove = await ana.client.from('post_edits').delete().eq('post_id', anaSecondPostId);

    expect(insert.error?.code).toBe('42501');
    expect(update.error?.code).toBe('42501');
    expect(remove.error?.code).toBe('42501');
  });

  test('sin sesión no se puede leer ninguna publicación', async () => {
    const noSession = createTestClient();
    const { error } = await noSession.from('posts').select('id');

    expect(error?.code).toBe('42501');
  });
});
