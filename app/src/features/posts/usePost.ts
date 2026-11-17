import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchPost } from './api';
import type { FeedPost } from './types';

// postId null = no hay nada que cargar (por ejemplo, Escribir para una publicación nueva).
export function usePost(postId: number | null): UseQueryResult<FeedPost | null> {
  return useQuery({
    queryKey: ['posts', 'detail', postId],
    queryFn: () => (postId === null ? null : fetchPost(postId)),
    enabled: postId !== null,
  });
}
