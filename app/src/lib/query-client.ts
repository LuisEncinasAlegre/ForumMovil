import { focusManager, MutationCache, QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

// código de Postgres cuando RLS rechaza una escritura
const ROW_SECURITY_ERROR = '42501';

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    // con mala señal es mejor mostrar el error pronto que esperar tres reintentos
    queries: { retry: 1 },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      // si te suspendieron mientras escribías, así la app se entera sin esperar a que vuelvas
      if (hasErrorCode(error, ROW_SECURITY_ERROR)) {
        queryClient.invalidateQueries({ queryKey: ['ban'] });
      }
    },
  }),
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
