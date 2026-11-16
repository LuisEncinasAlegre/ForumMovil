import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { updateMyColor } from './api';
import type { Profile } from './types';
import { useSession } from './useSession';

type UpdateColorContext = {
  previousProfile: Profile | null | undefined;
};

// Cambia tu color al instante: lo ponemos en caché antes de que responda Supabase
// y, si falla, regresamos al anterior.
export function useUpdateMyColor(): UseMutationResult<Profile, Error, string, UpdateColorContext> {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const profileKey = ['profile', userId];

  return useMutation({
    mutationFn: async (color: string) => {
      if (!userId) {
        throw new Error('No hay sesión para cambiar el color.');
      }
      return updateMyColor(userId, color);
    },
    onMutate: async (color) => {
      // que una lectura en curso no pise el color nuevo
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previousProfile = queryClient.getQueryData<Profile | null>(profileKey);
      if (previousProfile) {
        queryClient.setQueryData<Profile>(profileKey, { ...previousProfile, color });
      }
      return { previousProfile };
    },
    onError: (_error, _color, context) => {
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(profileKey, context.previousProfile);
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKey }),
        // tus filas en el foro y el hilo traen tu color, también hay que releerlas
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
      ]),
  });
}
