import { focusManager, QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    // con mala señal es mejor mostrar el error pronto que esperar tres reintentos
    queries: { retry: 1 },
  },
});

function onAppStateChange(status: AppStateStatus): void {
  focusManager.setFocused(status === 'active');
}

// Al volver a la app, TanStack Query vuelve a pedir los datos viejos (en web ya lo hace solo).
export function useAppStateFocus(): void {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);
}
