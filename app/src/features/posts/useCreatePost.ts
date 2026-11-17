import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { createPost } from './api';
import type { Post, PostDraft } from './types';

export function useCreatePost(): UseMutationResult<Post, Error, PostDraft> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: PostDraft) => createPost(draft),
    // el foro se vuelve a pedir desde la primera página y la nueva sale arriba
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}
