import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { deletePost } from './api';

export function useDeletePost(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}
