import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { markNoticeSeen } from './api';

export function useMarkNoticeSeen(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNoticeSeen,
    // el aviso se ocultó: también cambia tu lista de Perfil
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
    },
  });
}
