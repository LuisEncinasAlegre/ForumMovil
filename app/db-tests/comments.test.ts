// Pruebas de las reglas de seguridad de comments y comment_edits, y del conteo de respuestas.
// Corren con `npm run test:db` contra el proyecto de Supabase del .env.
// Las pruebas van en orden y comparten datos: cada corrida crea solo tres usuarios anónimos
// (Supabase limita las sesiones anónimas por hora) y cada uno responde máximo 3 veces por minuto.
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

const COMMENT_COLUMNS = 'id, post_id, author_id, content, created_at, edited_at, deleted_at';

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

async function createTestPost(user: TestUser, title: string): Promise<number> {
  const { data, error } = await user.client
    .from('posts')
    .insert({ title, content: 'Texto de prueba.' })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error('No se pudo crear la publicación: ' + error?.message);
  }
  return data.id;
}

// La misma consulta que usa la app: cuenta solo respuestas visibles y sin borrar.
async function countReplies(user: TestUser, postId: number): Promise<unknown> {
  const { data, error } = await user.client
    .from('posts')
    .select('id, comments(count)')
    .eq('comments.status', 'visible')
    .is('comments.deleted_at', null)
    .eq('id', postId)
    .single();
  if (error) {
    throw new Error('No se pudieron contar las respuestas: ' + error.message);
  }
  return data.comments;
}

