import { supabase } from '@/lib/supabase';

import {
  createPost,
  deletePost,
  fetchFeedPage,
  fetchPost,
  fetchPostEdits,
  PostNotEditableError,
  updatePost,
} from '../api';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockedSupabase = jest.mocked(supabase, { shallow: false });

type QueryResult = { data: unknown; error: unknown };

type QueryChain = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  lt: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: (resolve: (value: QueryResult) => void) => void;
};

// Imita la cadena de supabase.from(...).select(...).eq(...)...; al hacer await devuelve `result`.
function mockQueryResult(result: QueryResult): QueryChain {
  const chain: QueryChain = {
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    lt: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  mockedSupabase.from.mockReturnValue(chain as never);
  return chain;
}

const post = {
  id: 7,
  title: 'Título',
  content: 'Texto',
  created_at: '2026-11-15T00:00:00Z',
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null },
};

const databaseError = { code: '42501', message: 'permission denied' };

describe('fetchFeedPage', () => {
  test('la primera página no lleva cursor y solo trae visibles sin borrar', async () => {
    const chain = mockQueryResult({ data: [post], error: null });

    await expect(fetchFeedPage(null)).resolves.toEqual([post]);
    expect(chain.lt).not.toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('status', 'visible');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  test('las siguientes páginas siguen desde el último id', async () => {
    const chain = mockQueryResult({ data: [], error: null });

    await fetchFeedPage(42);
    expect(chain.lt).toHaveBeenCalledWith('id', 42);
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: databaseError });

    await expect(fetchFeedPage(null)).rejects.toBe(databaseError);
  });
});

describe('fetchPost', () => {
  test('null si ya no se puede ver', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(fetchPost(7)).resolves.toBeNull();
  });
});

describe('createPost', () => {
  test('manda solo título y texto, sin espacios de las orillas', async () => {
    const chain = mockQueryResult({ data: post, error: null });

    await expect(createPost({ title: '  Título ', content: ' Texto\n' })).resolves.toBe(post);
    expect(chain.insert).toHaveBeenCalledWith({ title: 'Título', content: 'Texto' });
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: databaseError });

    await expect(createPost({ title: 'Título', content: 'Texto' })).rejects.toBe(databaseError);
  });
});

describe('updatePost', () => {
  test('manda solo título y texto de esa publicación', async () => {
    const chain = mockQueryResult({ data: post, error: null });

    await updatePost(7, { title: 'Nuevo ', content: 'Otro' });
    expect(chain.update).toHaveBeenCalledWith({ title: 'Nuevo', content: 'Otro' });
    expect(chain.eq).toHaveBeenCalledWith('id', 7);
  });

  test('si no encontró la fila (borrada, oculta o ajena) avisa que ya no se puede editar', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(updatePost(7, { title: 'Nuevo', content: 'Otro' })).rejects.toBeInstanceOf(PostNotEditableError);
  });
});

describe('deletePost', () => {
  test('es un borrado suave: solo manda deleted_at', async () => {
    const chain = mockQueryResult({ data: { id: 7 }, error: null });

    await deletePost(7);
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 7);
  });

  test('si no encontró la fila avisa', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(deletePost(7)).rejects.toBeInstanceOf(PostNotEditableError);
  });
});

describe('fetchPostEdits', () => {
  test('trae las versiones de la más nueva a la más vieja', async () => {
    const edits = [{ id: 2, title: 'B', content: 'b', written_at: '2026-11-15T00:00:00Z' }];
    const chain = mockQueryResult({ data: edits, error: null });

    await expect(fetchPostEdits(7)).resolves.toBe(edits);
    expect(chain.eq).toHaveBeenCalledWith('post_id', 7);
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: false });
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: databaseError });

    await expect(fetchPostEdits(7)).rejects.toBe(databaseError);
  });
});
