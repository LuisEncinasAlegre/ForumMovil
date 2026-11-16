import type { Tables } from '@/lib/database.types';
import type { Profile } from '@/features/session/types';

export type PostAuthor = Pick<Profile, 'id' | 'display_name' | 'color'>;

// Una publicación como se muestra en la app (con el alias de quien la escribió).
export type FeedPost = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'created_at' | 'edited_at'> & {
  author: PostAuthor;
};

// Una versión anterior de una publicación editada.
export type PostEdit = Pick<Tables<'post_edits'>, 'id' | 'title' | 'content' | 'written_at'>;

// Lo que se escribe en Escribir.
export type PostDraft = {
  title: string;
  content: string;
};
