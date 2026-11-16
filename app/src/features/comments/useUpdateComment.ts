import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { updateComment } from './api';
import type { ThreadComment } from './types';

type UpdateCommentVariables = {
  commentId: number;
  content: string;
};

export function useUpdateComment(): UseMutationResult<ThreadComment, Error, UpdateCommentVariables> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: UpdateCommentVariables) => updateComment(commentId, content),
    // también refresca la respuesta y sus versiones anteriores
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
}
