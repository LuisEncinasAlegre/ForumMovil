import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchPostEdits } from './api';
import type { PostEdit } from './types';

export function usePostEdits(postId: number): UseQueryResult<PostEdit[]> {
  return useQuery({
    queryKey: ['posts', 'edits', postId],
    queryFn: () => fetchPostEdits(postId),
  });
}
