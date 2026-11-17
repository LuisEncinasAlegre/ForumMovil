import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';

import { FEED_PAGE_SIZE, fetchFeedPage } from './api';
import type { FeedPost } from './types';

// Si la página vino completa puede haber más: seguimos desde el id de la última publicación.
export function getNextFeedCursor(lastPage: FeedPost[]): number | undefined {
  if (lastPage.length < FEED_PAGE_SIZE) {
    return undefined;
  }
  return lastPage[lastPage.length - 1].id;
}

export function useFeed(): UseInfiniteQueryResult<InfiniteData<FeedPost[], number | null>> {
  return useInfiniteQuery({
    queryKey: ['posts', 'feed'],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: getNextFeedCursor,
  });
}
