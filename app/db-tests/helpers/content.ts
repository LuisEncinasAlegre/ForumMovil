// Publicaciones y respuestas creadas con la llave secreta y con fecha de hace unos minutos:
// así no chocan con los límites por minuto (probados en posts.test.ts y comments.test.ts).
// Los triggers de revisión corren igual, sea quien sea quien inserta.
import type { SupabaseClient } from '@supabase/supabase-js';

import type { TestUser } from './users';

function fiveMinutesAgo(): string {
  return new Date(Date.now() - 5 * 60 * 1000).toISOString();
}

export async function createPostAsAdmin(
  admin: SupabaseClient,
  user: TestUser,
  title: string,
  content: string = 'Texto de prueba.',
): Promise<number> {
  const { data, error } = await admin
    .from('posts')
    .insert({ title, content, author_id: user.userId, created_at: fiveMinutesAgo() })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error('No se pudo crear la publicación: ' + error?.message);
  }
  return data.id;
}

export async function createCommentAsAdmin(
  admin: SupabaseClient,
  user: TestUser,
  postId: number,
  content: string = 'Respuesta de prueba.',
): Promise<number> {
  const { data, error } = await admin
    .from('comments')
    .insert({ post_id: postId, content, author_id: user.userId, created_at: fiveMinutesAgo() })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error('No se pudo crear la respuesta: ' + error?.message);
  }
  return data.id;
}
