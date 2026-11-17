import { useEffect, useRef, useState } from 'react';

import type { Profile } from './types';
import { useAcceptRules } from './useAcceptRules';
import { useMyProfile } from './useMyProfile';
import { useSession } from './useSession';

export type WelcomeState = {
  profile: Profile | null;
  aliasError: Error | null;
  retryAlias: () => void;
  enterForum: () => void;
  isEntering: boolean;
  enterError: Error | null;
};

// La bienvenida muestra el alias antes de "Entrar al foro", así que la sesión anónima
// se crea al abrir la pantalla y el botón solo guarda que aceptó las reglas.
export function useWelcome(): WelcomeState {
  const { session, isLoading, startSession } = useSession();
  const profileQuery = useMyProfile();
  const acceptRulesMutation = useAcceptRules();
  const [startError, setStartError] = useState<Error | null>(null);
  // ref y no estado: en desarrollo React corre el efecto dos veces y no queremos dos usuarios
  const isStartingRef = useRef(false);

  // Sin sesión (y sin un error pendiente) se crea una. Si falla, espera a que toquen "Reintentar".
  // Antes hay que esperar a leer la sesión guardada, si no crearíamos un usuario nuevo en cada arranque.
  useEffect(() => {
    if (isLoading || session || startError || isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;
    startSession()
      .catch((error: unknown) => {
        setStartError(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        isStartingRef.current = false;
      });
  });

  function retryAlias(): void {
    if (!session) {
      // al limpiar el error, el efecto de arriba vuelve a intentar
      setStartError(null);
      return;
    }
    profileQuery.refetch();
  }

  return {
    profile: profileQuery.data ?? null,
    aliasError: startError ?? profileQuery.error,
    retryAlias,
    enterForum: () => acceptRulesMutation.mutate(),
    isEntering: acceptRulesMutation.isPending,
    enterError: acceptRulesMutation.error,
  };
}
