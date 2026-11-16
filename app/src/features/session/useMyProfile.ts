import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchMyProfile, forgetSession } from './api';
import type { Profile } from './types';
import { useSession } from './useSession';

export function useMyProfile(): UseQueryResult<Profile | null> {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }
      const profile = await fetchMyProfile(userId);
      if (!profile) {
        // La sesión guardada es de un usuario que ya no existe: volvemos a la bienvenida.
        await forgetSession();
      }
      return profile;
    },
    enabled: !!userId,
  });
}
