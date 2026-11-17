import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { deleteComment } from './api';

export function useDeleteComment(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    // ['posts'] porque cambia el número de respuestas
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]),
  });
}
