import { supabase } from '@/lib/supabase';

import {
  CommentNotEditableError,
  createComment,
  deleteComment,
  fetchComment,
  fetchCommentEdits,
  fetchCommentsPage,
  updateComment,
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
  gt: jest.Mock;
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
    gt: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  mockedSupabase.from.mockReturnValue(chain as never);
  return chain;
}

const comment = {
  id: 3,
  post_id: 7,
  content: 'Siguen, a las 4.',
  created_at: '2026-11-16T00:00:00Z',
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null },
};

const databaseError = { code: '42501', message: 'permission denied' };

describe('fetchCommentsPage', () => {
  test('la primera página no lleva cursor, trae solo visibles sin borrar y de la más vieja a la más nueva', async () => {
    const chain = mockQueryResult({ data: [comment], error: null });

    await expect(fetchCommentsPage(7, null)).resolves.toEqual([comment]);
    expect(mockedSupabase.from).toHaveBeenCalledWith('comments');
    expect(chain.gt).not.toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('post_id', 7);
    expect(chain.eq).toHaveBeenCalledWith('status', 'visible');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  test('las siguientes páginas siguen después del último id', async () => {
    const chain = mockQueryResult({ data: [], error: null });

    await fetchCommentsPage(7, 42);
    expect(chain.gt).toHaveBeenCalledWith('id', 42);
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: databaseError });

    await expect(fetchCommentsPage(7, null)).rejects.toBe(databaseError);
  });
});

describe('fetchComment', () => {
  test('null si ya no se puede ver', async () => {
    const chain = mockQueryResult({ data: null, error: null });

    await expect(fetchComment(3)).resolves.toBeNull();
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });
});

describe('createComment', () => {
  test('manda solo la publicación y el texto, sin espacios de las orillas', async () => {
    const chain = mockQueryResult({ data: comment, error: null });

    await expect(createComment(7, '  Siguen, a las 4.\n')).resolves.toBe(comment);
    expect(chain.insert).toHaveBeenCalledWith({ post_id: 7, content: 'Siguen, a las 4.' });
  });

  test('lanza el error de Supabase', async () => {
    mockQueryResult({ data: null, error: databaseError });

    await expect(createComment(7, 'Hola')).rejects.toBe(databaseError);
  });
});

describe('updateComment', () => {
  test('manda solo el texto de esa respuesta', async () => {
    const chain = mockQueryResult({ data: comment, error: null });

    await updateComment(3, 'Otro texto ');
    expect(chain.update).toHaveBeenCalledWith({ content: 'Otro texto' });
    expect(chain.eq).toHaveBeenCalledWith('id', 3);
  });

  test('si no encontró la fila (borrada, oculta o ajena) avisa que ya no se puede editar', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(updateComment(3, 'Otro')).rejects.toBeInstanceOf(CommentNotEditableError);
  });
});

describe('deleteComment', () => {
  test('es un borrado suave: solo manda deleted_at', async () => {
    const chain = mockQueryResult({ data: { id: 3 }, error: null });

    await deleteComment(3);
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 3);
  });

  test('si no encontró la fila avisa', async () => {
    mockQueryResult({ data: null, error: null });

    await expect(deleteComment(3)).rejects.toBeInstanceOf(CommentNotEditableError);
  });
});

describe('fetchCommentEdits', () => {
  test('trae las versiones de la más nueva a la más vieja', async () => {
    const edits = [{ id: 2, content: 'antes', written_at: '2026-11-16T00:00:00Z' }];
    const chain = mockQueryResult({ data: edits, error: null });

    await expect(fetchCommentEdits(3)).resolves.toBe(edits);
    expect(chain.eq).toHaveBeenCalledWith('comment_id', 3);
    expect(chain.order).toHaveBeenCalledWith('id', { ascending: false });
  });
});
