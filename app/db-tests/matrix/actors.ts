// Quién llama a la api en la matriz, y las filas sobre las que lo intenta.
// Todas las filas de prueba son de member, salvo las de suspended, banned y noDevice, que sirven
// para probar "es mía, pero no puedo escribir". Para stranger, las de member son "de otra persona".
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient, createTestClient } from '../helpers/clients';
import { createCommentAsAdmin, createPostAsAdmin } from '../helpers/content';
import {
  fetchTestModeratorId,
  signInAsMember,
  signInAsNewUser,
  signInWithRulesAccepted,
  type TestUser,
} from '../helpers/users';

export type ActorName = 'anon' | 'newcomer' | 'noDevice' | 'member' | 'stranger' | 'suspended' | 'banned';

export type FixtureName =
  | 'memberPost'
  | 'memberPostToDelete'
  | 'hiddenPost'
  | 'deletedPost'
  | 'noDevicePost'
  | 'suspendedPost'
  | 'bannedPost'
  | 'memberComment'
  | 'memberCommentToDelete'
  | 'hiddenComment'
  | 'commentOnHiddenPost'
  | 'suspendedComment'
  | 'strangerPost'
  | 'memberNotice'
  | 'memberProfile'
  | 'strangerProfile';

// ids de publicaciones, respuestas y avisos (number) o de usuarios (string)
export type Fixtures = Record<FixtureName, number | string>;

export type Actors = {
  clients: Record<ActorName, SupabaseClient>;
  fixtures: Fixtures;
};

async function hidePostAsModerator(admin: SupabaseClient, moderatorId: number, postId: number): Promise<void> {
  const { error } = await admin.rpc('mod_hide', {
    moderator_id: moderatorId,
    target_post_id: postId,
    target_comment_id: null,
    category: 'spam',
    message: 'Prueba de la matriz.',
  });
  if (error) {
    throw new Error('mod_hide falló: ' + error.message);
  }
}

async function hideCommentAsModerator(admin: SupabaseClient, moderatorId: number, commentId: number): Promise<void> {
  const { error } = await admin.rpc('mod_hide', {
    moderator_id: moderatorId,
    target_post_id: null,
    target_comment_id: commentId,
    category: 'spam',
    message: 'Prueba de la matriz.',
  });
  if (error) {
    throw new Error('mod_hide falló: ' + error.message);
  }
}

async function banAsModerator(admin: SupabaseClient, moderatorId: number, user: TestUser, hours: number | null): Promise<void> {
  const { error } = await admin.rpc('mod_ban', {
    moderator_id: moderatorId,
    alias: user.alias,
    reason: 'Prueba de la matriz.',
    hours,
  });
  if (error) {
    throw new Error('mod_ban falló: ' + error.message);
  }
}

// Cambia el texto como lo haría su autor, para que quede una versión anterior en *_edits.
async function editAsAdmin(admin: SupabaseClient, table: 'posts' | 'comments', id: number): Promise<void> {
  const { error } = await admin.from(table).update({ content: 'Texto corregido.' }).eq('id', id);
  if (error) {
    throw new Error('No se pudo editar la fila de prueba: ' + error.message);
  }
}

async function fetchNoticeId(admin: SupabaseClient, postId: number): Promise<number> {
  const { data, error } = await admin.from('moderation_notices').select('id').eq('post_id', postId).single();
  if (error || !data) {
    throw new Error('No se encontró el aviso de la publicación oculta: ' + error?.message);
  }
  return data.id;
}

// Siete llamadores y sus filas. Seis inicios de sesión anónimos por corrida.
export async function buildActors(): Promise<Actors> {
  const admin = createAdminClient();
  const moderatorId = await fetchTestModeratorId(admin);

  const newcomer = await signInAsNewUser();
  const noDevice = await signInWithRulesAccepted();
  const member = await signInAsMember();
  const stranger = await signInAsMember();
  const suspended = await signInAsMember();
  const banned = await signInAsMember();

  const memberPost = await createPostAsAdmin(admin, member, 'Matriz: publicación');
  const memberPostToDelete = await createPostAsAdmin(admin, member, 'Matriz: para borrar');
  const hiddenPost = await createPostAsAdmin(admin, member, 'Matriz: oculta');
  const deletedPost = await createPostAsAdmin(admin, member, 'Matriz: borrada');
  const noDevicePost = await createPostAsAdmin(admin, noDevice, 'Matriz: sin teléfono');
  const suspendedPost = await createPostAsAdmin(admin, suspended, 'Matriz: suspendida');
  const bannedPost = await createPostAsAdmin(admin, banned, 'Matriz: baneada');
  const strangerPost = await createPostAsAdmin(admin, stranger, 'Matriz: de otra persona');

  const memberComment = await createCommentAsAdmin(admin, member, memberPost);
  const memberCommentToDelete = await createCommentAsAdmin(admin, member, memberPost);
  const hiddenComment = await createCommentAsAdmin(admin, member, memberPost);
  const commentOnHiddenPost = await createCommentAsAdmin(admin, member, hiddenPost);
  const suspendedComment = await createCommentAsAdmin(admin, suspended, memberPost);

  // versiones anteriores antes de ocultar, para probar quién ve el historial
  await editAsAdmin(admin, 'posts', memberPost);
  await editAsAdmin(admin, 'posts', hiddenPost);
  await editAsAdmin(admin, 'comments', memberComment);
  await editAsAdmin(admin, 'comments', hiddenComment);

  await hidePostAsModerator(admin, moderatorId, hiddenPost);
  await hideCommentAsModerator(admin, moderatorId, hiddenComment);
  const memberNotice = await fetchNoticeId(admin, hiddenPost);

  const deleted = await member.client
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deletedPost);
  if (deleted.error) {
    throw new Error('No se pudo borrar la publicación de prueba: ' + deleted.error.message);
  }

  await banAsModerator(admin, moderatorId, suspended, 24);
  await banAsModerator(admin, moderatorId, banned, null);

  return {
    clients: {
      anon: createTestClient(),
      newcomer: newcomer.client,
      noDevice: noDevice.client,
      member: member.client,
      stranger: stranger.client,
      suspended: suspended.client,
      banned: banned.client,
    },
    fixtures: {
      memberPost,
      memberPostToDelete,
      hiddenPost,
      deletedPost,
      noDevicePost,
      suspendedPost,
      bannedPost,
      strangerPost,
      memberComment,
      memberCommentToDelete,
      hiddenComment,
      commentOnHiddenPost,
      suspendedComment,
      memberNotice,
      memberProfile: member.userId,
      strangerProfile: stranger.userId,
    },
  };
}
