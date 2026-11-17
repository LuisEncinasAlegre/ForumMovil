// Pruebas de la moderación: revisiones automáticas, funciones mod_* y avisos al autor.
// Además del .env necesitan db-tests/.env.test con SUPABASE_SECRET_KEY y MODERATOR_TEST_TOKEN
// (ver db-tests/.env.example). El cliente con la llave secreta hace lo que hace la Edge Function.
import { randomUUID } from 'node:crypto';

import { createAdminClient } from './helpers/clients';
import { createPostAsAdmin } from './helpers/content';
import { testEnv } from './helpers/env';
import { fetchTestModeratorId, signInAsMember, type TestUser } from './helpers/users';

type Target = { target_post_id: number | null; target_comment_id: number | null };

const admin = createAdminClient();
const moderatorToken = testEnv.moderatorToken;

// Los que reportan se crean con la API de administración para no gastar sesiones anónimas.
async function createReporters(count: number): Promise<string[]> {
  const reporterIds: string[] = [];
  for (let index = 0; index < count; index++) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `reporte-${randomUUID()}@example.com`,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error('No se pudo crear a quien reporta: ' + error?.message);
    }
    reporterIds.push(data.user.id);
  }
  return reporterIds;
}

// Aquí se crean muchas publicaciones seguidas, así que van con la llave secreta (ver helpers/content.ts).
async function createTestPost(user: TestUser, title: string, content: string): Promise<number> {
  return createPostAsAdmin(admin, user, title, content);
}

async function pendingReasons(target: Target): Promise<string[] | null> {
  const { data, error } = await admin.rpc('mod_get_content', target);
  if (error) {
    throw new Error('mod_get_content falló: ' + error.message);
  }
  return data.pendiente === null ? null : data.pendiente.razones;
}

function postTarget(postId: number): Target {
  return { target_post_id: postId, target_comment_id: null };
}

