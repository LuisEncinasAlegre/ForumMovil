// Único archivo que habla con las tablas comments y comment_edits. Si Supabase devuelve error, lo lanzamos.
import { supabase } from '@/lib/supabase';

import type { CommentEdit, ThreadComment } from './types';
import { COMMENT_COLUMNS } from './columns';

export const COMMENTS_PAGE_SIZE = 50;

// La respuesta se borró, la ocultó moderación o no es tuya: el update no encontró la fila.
export class CommentNotEditableError extends Error {
  constructor() {
    super('La respuesta ya no se puede editar.');
    this.name = 'CommentNotEditableError';
  }
}

// Cuántas respuestas tuyas siguen visibles, para Perfil. head no trae filas.
export async function countMyComments(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('status', 'visible')
    .is('deleted_at', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

// Las respuestas más viejas primero, como una conversación. afterId es el id de la última que ya se mostró.
export async function fetchCommentsPage(postId: number, afterId: number | null): Promise<ThreadComment[]> {
  // el autor también puede leer sus respuestas borradas, por eso filtramos aquí
  let query = supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('post_id', postId)
    .eq('status', 'visible')
    .is('deleted_at', null);
  if (afterId !== null) {
    query = query.gt('id', afterId);
  }
  const { data, error } = await query.order('id', { ascending: true }).limit(COMMENTS_PAGE_SIZE);
  if (error) {
    throw error;
  }
  return data;
}

// null si ya no existe o ya no se puede ver.
export async function fetchComment(commentId: number): Promise<ThreadComment | null> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('id', commentId)
    .eq('status', 'visible')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function createComment(postId: number, content: string): Promise<ThreadComment> {
  // autor, estado y fecha los pone la base de datos
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, content: content.trim() })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function updateComment(commentId: number, content: string): Promise<ThreadComment> {
  // un trigger guarda la versión anterior y pone edited_at
  const { data, error } = await supabase
    .from('comments')
    .update({ content: content.trim() })
    .eq('id', commentId)
    .select(COMMENT_COLUMNS)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new CommentNotEditableError();
  }
  return data;
}

// Borrado suave: la respuesta sale del hilo pero la fila se queda.
export async function deleteComment(commentId: number): Promise<void> {
  // La hora que mandamos no importa: el trigger la cambia por la del servidor.
  const { data, error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('id')
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new CommentNotEditableError();
  }
}

// Versiones anteriores, de la más nueva a la más vieja.
export async function fetchCommentEdits(commentId: number): Promise<CommentEdit[]> {
  const { data, error } = await supabase
    .from('comment_edits')
    .select('id, content, written_at')
    .eq('comment_id', commentId)
    .order('id', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
}
