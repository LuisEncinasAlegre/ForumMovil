import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useModerationNotices } from './useModerationNotices';

// Abre la hoja de aviso cuando el foro está a la vista y hay un aviso sin ver.
// Una sola vez por aviso: si la cierras sin "Entendido", vuelve la próxima vez que abras la app.
// isPaused: otra pantalla (la de suspensión) se abre ahora; el aviso espera al siguiente foco.
export function useShowNoticeOnFocus(isPaused: boolean = false): void {
  const { firstUnseenNotice } = useModerationNotices();
  const shownNoticeId = useRef<number | null>(null);
  const noticeId = firstUnseenNotice?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      if (isPaused || noticeId === null || shownNoticeId.current === noticeId) {
        return;
      }
      shownNoticeId.current = noticeId;
      router.push('/aviso');
    }, [isPaused, noticeId]),
  );
}
