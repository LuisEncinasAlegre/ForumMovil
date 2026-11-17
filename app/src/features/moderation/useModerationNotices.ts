import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/session/useSession';

import { countActiveWarnings, fetchUnseenNotices } from './api';
import type { ModerationNotice } from './types';

type ModerationNoticesResult = {
  firstUnseenNotice: ModerationNotice | null;
  warningCount: number | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

// Se vuelve a pedir al volver a la app (useAppStateFocus), así el aviso llega sin reiniciar.
export function useModerationNotices(): ModerationNoticesResult {
  const { session } = useSession();
  const userId = session?.user.id ?? '';

  const noticesQuery = useQuery({
    queryKey: ['notices', 'unseen', userId],
    queryFn: fetchUnseenNotices,
    enabled: userId !== '',
  });
  const warningsQuery = useQuery({
    queryKey: ['notices', 'warningCount', userId],
    queryFn: countActiveWarnings,
    enabled: userId !== '',
  });

  return {
    firstUnseenNotice: noticesQuery.data?.[0] ?? null,
    warningCount: warningsQuery.data ?? null,
    isPending: noticesQuery.isPending,
    isError: noticesQuery.isError,
    refetch: () => {
      noticesQuery.refetch();
      warningsQuery.refetch();
    },
  };
}
