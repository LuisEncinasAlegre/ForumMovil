import type { Tables } from '@/lib/database.types';

// Las mismas cuatro categorías que los reportes (check de moderation_notices.category).
export type NoticeCategory = 'spam' | 'acoso' | 'inapropiado' | 'otro';

// Un aviso de moderación: algo tuyo se ocultó y por qué.
export type ModerationNotice = Pick<
  Tables<'moderation_notices'>,
  'id' | 'post_id' | 'comment_id' | 'message' | 'excerpt' | 'counts_as_warning' | 'created_at'
> & {
  category: NoticeCategory;
};
