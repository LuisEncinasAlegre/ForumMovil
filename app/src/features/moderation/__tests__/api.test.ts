import { supabase } from '@/lib/supabase';

import { countActiveWarnings, fetchMyActiveBan, fetchUnseenNotices, markNoticeSeen, registerDevice } from '../api';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const mockedSupabase = jest.mocked(supabase, { shallow: false });

type QueryResult = { data?: unknown; count?: number | null; error: unknown };

// Cadena falsa de supabase-js: cada método devuelve la cadena y al final se espera con await.
type QueryChain = {
  select: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  order: jest.Mock;
  then: (resolve: (value: QueryResult) => void) => void;
};

function mockQuery(result: QueryResult): QueryChain {
  const chain: QueryChain = {
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    upsert: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  mockedSupabase.from.mockReturnValue(chain as never);
  return chain;
}

describe('fetchUnseenNotices', () => {
  test('pide los avisos sin ver y sin retirar, el más viejo primero', async () => {
    const row = { id: 1, post_id: 7, comment_id: null, category: 'spam', message: 'x', excerpt: 'y' };
    const chain = mockQuery({ data: [row], error: null });

    const notices = await fetchUnseenNotices();

    expect(mockedSupabase.from).toHaveBeenCalledWith('moderation_notices');
    expect(chain.is).toHaveBeenCalledWith('seen_at', null);
    expect(chain.is).toHaveBeenCalledWith('withdrawn_at', null);
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(notices).toEqual([row]);
  });

  test('los errores se lanzan', async () => {
    const error = { code: '42501', message: 'permission denied' };
    mockQuery({ data: null, error });

    await expect(fetchUnseenNotices()).rejects.toBe(error);
  });
});

describe('countActiveWarnings', () => {
  test('cuenta solo las que cuentan y no se retiraron', async () => {
    const chain = mockQuery({ count: 2, error: null });

    expect(await countActiveWarnings()).toBe(2);
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenCalledWith('counts_as_warning', true);
    expect(chain.is).toHaveBeenCalledWith('withdrawn_at', null);
  });
});

describe('markNoticeSeen', () => {
  test('solo cambia seen_at de ese aviso', async () => {
    const chain = mockQuery({ error: null });

    await markNoticeSeen(5);

    expect(chain.update).toHaveBeenCalledWith({ seen_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 5);
  });

  test('los errores se lanzan', async () => {
    const error = { code: 'PGRST301', message: 'sin red' };
    mockQuery({ error });

    await expect(markNoticeSeen(5)).rejects.toBe(error);
  });
});

describe('registerDevice', () => {
  test('registra el teléfono sin fallar si ya estaba', async () => {
    const chain = mockQuery({ error: null });

    await registerDevice({ deviceId: 'abc12345', platform: 'android' });

    expect(mockedSupabase.from).toHaveBeenCalledWith('user_devices');
    expect(chain.upsert).toHaveBeenCalledWith(
      { device_id: 'abc12345', platform: 'android' },
      { ignoreDuplicates: true },
    );
  });

  test('los errores se lanzan', async () => {
    const error = { code: '23514', message: 'check' };
    mockQuery({ error });

    await expect(registerDevice({ deviceId: 'x', platform: 'ios' })).rejects.toBe(error);
  });
});

describe('fetchMyActiveBan', () => {
  test('sin baneo devuelve null', async () => {
    mockedSupabase.rpc.mockResolvedValue({ data: [], error: null } as never);

    expect(await fetchMyActiveBan()).toBeNull();
    expect(mockedSupabase.rpc).toHaveBeenCalledWith('get_my_active_ban');
  });

  test('devuelve el motivo y la fecha de fin, que puede ser null', async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: [{ reason: 'Insultos.', ends_at: null }],
      error: null,
    } as never);

    expect(await fetchMyActiveBan()).toEqual({ reason: 'Insultos.', endsAt: null });
  });

  test('los errores se lanzan', async () => {
    const error = { code: 'PGRST301', message: 'sin red' };
    mockedSupabase.rpc.mockResolvedValue({ data: null, error } as never);

    await expect(fetchMyActiveBan()).rejects.toBe(error);
  });
});
