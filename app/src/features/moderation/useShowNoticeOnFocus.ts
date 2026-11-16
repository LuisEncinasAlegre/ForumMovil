import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useModerationNotices } from './useModerationNotices';

// Abre la hoja de aviso cuando el foro está a la vista y hay un aviso sin ver.
// Una sola vez por aviso: si la cierras sin "Entendido", vuelve la próxima vez que abras la app.
export function useShowNoticeOnFocus(): void {
  const { firstUnseenNotice } = useModerationNotices();
  const shownNoticeId = useRef<number | null>(null);
  const noticeId = firstUnseenNotice?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      if (noticeId === null || shownNoticeId.current === noticeId) {
        return;
      }
      shownNoticeId.current = noticeId;
      router.push('/aviso');
    }, [noticeId]),
  );
}
