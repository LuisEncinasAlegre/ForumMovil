import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { createComment, fetchCommentsPage } from './api';
import type { ThreadComment } from './types';
import { getNextCommentsCursor } from './useThread';

type ThreadData = InfiniteData<ThreadComment[], number | null>;

// Recarga el hilo y, si tu respuesta cayó en una página que aún no se había cargado (hilos
// largos), sigue cargando páginas hasta que aparece. Así no "desaparece" al terminar de enviarse.
export async function showReplyInThread(queryClient: QueryClient, postId: number, commentId: number): Promise<void> {
  const queryKey = ['comments', 'thread', postId];
  await queryClient.invalidateQueries({ queryKey });

  let thread = queryClient.getQueryData<ThreadData>(queryKey);
  while (thread) {
    const isLoaded = thread.pages.some((page) => page.some((comment) => comment.id === commentId));
    const nextCursor = getNextCommentsCursor(thread.pages[thread.pages.length - 1]);
    if (isLoaded || nextCursor === undefined) {
      return;
    }
    const page = await fetchCommentsPage(postId, nextCursor);
    queryClient.setQueryData<ThreadData>(queryKey, (current) =>
      current ? { pages: [...current.pages, page], pageParams: [...current.pageParams, nextCursor] } : current,
    );
    thread = queryClient.getQueryData<ThreadData>(queryKey);
  }
}

export function useCreateComment(postId: number): UseMutationResult<ThreadComment, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createComment(postId, content),
    // Devolvemos la promesa para que la mutación siga "pendiente" hasta que el hilo ya trae
    // la respuesta real; así la respuesta tenue no parpadea. ['posts'] es por el conteo.
    onSuccess: (comment) =>
      Promise.all([
        showReplyInThread(queryClient, postId, comment.id),
        queryClient.invalidateQueries({ queryKey: ['comments', 'mineCount'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]),
    onError: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}
