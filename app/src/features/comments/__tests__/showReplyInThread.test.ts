import { QueryClient } from '@tanstack/react-query';

import { COMMENTS_PAGE_SIZE, fetchCommentsPage } from '../api';
import type { ThreadComment } from '../types';
import { showReplyInThread } from '../useCreateComment';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  fetchCommentsPage: jest.fn(),
}));

const mockedFetchPage = jest.mocked(fetchCommentsPage);
const POST_ID = 7;
const QUERY_KEY = ['comments', 'thread', POST_ID];

function makeComments(firstId: number, count: number): ThreadComment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: firstId + index,
    post_id: POST_ID,
    content: 'Texto',
    created_at: '2026-11-16T00:00:00Z',
    edited_at: null,
    author: { id: 'usuario-1', display_name: 'farol-veloz', color: null, restriction: null },
  }));
}

// Un hilo ya cargado con una sola página llena (sin observador, así invalidar no vuelve a pedir).
function makeClientWithFirstPage(): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(QUERY_KEY, { pages: [makeComments(1, COMMENTS_PAGE_SIZE)], pageParams: [null] });
  return queryClient;
}

beforeEach(() => {
  mockedFetchPage.mockReset();
});

describe('showReplyInThread', () => {
  test('si la respuesta ya está cargada, no pide más páginas', async () => {
    const queryClient = makeClientWithFirstPage();

    await showReplyInThread(queryClient, POST_ID, 10);

    expect(mockedFetchPage).not.toHaveBeenCalled();
  });

  test('en un hilo largo sigue cargando páginas hasta que aparece tu respuesta', async () => {
    const queryClient = makeClientWithFirstPage();
    mockedFetchPage
      .mockResolvedValueOnce(makeComments(51, COMMENTS_PAGE_SIZE))
      .mockResolvedValueOnce(makeComments(101, 5));

    await showReplyInThread(queryClient, POST_ID, 104);

    expect(mockedFetchPage).toHaveBeenNthCalledWith(1, POST_ID, 50);
    expect(mockedFetchPage).toHaveBeenNthCalledWith(2, POST_ID, 100);
    const thread = queryClient.getQueryData<{ pages: ThreadComment[][]; pageParams: (number | null)[] }>(QUERY_KEY);
    expect(thread?.pages.flat().map((comment) => comment.id)).toContain(104);
    expect(thread?.pageParams).toEqual([null, 50, 100]);
  });

  test('si se acaban las páginas sin encontrarla (la ocultaron), se detiene', async () => {
    const queryClient = makeClientWithFirstPage();
    mockedFetchPage.mockResolvedValueOnce(makeComments(51, 3));

    await showReplyInThread(queryClient, POST_ID, 999);

    expect(mockedFetchPage).toHaveBeenCalledTimes(1);
  });
});
