import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { createComment } from './api';
import type { ThreadComment } from './types';

export function useCreateComment(postId: number): UseMutationResult<ThreadComment, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createComment(postId, content),
    // Devolvemos la promesa para que la mutación siga "pendiente" hasta que el hilo ya trae
    // la respuesta real; así la respuesta tenue no parpadea. ['posts'] es por el conteo.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]),
  });
}
