import { use } from 'react';

import { SessionContext, type SessionContextValue } from './SessionProvider';

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession tiene que usarse dentro de <SessionProvider>.');
  }
  return value;
}
