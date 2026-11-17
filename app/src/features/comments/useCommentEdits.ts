import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchCommentEdits } from './api';
import type { CommentEdit } from './types';

export function useCommentEdits(commentId: number): UseQueryResult<CommentEdit[]> {
  return useQuery({
    queryKey: ['comments', 'edits', commentId],
    queryFn: () => fetchCommentEdits(commentId),
  });
}