describe('moderación', () => {
  let ana: TestUser;
  let beto: TestUser;
  let moderatorId: number;
  let reporterIds: string[] = [];
  // cada corrida usa textos distintos para que "repetido" no choque con corridas anteriores
  const runTag = randomUUID().slice(0, 8);

  beforeAll(async () => {
    moderatorId = await fetchTestModeratorId(admin);
    ana = await signInAsMember();
    beto = await signInAsMember();
    reporterIds = await createReporters(10);
  });

  afterAll(async () => {
    for (const reporterId of reporterIds) {
      await admin.auth.admin.deleteUser(reporterId);
    }
  });

  describe('revisiones automáticas', () => {
    test('una publicación normal no entra a la cola', async () => {
      const postId = await createTestPost(
        ana,
        'Horarios de la biblioteca',
        `¿Alguien sabe a qué hora abren? ${runTag}`,
      );

      expect(await pendingReasons(postTarget(postId))).toBeNull();
    });

    test('una palabra de la lista, un enlace o el mismo texto dos veces la mandan a revisión', async () => {
      const wordPostId = await createTestPost(ana, 'Qué coraje', `El de la fila es un gilipollas ${runTag}`);
      const linkPostId = await createTestPost(ana, 'Miren esto', `Entren a www.ejemplo.com ${runTag}`);
      await createTestPost(ana, 'Vendo calculadora', `Escríbanme si les interesa ${runTag}`);
      const repeatedPostId = await createTestPost(ana, 'Vendo calculadora', `Escríbanme si les interesa ${runTag}`);

      expect(await pendingReasons(postTarget(wordPostId))).toEqual(['palabra']);
      expect(await pendingReasons(postTarget(linkPostId))).toEqual(['enlace']);
      expect(await pendingReasons(postTarget(repeatedPostId))).toEqual(['repetido']);
    });

    test('un reporte abre el pendiente o se suma al que ya había', async () => {
      const plainPostId = await createTestPost(ana, 'Pregunta tranquila', `Nada raro aquí ${runTag}`);
      const wordPostId = await createTestPost(ana, 'Otra queja', `Qué cabron el profe ${runTag}`);

      await beto.client.from('reports').insert({ post_id: plainPostId, reason: 'spam' });
      await beto.client.from('reports').insert({ post_id: wordPostId, reason: 'acoso' });

      expect(await pendingReasons(postTarget(plainPostId))).toEqual(['reportado']);
      expect(await pendingReasons(postTarget(wordPostId))).toEqual(['palabra', 'reportado']);
    });
  });

  describe('lo que no puede hacer una sesión normal', () => {
    test('no puede llamar las funciones de moderación', async () => {
      const list = await beto.client.rpc('mod_list_pending', { max_items: 5 });
      const whoami = await beto.client.rpc('mod_whoami', { token: moderatorToken });
      const hide = await beto.client.rpc('mod_hide', {
        moderator_id: moderatorId,
        target_post_id: 1,
        target_comment_id: null,
        category: 'spam',
        message: 'x',
      });

      expect(list.error?.code).toBe('42501');
      expect(whoami.error?.code).toBe('42501');
      expect(hide.error?.code).toBe('42501');
    });

    test('no puede ver las tablas privadas', async () => {
      const queue = await beto.client.schema('private').from('review_items').select('id');
      const moderators = await beto.client.schema('private').from('moderators').select('token_hash');

      expect(queue.data).toBeNull();
      expect(queue.error).not.toBeNull();
      expect(moderators.data).toBeNull();
    });

    test('no puede crearse avisos', async () => {
      const { error } = await beto.client.from('moderation_notices').insert({
        user_id: beto.userId,
        post_id: 1,
        category: 'spam',
        message: 'x',
        excerpt: 'x',
      });

      expect(error?.code).toBe('42501');
    });
  });

  describe('ocultar y restaurar', () => {
    let postId: number;

    beforeAll(async () => {
      postId = await createTestPost(ana, 'Algo que rompe las reglas', `Texto ofensivo de prueba ${runTag}`);
      await beto.client.from('reports').insert({ post_id: postId, reason: 'acoso' });
    });

    test('ocultar lo quita del foro, cierra el pendiente y avisa solo al autor', async () => {
      const { error } = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'acoso',
        message: 'Aquí no se ataca a nadie.',
      });
      const seenByBeto = await beto.client.from('posts').select('id').eq('id', postId);
      const seenByAna = await ana.client.from('posts').select('status, edited_at').eq('id', postId).single();
      const anaNotices = await ana.client.from('moderation_notices').select('*').eq('post_id', postId);
      const betoNotices = await beto.client.from('moderation_notices').select('id').eq('post_id', postId);

      expect(error).toBeNull();
      expect(seenByBeto.data).toEqual([]);
      expect(seenByAna.data).toEqual({ status: 'hidden', edited_at: null }); // no cuenta como editada
      expect(await pendingReasons(postTarget(postId))).toBeNull();
      expect(anaNotices.data).toHaveLength(1);
      expect(anaNotices.data?.[0]).toMatchObject({
        category: 'acoso',
        message: 'Aquí no se ataca a nadie.',
        excerpt: 'Algo que rompe las reglas',
        counts_as_warning: true,
        seen_at: null,
      });
      expect(betoNotices.data).toEqual([]);
    });

    test('el autor solo puede marcar su aviso como visto', async () => {
      const seen = await ana.client
        .from('moderation_notices')
        .update({ seen_at: new Date().toISOString() })
        .eq('post_id', postId)
        .select('seen_at');
      const rewrite = await ana.client
        .from('moderation_notices')
        .update({ message: 'Todo bien' })
        .eq('post_id', postId);
      const othersNotice = await beto.client
        .from('moderation_notices')
        .update({ seen_at: new Date().toISOString() })
        .eq('post_id', postId)
        .select('id');

      expect(seen.error).toBeNull();
      expect(seen.data).toHaveLength(1);
      expect(rewrite.error?.code).toBe('42501');
      expect(othersNotice.data).toEqual([]);
    });

    test('no se puede ocultar dos veces ni editar lo oculto', async () => {
      const again = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'acoso',
        message: 'Otra vez.',
      });
      const edit = await ana.client.from('posts').update({ content: 'Ya lo arreglé' }).eq('id', postId).select('id');

      expect(again.error?.message).toBe('ya_esta_oculto');
      expect(edit.data).toEqual([]);
    });

    test('restaurar la vuelve visible y retira el aviso', async () => {
      const { error } = await admin.rpc('mod_restore', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        note: 'Era una broma entre amigos.',
      });
      const seenByBeto = await beto.client.from('posts').select('id').eq('id', postId);
      const notice = await ana.client.from('moderation_notices').select('withdrawn_at').eq('post_id', postId).single();

      expect(error).toBeNull();
      expect(seenByBeto.data).toEqual([{ id: postId }]);
      expect(notice.data?.withdrawn_at).not.toBeNull();
    });
  });

  describe('10 reportes', () => {
    let postId: number;

    beforeAll(async () => {
      postId = await createTestPost(ana, 'Publicación muy reportada', `Contenido polémico ${runTag}`);
    });

    test('al décimo reporte se oculta sola con un aviso que no cuenta', async () => {
      for (const [index, reporterId] of reporterIds.entries()) {
        const reason = index < 6 ? 'spam' : 'otro';
        const { error } = await admin.from('reports').insert({ post_id: postId, reason, reporter_id: reporterId });
        if (error) {
          throw new Error('No se pudo reportar: ' + error.message);
        }
      }
      const seenByBeto = await beto.client.from('posts').select('id').eq('id', postId);
      const notice = await ana.client.from('moderation_notices').select('*').eq('post_id', postId).single();

      expect(seenByBeto.data).toEqual([]);
      expect(notice.data).toMatchObject({ category: 'spam', counts_as_warning: false });
      expect(await pendingReasons(postTarget(postId))).toEqual(['10_reportes', 'reportado']);
    });

    test('quien modera confirma el ocultado y el aviso empieza a contar', async () => {
      const { error } = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'spam',
        message: 'Publicidad repetida.',
      });
      const notice = await ana.client.from('moderation_notices').select('*').eq('post_id', postId).single();

      expect(error).toBeNull();
      expect(notice.data).toMatchObject({ counts_as_warning: true, message: 'Publicidad repetida.' });
    });
  });

  describe('errores de las funciones', () => {
    test('rechaza datos inválidos', async () => {
      const postId = await createTestPost(ana, 'Para probar errores', `Nada que ver ${runTag}`);
      const badCategory = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'feo',
        message: 'x',
      });
      const emptyMessage = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'spam',
        message: '   ',
      });
      const twoTargets = await admin.rpc('mod_get_content', { target_post_id: postId, target_comment_id: 1 });
      const notReviewed = await admin.rpc('mod_mark_reviewed', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        note: null,
      });
      const restoreVisible = await admin.rpc('mod_restore', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        note: null,
      });

      expect(badCategory.error?.message).toBe('categoria_invalida');
      expect(emptyMessage.error?.message).toBe('mensaje_invalido');
      expect(twoTargets.error?.message).toBe('objetivo_invalido');
      expect(notReviewed.error?.message).toBe('sin_pendiente');
      expect(restoreVisible.error?.message).toBe('no_esta_oculto');
    });

    test('no se oculta lo que su autor ya borró', async () => {
      const postId = await createTestPost(ana, 'Me arrepentí', `Lo voy a borrar ${runTag}`);
      await ana.client.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId);
      const { error } = await admin.rpc('mod_hide', {
        moderator_id: moderatorId,
        ...postTarget(postId),
        category: 'otro',
        message: 'x',
      });

      expect(error?.message).toBe('esta_borrado');
    });

    test('un token equivocado no identifica a nadie', async () => {
      const { error } = await admin.rpc('mod_whoami', { token: 'f'.repeat(64) });

      expect(error?.message).toBe('token_invalido');
    });
  });
});
