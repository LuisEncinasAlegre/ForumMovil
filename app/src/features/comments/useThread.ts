import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';

import { COMMENTS_PAGE_SIZE, fetchCommentsPage } from './api';
import type { ThreadComment } from './types';

// Si la página vino completa puede haber más: seguimos desde el id de la última respuesta.
export function getNextCommentsCursor(lastPage: ThreadComment[]): number | undefined {
  if (lastPage.length < COMMENTS_PAGE_SIZE) {
    return undefined;
  }
  return lastPage[lastPage.length - 1].id;
}

// Las respuestas de un hilo, de la más vieja a la más nueva.
export function useThread(postId: number): UseInfiniteQueryResult<InfiniteData<ThreadComment[], number | null>> {
  return useInfiniteQuery({
    queryKey: ['comments', 'thread', postId],
    queryFn: ({ pageParam }) => fetchCommentsPage(postId, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: getNextCommentsCursor,
    // un id roto (NaN) no se pide
    enabled: postId > 0,
  });
}
