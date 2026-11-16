import type { Tables } from '@/lib/database.types';

// restriction: 'suspended', 'banned' o null, calculado en la base para cada autor.
export type PostAuthor = Pick<Tables<'profiles'>, 'id' | 'display_name' | 'color' | 'restriction'>;

// Una publicación con el alias de quien la escribió (lo que devuelven publicar y editar).
export type Post = Pick<Tables<'posts'>, 'id' | 'title' | 'content' | 'status' | 'created_at' | 'edited_at'> & {
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
