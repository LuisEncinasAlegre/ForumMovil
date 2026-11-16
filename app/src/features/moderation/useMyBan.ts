import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/session/useSession';

import { fetchMyActiveBan } from './api';
import type { ActiveBan } from './types';

type MyBanResult = {
  ban: ActiveBan | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

// Tu suspensión o baneo vigente. Se vuelve a pedir al volver a la app (useAppStateFocus) y cuando
// una escritura falla por permisos (query-client.ts).
export function useMyBan(): MyBanResult {
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  const banQuery = useQuery({
    queryKey: ['ban', userId],
    queryFn: fetchMyActiveBan,
    enabled: userId !== '',
  });

  return {
    ban: banQuery.data ?? null,
    isPending: banQuery.isPending,
    isError: banQuery.isError,
    refetch: () => {
      banQuery.refetch();
    },
  };
}
