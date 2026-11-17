import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useModerationNotices } from './useModerationNotices';

// Abre la hoja de aviso cuando el foro está a la vista y hay un aviso sin ver.
// Una sola vez por aviso: si la cierras sin "Entendido", vuelve la próxima vez que abras la app.
// Cuando moderación confirma un ocultado automático, el aviso es el mismo (mismo id) pero ahora
// cuenta como advertencia: por eso la llave incluye counts_as_warning, y se vuelve a mostrar.
// isPaused: otra pantalla (la de suspensión) se abre ahora; el aviso espera al siguiente foco.
export function useShowNoticeOnFocus(isPaused: boolean = false): void {
  const { firstUnseenNotice } = useModerationNotices();
  const shownNoticeKey = useRef<string | null>(null);
  const noticeKey = firstUnseenNotice
    ? `${firstUnseenNotice.id}:${firstUnseenNotice.counts_as_warning ? 'advertencia' : 'automatico'}`
    : null;

  useFocusEffect(
    useCallback(() => {
      if (isPaused || noticeKey === null || shownNoticeKey.current === noticeKey) {
        return;
      }
      shownNoticeKey.current = noticeKey;
      router.push('/aviso');
    }, [isPaused, noticeKey]),
  );
}
