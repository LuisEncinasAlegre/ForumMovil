import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useSession } from '@/features/session/useSession';

import { countMyComments } from './api';

// Bajo ['comments'] para que responder o eliminar una respuesta actualice el número.
export function useMyCommentCount(): UseQueryResult<number> {
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  return useQuery({
    queryKey: ['comments', 'mineCount', userId],
    queryFn: () => countMyComments(userId),
    enabled: userId !== '',
  });
}
