import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { updateMyColor } from '../api';
import { getColorErrorMessage } from '../colorErrorMessage';
import type { Profile } from '../types';
import { useSession } from '../useSession';
import { useUpdateMyColor } from '../useUpdateMyColor';

jest.mock('../api', () => ({ updateMyColor: jest.fn() }));
jest.mock('../useSession', () => ({ useSession: jest.fn() }));

const profile: Profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: '2026-11-15T00:00:00Z',
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  });
  queryClient.setQueryData(['profile', 'usuario-1'], profile);
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, invalidate, Wrapper };
}

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({
    session: { user: { id: 'usuario-1' } } as Session,
    isLoading: false,
    startSession: jest.fn(),
  });
});

describe('useUpdateMyColor', () => {
  test('el color cambia en caché antes de que responda Supabase', async () => {
    let finishSave: (value: Profile) => void = () => {};
    jest.mocked(updateMyColor).mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
    const { queryClient, invalidate, Wrapper } = setup();
    const { result } = await renderHook(() => useUpdateMyColor(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate('#8aaad2');
    });

    expect(queryClient.getQueryData<Profile>(['profile', 'usuario-1'])?.color).toBe('#8aaad2');
    expect(updateMyColor).toHaveBeenCalledWith('usuario-1', '#8aaad2');

    await act(async () => {
      finishSave({ ...profile, color: '#8aaad2' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['posts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['comments'] });
  });

  test('si falla regresa al color anterior', async () => {
    jest.mocked(updateMyColor).mockRejectedValue(new Error('permission denied'));
    const { queryClient, Wrapper } = setup();
    const { result } = await renderHook(() => useUpdateMyColor(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('#8aaad2').catch(() => {});
    });

    expect(queryClient.getQueryData<Profile>(['profile', 'usuario-1'])?.color).toBeNull();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('getColorErrorMessage', () => {
  test('sin conexión lo dice', () => {
    expect(getColorErrorMessage(new TypeError('Network request failed'))).toBe(
      'No hay conexión. Tu color no cambió.',
    );
  });

  test('cualquier otro error pide intentarlo otra vez', () => {
    expect(getColorErrorMessage({ code: '23514', message: 'check' })).toBe(
      'No pudimos guardar tu color. Inténtalo otra vez.',
    );
    expect(getColorErrorMessage('raro')).toBe('No pudimos guardar tu color. Inténtalo otra vez.');
  });
});
