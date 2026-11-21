import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchPostEdits } from './api';
import type { PostEdit } from './types';

export function usePostEdits(postId: number | null): UseQueryResult<PostEdit[]> {
  const isValidId = postId !== null && Number.isInteger(postId) && postId > 0;
  return useQuery({
    queryKey: ['posts', 'edits', postId],
    queryFn: () => (isValidId ? fetchPostEdits(postId) : []),
    enabled: isValidId,
  });
}
