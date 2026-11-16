import { supabase } from '@/lib/supabase';

import { createReport } from '../api';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockedSupabase = jest.mocked(supabase, { shallow: false });

type QueryResult = { data: unknown; error: unknown };

type QueryChain = {
  insert: jest.Mock;
  select: jest.Mock;
};

// insert() devuelve algo que se puede esperar con await, como en supabase-js.
function mockInsertResult(result: QueryResult): QueryChain {
  const chain: QueryChain = {
    insert: jest.fn(() => Promise.resolve(result)),
    select: jest.fn(),
  };
  mockedSupabase.from.mockReturnValue(chain as never);
  return chain;
}

describe('createReport', () => {
  test('reporta una publicación sin pedir la fila de vuelta', async () => {
    const chain = mockInsertResult({ data: null, error: null });

    const result = await createReport({ kind: 'post', postId: 7 }, 'spam');

    expect(mockedSupabase.from).toHaveBeenCalledWith('reports');
    expect(chain.insert).toHaveBeenCalledWith({ post_id: 7, reason: 'spam' });
    expect(chain.select).not.toHaveBeenCalled();
    expect(result).toBe('sent');
  });

  test('reporta una respuesta', async () => {
    const chain = mockInsertResult({ data: null, error: null });

    await createReport({ kind: 'comment', commentId: 30 }, 'acoso');

    expect(chain.insert).toHaveBeenCalledWith({ comment_id: 30, reason: 'acoso' });
  });

  test('si ya lo habías reportado no es un error', async () => {
    mockInsertResult({ data: null, error: { code: '23505', message: 'duplicate key' } });

    expect(await createReport({ kind: 'post', postId: 7 }, 'spam')).toBe('alreadyReported');
  });

  test('los demás errores se lanzan', async () => {
    const error = { code: '42501', message: 'new row violates row-level security policy' };
    mockInsertResult({ data: null, error });

    await expect(createReport({ kind: 'post', postId: 7 }, 'spam')).rejects.toBe(error);
  });
});