describe('tabla comments', () => {
  let ana: TestUser;
  let beto: TestUser;
  let anaPostId: number;
  let anaPostToDeleteId: number;
  let betoFirstReplyId: number;
  let betoSecondReplyId: number;
  let betoThirdReplyId: number;

  beforeAll(async () => {
    ana = await signInAsMember();
    beto = await signInAsMember();
    anaPostId = await createTestPost(ana, 'Hilo para responder');
    anaPostToDeleteId = await createTestPost(ana, 'Hilo que se va a borrar');
  });

  test('el foro cuenta cero respuestas sin configurar nada', async () => {
    expect(await countReplies(beto, anaPostId)).toEqual([{ count: 0 }]);
  });

  test('puedo responder y sale con mi alias', async () => {
    const { data, error } = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Primera respuesta.' })
      .select('id, author_id, edited_at, author:profiles(display_name)')
      .single();

    expect(error).toBeNull();
    expect(data?.author_id).toBe(beto.userId);
    expect(data?.edited_at).toBeNull();
    expect(data?.author).toEqual({ display_name: expect.stringMatching(/^[a-z]+-[a-z]+$/) });
    betoFirstReplyId = data?.id;
  });

  test('otra sesión puede leer mi respuesta', async () => {
    const { data, error } = await ana.client.from('comments').select('content').eq('id', betoFirstReplyId);

    expect(error).toBeNull();
    expect(data).toEqual([{ content: 'Primera respuesta.' }]);
  });

  test('no puedo elegir autor, estado ni fechas', async () => {
    const asSomeoneElse = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Suplantando', author_id: ana.userId });
    const withStatus = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Oculta', status: 'hidden' });
    const withEditedAt = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Editada', edited_at: new Date().toISOString() });

    // sin permiso sobre esas columnas
    expect(asSomeoneElse.error?.code).toBe('42501');
    expect(withStatus.error?.code).toBe('42501');
    expect(withEditedAt.error?.code).toBe('42501');
  });

  test('sin aceptar las reglas no se puede responder', async () => {
    const newcomer = await signInAsNewUser();
    const { error } = await newcomer.client.from('comments').insert({ post_id: anaPostId, content: 'Hola' });

    expect(error?.code).toBe('42501'); // lo bloquea RLS
  });

  test('el texto respeta los límites', async () => {
    const empty = await beto.client.from('comments').insert({ post_id: anaPostId, content: '' });
    const onlySpaces = await beto.client.from('comments').insert({ post_id: anaPostId, content: '    ' });
    const tooLong = await beto.client.from('comments').insert({ post_id: anaPostId, content: 'a'.repeat(1001) });

    expect(empty.error?.code).toBe('23514');
    expect(onlySpaces.error?.code).toBe('23514');
    expect(tooLong.error?.code).toBe('23514');
  });

  test('máximo 3 respuestas por minuto', async () => {
    const second = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Versión uno.' })
      .select('id')
      .single();
    const third = await beto.client
      .from('comments')
      .insert({ post_id: anaPostId, content: 'Tercera respuesta.' })
      .select('id')
      .single();
    const fourth = await beto.client.from('comments').insert({ post_id: anaPostId, content: 'Cuarta' });

    expect(second.error).toBeNull();
    expect(third.error).toBeNull();
    expect(fourth.error?.message).toBe('demasiadas_respuestas');
    betoSecondReplyId = second.data?.id;
    betoThirdReplyId = third.data?.id;
  });

  test('el foro cuenta las respuestas', async () => {
    expect(await countReplies(ana, anaPostId)).toEqual([{ count: 3 }]);
  });

  test('al editar cambia el texto, se marca editada y la fecha de creación no cambia', async () => {
    const before = await beto.client.from('comments').select(COMMENT_COLUMNS).eq('id', betoSecondReplyId).single();
    const { data, error } = await beto.client
      .from('comments')
      .update({ content: 'Versión dos.' })
      .eq('id', betoSecondReplyId)
      .select(COMMENT_COLUMNS)
      .single();

    expect(error).toBeNull();
    expect(data?.content).toBe('Versión dos.');
    expect(data?.edited_at).not.toBeNull();
    expect(data?.created_at).toBe(before.data?.created_at);
  });

  test('la edición guarda la versión anterior y otra sesión puede verla', async () => {
    const { data, error } = await ana.client
      .from('comment_edits')
      .select('content')
      .eq('comment_id', betoSecondReplyId)
      .order('id', { ascending: false });

    expect(error).toBeNull();
    expect(data).toEqual([{ content: 'Versión uno.' }]);
  });

  test('no puedo editar ni borrar la respuesta de otra persona', async () => {
    const edit = await ana.client
      .from('comments')
      .update({ content: 'Cambiado por ana' })
      .eq('id', betoFirstReplyId)
      .select();
    const softDelete = await ana.client
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', betoFirstReplyId)
      .select();
    const after = await beto.client.from('comments').select(COMMENT_COLUMNS).eq('id', betoFirstReplyId).single();

    // RLS no da error aquí: simplemente no encuentra filas que pueda editar
    expect(edit.data).toEqual([]);
    expect(softDelete.data).toEqual([]);
    expect(after.data?.content).toBe('Primera respuesta.');
    expect(after.data?.deleted_at).toBeNull();
  });

  test('nadie puede borrar filas de verdad', async () => {
    const { error } = await beto.client.from('comments').delete().eq('id', betoFirstReplyId);

    expect(error?.code).toBe('42501');
  });

  test('al borrar, la respuesta desaparece para los demás y deja de contar', async () => {
    const { error } = await beto.client
      .from('comments')
      .update({ deleted_at: '2000-01-01T00:00:00Z', content: 'Texto cambiado al borrar' })
      .eq('id', betoThirdReplyId);
    const others = await ana.client.from('comments').select('id').eq('id', betoThirdReplyId);

    expect(error).toBeNull();
    expect(others.data).toEqual([]);
    // también desde la sesión del autor, que sí puede leer su respuesta borrada
    expect(await countReplies(beto, anaPostId)).toEqual([{ count: 2 }]);
  });

  test('yo sigo viendo mi respuesta borrada, con su texto y la hora del servidor', async () => {
    const mine = await beto.client.from('comments').select(COMMENT_COLUMNS).eq('id', betoThirdReplyId).single();
    const deletedAt = new Date(mine.data?.deleted_at);

    expect(mine.data?.content).toBe('Tercera respuesta.'); // borrar no cambia el texto
    expect(Math.abs(Date.now() - deletedAt.getTime())).toBeLessThan(5 * 60 * 1000); // no el año 2000
  });

  test('una respuesta borrada no se edita ni se recupera', async () => {
    const edit = await beto.client.from('comments').update({ content: 'Revivida' }).eq('id', betoThirdReplyId).select();
    const restore = await beto.client.from('comments').update({ deleted_at: null }).eq('id', betoThirdReplyId).select();

    expect(edit.data).toEqual([]);
    expect(restore.data).toEqual([]);
  });

  test('nadie escribe en comment_edits desde la app', async () => {
    const insert = await beto.client
      .from('comment_edits')
      .insert({ comment_id: betoFirstReplyId, content: 'Falsa', written_at: new Date().toISOString() });
    const update = await beto.client.from('comment_edits').update({ content: 'otra' }).eq('comment_id', betoSecondReplyId);
    const remove = await beto.client.from('comment_edits').delete().eq('comment_id', betoSecondReplyId);

    expect(insert.error?.code).toBe('42501');
    expect(update.error?.code).toBe('42501');
    expect(remove.error?.code).toBe('42501');
  });

  test('al borrar la publicación, sus respuestas dejan de verse y nadie puede responder', async () => {
    const reply = await ana.client
      .from('comments')
      .insert({ post_id: anaPostToDeleteId, content: 'Me respondo a mí misma.' })
      .select('id')
      .single();
    await ana.client.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', anaPostToDeleteId);
    const othersRead = await beto.client.from('comments').select('id').eq('post_id', anaPostToDeleteId);
    // ni la autora de la publicación puede responderle ya
    const authorReply = await ana.client
      .from('comments')
      .insert({ post_id: anaPostToDeleteId, content: 'Otra más.' });

    expect(reply.error).toBeNull();
    expect(othersRead.data).toEqual([]);
    expect(authorReply.error?.code).toBe('42501');
  });

  test('sin sesión no se puede leer ninguna respuesta', async () => {
    const noSession = createTestClient();
    const { error } = await noSession.from('comments').select('id');

    expect(error?.code).toBe('42501');
  });
});
