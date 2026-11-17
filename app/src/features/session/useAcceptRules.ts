import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { acceptRules } from './api';
import type { Profile } from './types';
import { useSession } from './useSession';

export function useAcceptRules(): UseMutationResult<Profile, Error, void> {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('No hay sesión para aceptar las reglas.');
      }
      return acceptRules(userId);
    },
    onSuccess: (profile) => {
      // con el perfil nuevo en caché, el control de acceso deja pasar al foro sin otra consulta
      queryClient.setQueryData(['profile', userId], profile);
    },
  });
}
