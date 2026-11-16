// Pruebas de suspensiones y baneos: teléfonos, la regla private.can_write() en las políticas y
// las funciones mod_ban / mod_unban. El cliente con la llave secreta hace lo que hace la Edge Function.
// Igual que moderation.test.ts, necesitan db-tests/.env.test (ver db-tests/.env.example).
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TestUser = {
  client: SupabaseClient;
  userId: string;
  alias: string;
};

if (!existsSync('.env') || !existsSync('db-tests/.env.test')) {
  throw new Error('Faltan app/.env o app/db-tests/.env.test. Cópialos de sus .example.');
}
const env = parseEnv(readFileSync('.env', 'utf8'));
const testEnv = parseEnv(readFileSync('db-tests/.env.test', 'utf8'));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const secretKey = testEnv.SUPABASE_SECRET_KEY ?? '';
const moderatorToken = testEnv.MODERATOR_TEST_TOKEN ?? '';

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// error de Postgres cuando una política de RLS rechaza la fila
const RLS_ERROR = '42501';

function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Sesión anónima con las reglas aceptadas. Sin teléfono: cada prueba decide si lo registra.
async function signInAsMember(): Promise<TestUser> {
  const client = createTestClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error('No se pudo iniciar sesión anónima: ' + error?.message);
  }
  const accepted = await client
    .from('profiles')
    .update({ rules_accepted_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .select('display_name')
    .single();
  if (accepted.error) {
    throw new Error('No se pudieron aceptar las reglas: ' + accepted.error.message);
  }
  return { client, userId: data.user.id, alias: accepted.data.display_name };
}

async function registerDevice(user: TestUser, deviceId: string): Promise<void> {
  const { error } = await user.client.from('user_devices').insert({ device_id: deviceId, platform: 'android' });
  if (error) {
    throw new Error('No se pudo registrar el teléfono: ' + error.message);
  }
}

// Con la llave secreta y fecha de hace unos minutos, para no chocar con el límite de 2 por minuto.
async function createTestPost(user: TestUser, title: string): Promise<number> {
  const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('posts')
    .insert({ title, content: 'Texto de prueba.', author_id: user.userId, created_at: createdAt })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error('No se pudo crear la publicación: ' + error?.message);
  }
  return data.id;
}

async function tryToPost(user: TestUser): Promise<string | null> {
  const { error } = await user.client.from('posts').insert({ title: 'Intento', content: 'Hola.' });
  return error?.code ?? null;
}

async function tryToReply(user: TestUser, postId: number): Promise<string | null> {
  const { error } = await user.client.from('comments').insert({ post_id: postId, content: 'Hola.' });
  return error?.code ?? null;
}

async function tryToReport(user: TestUser, postId: number): Promise<string | null> {
  const { error } = await user.client.from('reports').insert({ post_id: postId, reason: 'spam' });
  return error?.code ?? null;
}

