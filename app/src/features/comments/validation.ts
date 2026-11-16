import { countCharacters } from '@/features/posts/validation';

// El mismo límite que el check de la tabla comments (supabase/migrations/*_comments.sql).
// La base de datos es la que manda; esto solo es para avisar rápido en la pantalla.
export const COMMENT_MAX_LENGTH = 1000;

export function isCommentValid(content: string): boolean {
  const length = countCharacters(content);
  return length >= 1 && length <= COMMENT_MAX_LENGTH;
}
