import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useMyBan } from './useMyBan';

// Abre la pantalla de suspensión cuando el foro está a la vista, una vez por baneo.
// Devuelve true mientras falta abrirla: así el aviso de moderación espera a la siguiente vez.
export function useShowBanOnFocus(): boolean {
  const { ban } = useMyBan();
  const [shownBanKey, setShownBanKey] = useState<string | null>(null);
  const banKey = ban ? `${ban.reason}|${ban.endsAt}` : null;

  useFocusEffect(
    useCallback(() => {
      if (banKey === null || shownBanKey === banKey) {
        return;
      }
      setShownBanKey(banKey);
      router.push('/suspendida');
    }, [banKey, shownBanKey]),
  );

  return banKey !== null && shownBanKey !== banKey;
}
