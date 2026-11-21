import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchComment } from './api';
import type { ThreadComment } from './types';

export function useComment(commentId: number | null): UseQueryResult<ThreadComment | null> {
  const isValidId = commentId !== null && Number.isInteger(commentId) && commentId > 0;
  return useQuery({
    queryKey: ['comments', 'detail', commentId],
    queryFn: () => (isValidId ? fetchComment(commentId) : null),
    enabled: isValidId,
  });
}
