import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchPost } from './api';
import type { FeedPost } from './types';

// postId null o inválido = no hay nada que cargar (por ejemplo, Escribir para una publicación nueva).
export function usePost(postId: number | null): UseQueryResult<FeedPost | null> {
  const isValidId = postId !== null && Number.isInteger(postId) && postId > 0;
  return useQuery({
    queryKey: ['posts', 'detail', postId],
    queryFn: () => (isValidId ? fetchPost(postId) : null),
    enabled: isValidId,
  });
}
