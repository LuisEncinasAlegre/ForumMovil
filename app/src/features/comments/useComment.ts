import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchComment } from './api';
import type { ThreadComment } from './types';

export function useComment(commentId: number): UseQueryResult<ThreadComment | null> {
  return useQuery({
    queryKey: ['comments', 'detail', commentId],
    queryFn: () => fetchComment(commentId),
  });
}