describe('suspensiones y baneos', () => {
  let moderatorId: number;
  let ana: TestUser;
  let beto: TestUser;
  let betoPostId: number;
  let anaPostId: number;
  // cada corrida usa teléfonos distintos para no chocar con baneos de corridas anteriores
  const runTag = randomUUID();
  const anaDevice = `ana-${runTag}`;

  beforeAll(async () => {
    const whoami = await admin.rpc('mod_whoami', { token: moderatorToken });
    if (whoami.error) {
      throw new Error('MODERATOR_TEST_TOKEN no sirve: ' + whoami.error.message);
    }
    moderatorId = whoami.data;
    ana = await signInAsMember();
    beto = await signInAsMember();
    await registerDevice(beto, `beto-${runTag}`);
    betoPostId = await createTestPost(beto, 'Publicación de Beto');
    anaPostId = await createTestPost(ana, 'Publicación de Ana');
  });

  describe('teléfonos', () => {
    test('sin un teléfono registrado no puedo publicar, responder ni reportar', async () => {
      expect(await tryToPost(ana)).toBe(RLS_ERROR);
      expect(await tryToReply(ana, betoPostId)).toBe(RLS_ERROR);
      expect(await tryToReport(ana, betoPostId)).toBe(RLS_ERROR);
    });

    test('registro mi teléfono, y registrarlo dos veces no falla', async () => {
      await registerDevice(ana, anaDevice);
      const again = await ana.client
        .from('user_devices')
        .upsert({ device_id: anaDevice, platform: 'android' }, { ignoreDuplicates: true });

      expect(again.error).toBeNull();
    });

    test('no puedo registrar un teléfono a nombre de otra cuenta', async () => {
      const { error } = await ana.client
        .from('user_devices')
        .insert({ user_id: beto.userId, device_id: `falso-${runTag}`, platform: 'android' });

      expect(error).not.toBeNull();
    });

    test('solo veo mis teléfonos', async () => {
      const { data, error } = await ana.client.from('user_devices').select('user_id, device_id');

      expect(error).toBeNull();
      expect(data).toEqual([{ user_id: ana.userId, device_id: anaDevice }]);
    });

    test('con el teléfono registrado ya puedo escribir', async () => {
      expect(await tryToReply(ana, betoPostId)).toBeNull();
    });
  });

  describe('suspensión', () => {
    beforeAll(async () => {
      const { error } = await admin.rpc('mod_ban', {
        moderator_id: moderatorId,
        alias: ana.alias,
        reason: 'Insultos después de dos avisos.',
        hours: 24,
      });
      if (error) {
        throw new Error('mod_ban falló: ' + error.message);
      }
    });

    test('no puedo publicar, responder ni reportar', async () => {
      expect(await tryToPost(ana)).toBe(RLS_ERROR);
      expect(await tryToReply(ana, betoPostId)).toBe(RLS_ERROR);
      expect(await tryToReport(ana, betoPostId)).toBe(RLS_ERROR);
    });

    test('no puedo editar ni borrar lo mío', async () => {
      const edited = await ana.client.from('posts').update({ content: 'Editado.' }).eq('id', anaPostId);
      const deleted = await ana.client
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', anaPostId);

      expect(edited.error?.code).toBe(RLS_ERROR);
      expect(deleted.error?.code).toBe(RLS_ERROR);
    });

    test('sigo leyendo el foro', async () => {
      const { data, error } = await ana.client.from('posts').select('id').eq('id', betoPostId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    test('veo mi motivo y hasta cuándo', async () => {
      const { data, error } = await ana.client.rpc('get_my_active_ban');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].reason).toBe('Insultos después de dos avisos.');
      expect(Date.parse(data[0].ends_at)).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    });

    test('otra sesión ve "suspended" junto al alias, pero no el motivo', async () => {
      const author = await beto.client
        .from('posts')
        .select('author:profiles(display_name, restriction)')
        .eq('id', anaPostId)
        .single();
      const myBan = await beto.client.rpc('get_my_active_ban');

      expect(author.error).toBeNull();
      expect(author.data?.author).toEqual({ display_name: ana.alias, restriction: 'suspended' });
      expect(myBan.data).toEqual([]);
    });

    test('nadie lee private.bans desde la app', async () => {
      const { error } = await beto.client.schema('private').from('bans').select('*');

      expect(error).not.toBeNull();
    });

    test('suspender otra vez a quien ya tiene un baneo falla', async () => {
      const { error } = await admin.rpc('mod_ban', {
        moderator_id: moderatorId,
        alias: ana.alias,
        reason: 'Otra vez.',
        hours: 48,
      });

      expect(error?.message).toBe('ya_tiene_baneo');
    });
  });

  describe('el teléfono baneado', () => {
    test('una cuenta nueva en el mismo teléfono tampoco puede escribir', async () => {
      const otherAccount = await signInAsMember();
      await registerDevice(otherAccount, anaDevice);

      expect(await tryToReply(otherAccount, betoPostId)).toBe(RLS_ERROR);
      const { data } = await otherAccount.client.rpc('get_my_active_ban');
      expect(data).toHaveLength(1);
    });

    test('límite conocido: una cuenta nueva con otro identificador sí puede', async () => {
      const otherAccount = await signInAsMember();
      await registerDevice(otherAccount, `otro-${runTag}`);

      expect(await tryToReply(otherAccount, betoPostId)).toBeNull();
    });
  });

  describe('banear y quitar el baneo', () => {
    test('banear sobre una suspensión la reemplaza por un baneo sin fecha', async () => {
      const { data, error } = await admin.rpc('mod_ban', {
        moderator_id: moderatorId,
        alias: ana.alias,
        reason: 'Datos personales de otra persona.',
      });
      const author = await admin.rpc('mod_get_author', { alias: ana.alias });

      expect(error).toBeNull();
      expect(data).toEqual({ alias: ana.alias, termina: null, reemplazo_suspension: true });
      expect(author.data.baneo_activo).toMatchObject({ motivo: 'Datos personales de otra persona.', termina: null });
      expect(author.data.dispositivos).toBe(1);
      expect(author.data.baneos).toHaveLength(2);
    });

    test('el alias ahora dice "banned" y solo queda un baneo vigente', async () => {
      const author = await beto.client.from('profiles').select('restriction').eq('id', ana.userId).single();
      const myBan = await ana.client.rpc('get_my_active_ban');

      expect(author.data?.restriction).toBe('banned');
      expect(myBan.data).toEqual([{ reason: 'Datos personales de otra persona.', ends_at: null }]);
    });

    test('banear a quien ya está baneado falla', async () => {
      const { error } = await admin.rpc('mod_ban', { moderator_id: moderatorId, alias: ana.alias, reason: 'Otra vez.' });

      expect(error?.message).toBe('ya_tiene_baneo');
    });

    test('quitar el baneo libera la cuenta y su teléfono, y queda en la bitácora', async () => {
      const { error } = await admin.rpc('mod_unban', { moderator_id: moderatorId, alias: ana.alias, note: 'Prueba.' });
      const author = await admin.rpc('mod_get_author', { alias: ana.alias });
      const actions = author.data.acciones_recientes.map((action: { accion: string }) => action.accion);

      expect(error).toBeNull();
      expect(await tryToReply(ana, betoPostId)).toBeNull();
      expect(author.data.baneo_activo).toBeNull();
      expect(actions.slice(0, 3)).toEqual(['unban', 'ban', 'ban']);
    });

    test('quitar un baneo que no existe falla', async () => {
      const { error } = await admin.rpc('mod_unban', { moderator_id: moderatorId, alias: ana.alias });

      expect(error?.message).toBe('sin_baneo');
    });

    test('la duración va de 1 a 720 horas', async () => {
      const tooShort = await admin.rpc('mod_ban', { moderator_id: moderatorId, alias: ana.alias, reason: 'x', hours: 0 });
      const tooLong = await admin.rpc('mod_ban', { moderator_id: moderatorId, alias: ana.alias, reason: 'x', hours: 721 });

      expect(tooShort.error?.message).toBe('duracion_invalida');
      expect(tooLong.error?.message).toBe('duracion_invalida');
    });
  });

  describe('permisos', () => {
    test('una sesión no puede llamar a mod_ban ni a mod_unban', async () => {
      const banned = await beto.client.rpc('mod_ban', { moderator_id: moderatorId, alias: ana.alias, reason: 'x' });
      const lifted = await beto.client.rpc('mod_unban', { moderator_id: moderatorId, alias: ana.alias });

      expect(banned.error).not.toBeNull();
      expect(lifted.error).not.toBeNull();
    });

    test('una sesión no puede llamar a las funciones internas ni escribir baneos', async () => {
      const internal = await beto.client.schema('private').rpc('active_bans_for', { target: ana.userId });
      const written = await beto.client
        .schema('private')
        .from('bans')
        .insert({ user_id: ana.userId, reason: 'x', created_by: moderatorId });

      expect(internal.error).not.toBeNull();
      expect(written.error).not.toBeNull();
    });
  });
});
