// Pruebas de las reglas de seguridad de reports. Corren con `npm run test:db` contra el proyecto
// de Supabase del .env. Las pruebas van en orden y comparten datos: cada corrida crea cuatro
// usuarios anónimos (Supabase limita las sesiones anónimas por hora).
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
  // Como la app: sin un teléfono registrado no se puede escribir.
  const registered = await user.client
    .from('user_devices')
    .insert({ device_id: `prueba-${user.userId}`, platform: 'android' });
  if (registered.error) {
    throw new Error('No se pudo registrar el teléfono: ' + registered.error.message);
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

async function createTestReply(user: TestUser, postId: number): Promise<number> {
  const { data, error } = await user.client
    .from('comments')
    .insert({ post_id: postId, content: 'Respuesta de prueba.' })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error('No se pudo crear la respuesta: ' + error?.message);
  }
  return data.id;
}

describe('tabla reports', () => {
  let ana: TestUser;
  let beto: TestUser;
  let carla: TestUser;
  let anaPostId: number;
  let anaDeletedPostId: number;
  let anaReplyId: number;
  let anaReplyOnDeletedPostId: number;
  let betoReplyId: number;

  beforeAll(async () => {
    ana = await signInAsMember();
    beto = await signInAsMember();
    carla = await signInAsMember();
    anaPostId = await createTestPost(ana, 'Publicación para reportar');
    anaDeletedPostId = await createTestPost(ana, 'Publicación que se va a borrar');
    anaReplyId = await createTestReply(ana, anaPostId);
    anaReplyOnDeletedPostId = await createTestReply(ana, anaDeletedPostId);
    betoReplyId = await createTestReply(beto, anaPostId);
    const { error } = await ana.client
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', anaDeletedPostId);
    if (error) {
      throw new Error('No se pudo borrar la publicación: ' + error.message);
    }
  });

  test('puedo reportar la publicación de otra persona', async () => {
    // igual que la app: sin .select(), porque no hay permiso de lectura
    const { error } = await beto.client.from('reports').insert({ post_id: anaPostId, reason: 'spam' });

    expect(error).toBeNull();
  });

  test('no puedo reportar la misma publicación dos veces', async () => {
    const { error } = await beto.client.from('reports').insert({ post_id: anaPostId, reason: 'otro' });

    expect(error?.code).toBe('23505');
  });

  test('puedo reportar la respuesta de otra persona, una sola vez', async () => {
    const first = await beto.client.from('reports').insert({ comment_id: anaReplyId, reason: 'acoso' });
    const second = await beto.client.from('reports').insert({ comment_id: anaReplyId, reason: 'acoso' });

    expect(first.error).toBeNull();
    expect(second.error?.code).toBe('23505');
  });

  test('no puedo reportar lo mío', async () => {
    const ownPost = await ana.client.from('reports').insert({ post_id: anaPostId, reason: 'spam' });
    const ownReply = await beto.client.from('reports').insert({ comment_id: betoReplyId, reason: 'spam' });

    expect(ownPost.error?.code).toBe('42501');
    expect(ownReply.error?.code).toBe('42501');
  });

  test('un reporte apunta a una sola cosa', async () => {
    const both = await carla.client
      .from('reports')
      .insert({ post_id: anaPostId, comment_id: anaReplyId, reason: 'spam' });
    const neither = await carla.client.from('reports').insert({ reason: 'spam' });

    expect(both.error?.code).toBe('23514'); // el check de un solo objetivo
    expect(neither.error?.code).toBe('42501'); // RLS no encuentra qué reportar
  });

  test('el motivo tiene que ser uno de la lista', async () => {
    const { error } = await carla.client.from('reports').insert({ post_id: anaPostId, reason: 'aburrido' });

    expect(error?.code).toBe('23514');
  });

  test('no puedo reportar en nombre de otra persona', async () => {
    const { error } = await carla.client
      .from('reports')
      .insert({ post_id: anaPostId, reason: 'spam', reporter_id: beto.userId });

    expect(error?.code).toBe('42501'); // sin permiso sobre la columna
  });

  test('no puedo reportar algo borrado ni sus respuestas', async () => {
    const deletedPost = await carla.client.from('reports').insert({ post_id: anaDeletedPostId, reason: 'spam' });
    const replyOfDeletedPost = await carla.client
      .from('reports')
      .insert({ comment_id: anaReplyOnDeletedPostId, reason: 'spam' });

    expect(deletedPost.error?.code).toBe('42501');
    expect(replyOfDeletedPost.error?.code).toBe('42501');
  });

  test('nadie puede leer, cambiar ni borrar reportes, ni quien los hizo', async () => {
    const read = await beto.client.from('reports').select('id');
    const change = await beto.client.from('reports').update({ reason: 'otro' }).eq('post_id', anaPostId);
    const remove = await beto.client.from('reports').delete().eq('post_id', anaPostId);
    const authorReads = await ana.client.from('reports').select('id');

    expect(read.error?.code).toBe('42501');
    expect(change.error?.code).toBe('42501');
    expect(remove.error?.code).toBe('42501');
    expect(authorReads.error?.code).toBe('42501');
  });

  test('sin aceptar las reglas no se puede reportar', async () => {
    const newcomer = await signInAsNewUser();
    const { error } = await newcomer.client.from('reports').insert({ post_id: anaPostId, reason: 'spam' });

    expect(error?.code).toBe('42501');
  });

  test('sin sesión no se puede reportar', async () => {
    const { error } = await createTestClient().from('reports').insert({ post_id: anaPostId, reason: 'spam' });

    expect(error?.code).toBe('42501');
  });
});
