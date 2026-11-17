import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { updatePost } from './api';
import type { Post, PostDraft } from './types';

type UpdatePostVariables = {
  postId: number;
  draft: PostDraft;
};

export function useUpdatePost(): UseMutationResult<Post, Error, UpdatePostVariables> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, draft }: UpdatePostVariables) => updatePost(postId, draft),
    // también refresca la publicación y sus versiones anteriores
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}
