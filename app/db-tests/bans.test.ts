// Pruebas de suspensiones y baneos: teléfonos, la regla private.can_write() en las políticas y
// las funciones mod_ban / mod_unban. El cliente con la llave secreta hace lo que hace la Edge Function.
// Igual que moderation.test.ts, necesitan db-tests/.env.test (ver db-tests/.env.example).
import { randomUUID } from 'node:crypto';

import { createAdminClient } from './helpers/clients';
import { createPostAsAdmin } from './helpers/content';
import { RLS_ERROR } from './helpers/errors';
import {
  fetchTestModeratorId,
  registerDevice,
  signInWithRulesAccepted,
  type TestUser,
} from './helpers/users';

const admin = createAdminClient();

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
    moderatorId = await fetchTestModeratorId(admin);
    ana = await signInWithRulesAccepted();
    beto = await signInWithRulesAccepted();
    await registerDevice(beto, `beto-${runTag}`);
    betoPostId = await createPostAsAdmin(admin, beto, 'Publicación de Beto');
    anaPostId = await createPostAsAdmin(admin, ana, 'Publicación de Ana');
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
      const otherAccount = await signInWithRulesAccepted();
      await registerDevice(otherAccount, anaDevice);

      expect(await tryToReply(otherAccount, betoPostId)).toBe(RLS_ERROR);
      const { data } = await otherAccount.client.rpc('get_my_active_ban');
      expect(data).toHaveLength(1);
    });

    test('límite conocido: una cuenta nueva con otro identificador sí puede', async () => {
      const otherAccount = await signInWithRulesAccepted();
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

  describe('dos cuentas baneadas en el mismo teléfono', () => {
    const sharedDevice = `compartido-${runTag}`;
    let carla: TestUser;
    let dani: TestUser;

    beforeAll(async () => {
      carla = await signInWithRulesAccepted();
      dani = await signInWithRulesAccepted();
      await registerDevice(carla, sharedDevice);
      await registerDevice(dani, sharedDevice);
      for (const user of [carla, dani]) {
        const { error } = await admin.rpc('mod_ban', { moderator_id: moderatorId, alias: user.alias, reason: 'Spam.' });
        if (error) {
          throw new Error('mod_ban falló: ' + error.message);
        }
      }
    });

    test('quitar el baneo de una no libera el teléfono que la otra tiene baneado', async () => {
      const { error } = await admin.rpc('mod_unban', { moderator_id: moderatorId, alias: carla.alias });
      const newAccount = await signInWithRulesAccepted();
      await registerDevice(newAccount, sharedDevice);

      expect(error).toBeNull();
      expect(await tryToReply(dani, betoPostId)).toBe(RLS_ERROR);
      expect(await tryToReply(newAccount, betoPostId)).toBe(RLS_ERROR);
    });

    test('al quitar también el de la otra, el teléfono queda libre', async () => {
      const { error } = await admin.rpc('mod_unban', { moderator_id: moderatorId, alias: dani.alias });

      expect(error).toBeNull();
      expect(await tryToReply(carla, betoPostId)).toBeNull();
      expect(await tryToReply(dani, betoPostId)).toBeNull();
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
