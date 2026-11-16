import type { Tables } from '@/lib/database.types';
import type { PostAuthor } from '@/features/posts/types';

// Una respuesta como se muestra en el hilo. Se llama ThreadComment porque `Comment`
// ya es un tipo global de TypeScript (el comentario del DOM).
export type ThreadComment = Pick<Tables<'comments'>, 'id' | 'post_id' | 'content' | 'created_at' | 'edited_at'> & {
  author: PostAuthor;
};

// Una versión anterior de una respuesta editada.
export type CommentEdit = Pick<Tables<'comment_edits'>, 'id' | 'content' | 'written_at'>;
