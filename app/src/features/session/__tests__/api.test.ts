import { supabase } from '@/lib/supabase';

import { acceptRules, fetchMyProfile, forgetSession, startAnonymousSession } from '../api';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInAnonymously: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockedSupabase = jest.mocked(supabase, { shallow: false });

// Imita la cadena de supabase.from(...).select(...).eq(...)... y al final devuelve `result`.
type QueryChain = {
  select: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
};

function mockQueryResult(result: { data: unknown; error: unknown }): QueryChain {
  const chain: QueryChain = {
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
  };
  mockedSupabase.from.mockReturnValue(chain as never);
  return chain;
}

const profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: null,
  created_at: '2026-11-15T00:00:00Z',
};

describe('startAnonymousSession', () => {
  test('devuelve la sesión nueva', async () => {
    const session = { access_token: 'token' };
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({ data: { session, user: {} }, error: null } as never);

    await expect(startAnonymousSession()).resolves.toBe(session);
  });

  test('lanza el error de Supabase', async () => {
    const error = new Error('demasiadas solicitudes');
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({ data: { session: null, user: null }, error } as never);

    await expect(startAnonymousSession()).rejects.toThrow('demasiadas solicitudes');
  });
});

describe('fetchMyProfile', () => {
  test('busca el perfil por id', async () => {
    const chain = mockQueryResult({ data: profile, error: null });

    await expect(fetchMyProfile('usuario-1')).resolves.toEqual(profile);
    expect(mockedSupabase.from).toHaveBeenCalledWith('profiles');
    expect(chain.eq).toHaveBeenCalledWith('id', 'usuario-1');
  });

  test('devuelve null si el perfil ya no existe', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(fetchMyProfile('usuario-1')).resolves.toBeNull();
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: new Error('sin conexión') });

    await expect(fetchMyProfile('usuario-1')).rejects.toThrow('sin conexión');
  });
});

describe('acceptRules', () => {
  test('guarda la aceptación y devuelve el perfil actualizado', async () => {
    const accepted = { ...profile, rules_accepted_at: '2026-11-15T01:00:00Z' };
    const chain = mockQueryResult({ data: accepted, error: null });

    await expect(acceptRules('usuario-1')).resolves.toEqual(accepted);
    expect(chain.update).toHaveBeenCalledWith({ rules_accepted_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 'usuario-1');
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: new Error('permiso denegado') });

    await expect(acceptRules('usuario-1')).rejects.toThrow('permiso denegado');
  });
});

describe('forgetSession', () => {
  test('cierra la sesión solo en este teléfono', async () => {
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });

    await forgetSession();

    expect(mockedSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
