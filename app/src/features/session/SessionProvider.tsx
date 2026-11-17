import type { Session } from '@supabase/supabase-js';
import { createContext, useEffect, useState, type ReactNode } from 'react';

import { onSessionChange, startAnonymousSession } from './api';

export type SessionContextValue = {
  session: Session | null;
  // true hasta saber si hay una sesión guardada en el teléfono
  isLoading: boolean;
  startSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSessionChange((newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function startSession(): Promise<void> {
    const newSession = await startAnonymousSession();
    setSession(newSession);
  }

  return (
    <SessionContext.Provider value={{ session, isLoading, startSession }}>{children}</SessionContext.Provider>
  );
}
