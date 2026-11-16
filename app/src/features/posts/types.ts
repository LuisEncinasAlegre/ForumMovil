import type { Tables } from '@/lib/database.types';
import type { Profile } from '@/features/session/types';

export type PostAuthor = Pick<Profile, 'id' | 'display_name' | 'color'>;

// Una publicación con el alias de quien la escribió (lo que devuelven publicar y editar).
export type Post = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'created_at' | 'edited_at'> & {
  author: PostAuthor;
};

// Una publicación como se muestra en el foro y en el hilo: además, cuántas respuestas tiene.
export type FeedPost = Post & {
  replyCount: number;
};

// Una versión anterior de una publicación editada.
export type PostEdit = Pick<Tables<'post_edits'>, 'id' | 'title' | 'content' | 'written_at'>;

// Lo que se escribe en Escribir.
export type PostDraft = {
  title: string;
  content: string;
};
