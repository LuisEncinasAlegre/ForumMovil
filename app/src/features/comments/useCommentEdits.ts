import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchCommentEdits } from './api';
import type { CommentEdit } from './types';

export function useCommentEdits(commentId: number | null): UseQueryResult<CommentEdit[]> {
  const isValidId = commentId !== null && Number.isInteger(commentId) && commentId > 0;
  return useQuery({
    queryKey: ['comments', 'edits', commentId],
    queryFn: () => (isValidId ? fetchCommentEdits(commentId) : []),
    enabled: isValidId,
  });
}
