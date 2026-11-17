// Único archivo que habla con las tablas posts y post_edits. Si Supabase devuelve error, lo lanzamos.
import { supabase } from '@/lib/supabase';

import type { FeedPost, Post, PostDraft, PostEdit } from './types';
import { POST_COLUMNS, POST_WITH_REPLIES_COLUMNS } from './columns';

export const FEED_PAGE_SIZE = 20;

type PostWithReplyCount = Post & {
  comments: { count: number }[];
};

// PostgREST devuelve el conteo como [{ count: n }]; la app solo quiere el número.
function toFeedPost(row: PostWithReplyCount): FeedPost {
  const { comments, ...post } = row;
  return { ...post, replyCount: comments[0]?.count ?? 0 };
}

// La publicación se borró, la ocultó moderación o no es tuya: el update no encontró la fila.
export class PostNotEditableError extends Error {
  constructor() {
    super('La publicación ya no se puede editar.');
    this.name = 'PostNotEditableError';
  }
}

// Las publicaciones más nuevas primero. beforeId es el id de la última que ya se mostró.
export async function fetchFeedPage(beforeId: number | null): Promise<FeedPost[]> {
  // el autor también puede leer sus borradas y ocultas, por eso filtramos aquí
  let query = supabase
    .from('posts')
    .select(POST_WITH_REPLIES_COLUMNS)
    .eq('status', 'visible')
    .is('deleted_at', null)
    .eq('comments.status', 'visible')
    .is('comments.deleted_at', null);
  if (beforeId !== null) {
    query = query.lt('id', beforeId);
  }
  const { data, error } = await query.order('id', { ascending: false }).limit(FEED_PAGE_SIZE);
  if (error) {
    throw error;
  }
  return data.map(toFeedPost);
}

// Tus publicaciones para Perfil, igual que el foro pero solo las tuyas.
// Incluye las ocultas por moderación: solo tú las ves, marcadas como ocultas.
export async function fetchMyPostsPage(userId: string, beforeId: number | null): Promise<FeedPost[]> {
  let query = supabase
    .from('posts')
    .select(POST_WITH_REPLIES_COLUMNS)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .eq('comments.status', 'visible')
    .is('comments.deleted_at', null);
  if (beforeId !== null) {
    query = query.lt('id', beforeId);
  }
  const { data, error } = await query.order('id', { ascending: false }).limit(FEED_PAGE_SIZE);
  if (error) {
    throw error;
  }
  return data.map(toFeedPost);
}

// Solo el número: head no trae filas. Cuenta las ocultas, como la lista de Perfil.
export async function countMyPosts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .is('deleted_at', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

// null si ya no existe o ya no se puede ver.
export async function fetchPost(postId: number): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_REPLIES_COLUMNS)
    .eq('id', postId)
    .eq('status', 'visible')
    .is('deleted_at', null)
    .eq('comments.status', 'visible')
    .is('comments.deleted_at', null)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? toFeedPost(data) : null;
}

export async function createPost(draft: PostDraft): Promise<Post> {
  // autor, estado y fecha los pone la base de datos
  const { data, error } = await supabase
    .from('posts')
    .insert({ title: draft.title.trim(), content: draft.content.trim() })
    .select(POST_COLUMNS)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function updatePost(postId: number, draft: PostDraft): Promise<Post> {
  // un trigger guarda la versión anterior y pone edited_at
  const { data, error } = await supabase
    .from('posts')
    .update({ title: draft.title.trim(), content: draft.content.trim() })
    .eq('id', postId)
    .select(POST_COLUMNS)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new PostNotEditableError();
  }
  return data;
}

// Borrado suave: la publicación sale del foro pero la fila se queda.
export async function deletePost(postId: number): Promise<void> {
  // La hora que mandamos no importa: el trigger la cambia por la del servidor.
  const { data, error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new PostNotEditableError();
  }
}

// Versiones anteriores, de la más nueva a la más vieja.
export async function fetchPostEdits(postId: number): Promise<PostEdit[]> {
  const { data, error } = await supabase
    .from('post_edits')
    .select('id, title, content, written_at')
    .eq('post_id', postId)
    .order('id', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
}
