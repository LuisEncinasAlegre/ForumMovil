import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useSession } from '@/features/session/useSession';

import { countMyPosts } from './api';

export function useMyPostCount(): UseQueryResult<number> {
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  return useQuery({
    queryKey: ['posts', 'mineCount', userId],
    queryFn: () => countMyPosts(userId),
    enabled: userId !== '',
  });
}
