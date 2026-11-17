import type { Session } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { onSessionChange, startAnonymousSession } from '../api';
import { SessionProvider } from '../SessionProvider';
import { useSession } from '../useSession';

jest.mock('../api', () => ({
  onSessionChange: jest.fn(),
  startAnonymousSession: jest.fn(),
}));

const mockedOnSessionChange = jest.mocked(onSessionChange);
const mockedStartAnonymousSession = jest.mocked(startAnonymousSession);

const savedSession = { access_token: 'guardada', user: { id: 'usuario-1' } } as Session;
const newSession = { access_token: 'nueva', user: { id: 'usuario-2' } } as Session;

function SessionWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Guarda el callback que el provider registra, para simular lo que avisa Supabase.
function captureSessionListener() {
  const listener: { notify: (session: Session | null) => void } = { notify: () => {} };
  const unsubscribe = jest.fn();
  mockedOnSessionChange.mockImplementation((callback) => {
    listener.notify = callback;
    return unsubscribe;
  });
  return { listener, unsubscribe };
}

describe('SessionProvider', () => {
  test('empieza cargando y luego toma la sesión guardada', async () => {
    const { listener } = captureSessionListener();
    const { result } = await renderHook(() => useSession(), { wrapper: SessionWrapper });

    expect(result.current.isLoading).toBe(true);

    await act(async () => listener.notify(savedSession));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBe(savedSession);
  });

  test('sin sesión guardada deja de cargar con session null', async () => {
    const { listener } = captureSessionListener();
    const { result } = await renderHook(() => useSession(), { wrapper: SessionWrapper });

    await act(async () => listener.notify(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
  });

  test('startSession guarda la sesión anónima nueva', async () => {
    const { listener } = captureSessionListener();
    mockedStartAnonymousSession.mockResolvedValue(newSession);
    const { result } = await renderHook(() => useSession(), { wrapper: SessionWrapper });
    await act(async () => listener.notify(null));

    await act(async () => result.current.startSession());

    expect(result.current.session).toBe(newSession);
  });

  test('si falla el inicio de sesión, el error llega a quien llamó', async () => {
    const { listener } = captureSessionListener();
    mockedStartAnonymousSession.mockRejectedValue(new Error('sin conexión'));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionWrapper });
    await act(async () => listener.notify(null));

    await expect(result.current.startSession()).rejects.toThrow('sin conexión');
  });

  test('deja de escuchar a Supabase al desmontarse', async () => {
    const { unsubscribe } = captureSessionListener();
    const { unmount } = await renderHook(() => useSession(), { wrapper: SessionWrapper });

    await unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('useSession', () => {
  test('fuera del provider avisa con un error claro', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useSession())).rejects.toThrow('SessionProvider');
  });
});
