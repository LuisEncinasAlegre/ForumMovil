import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';

import { useSession } from '@/features/session/useSession';

import { fetchMyPostsPage } from './api';
import type { FeedPost } from './types';
import { getNextFeedCursor } from './useFeed';

// Bajo ['posts'] para que publicar, editar o eliminar también actualice Perfil.
export function useMyPosts(): UseInfiniteQueryResult<InfiniteData<FeedPost[], number | null>> {
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  return useInfiniteQuery({
    queryKey: ['posts', 'mine', userId],
    queryFn: ({ pageParam }) => fetchMyPostsPage(userId, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: getNextFeedCursor,
    enabled: userId !== '',
  });
}
