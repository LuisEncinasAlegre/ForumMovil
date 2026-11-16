import type { Session } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react-native';
import { StrictMode, type ReactNode } from 'react';

import { useAcceptRules } from '../useAcceptRules';
import { useMyProfile } from '../useMyProfile';
import { useSession } from '../useSession';
import { useWelcome } from '../useWelcome';

jest.mock('../useSession', () => ({ useSession: jest.fn() }));
jest.mock('../useMyProfile', () => ({ useMyProfile: jest.fn() }));
jest.mock('../useAcceptRules', () => ({ useAcceptRules: jest.fn() }));

const mockedUseSession = jest.mocked(useSession);
const mockedUseMyProfile = jest.mocked(useMyProfile);
const mockedUseAcceptRules = jest.mocked(useAcceptRules);

function StrictWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function mockHooks(session: Session | null, startSession: () => Promise<void>, isLoading = false) {
  mockedUseSession.mockReturnValue({ session, isLoading, startSession });
  mockedUseMyProfile.mockReturnValue({ data: undefined, error: null, refetch: jest.fn() } as never);
  mockedUseAcceptRules.mockReturnValue({ mutate: jest.fn(), isPending: false, error: null } as never);
}

describe('useWelcome', () => {
  test('sin sesión crea una sola sesión anónima, aunque React corra el efecto dos veces', async () => {
    const startSession = jest.fn(() => new Promise<void>(() => {})); // se queda pendiente
    mockHooks(null, startSession);

    await renderHook(() => useWelcome(), { wrapper: StrictWrapper });

    expect(startSession).toHaveBeenCalledTimes(1);
  });

  test('mientras lee la sesión guardada no crea una nueva', async () => {
    const startSession = jest.fn(async () => {});
    mockHooks(null, startSession, true);

    await renderHook(() => useWelcome());

    expect(startSession).not.toHaveBeenCalled();
  });

  test('con sesión no crea otra', async () => {
    const startSession = jest.fn(async () => {});
    mockHooks({ user: { id: 'usuario-1' } } as Session, startSession);

    await renderHook(() => useWelcome());

    expect(startSession).not.toHaveBeenCalled();
  });

  test('si falla, expone el error y no reintenta solo', async () => {
    const startSession = jest.fn(async () => {
      throw new Error('sin conexión');
    });
    mockHooks(null, startSession);

    const { result } = await renderHook(() => useWelcome());

    expect(result.current.aliasError?.message).toBe('sin conexión');
    expect(startSession).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retryAlias());

    expect(startSession).toHaveBeenCalledTimes(2);
  });
});
