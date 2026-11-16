import type { PostDraft } from './types';

// Los mismos límites que los checks de la tabla posts (supabase/migrations/*_posts.sql).
// La base de datos es la que manda; esto solo es para avisar rápido en la pantalla.
export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 120;
export const CONTENT_MAX_LENGTH = 2000;

// Postgres cuenta caracteres reales; .length de JS cuenta un emoji como 2.
export function countCharacters(text: string): number {
  return Array.from(text.trim()).length;
}

export function isPostDraftValid(draft: PostDraft): boolean {
  const titleLength = countCharacters(draft.title);
  const contentLength = countCharacters(draft.content);
  return (
    titleLength >= TITLE_MIN_LENGTH &&
    titleLength <= TITLE_MAX_LENGTH &&
    contentLength >= 1 &&
    contentLength <= CONTENT_MAX_LENGTH
  );
}
