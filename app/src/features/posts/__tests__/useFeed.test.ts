import { FEED_PAGE_SIZE } from '../api';
import type { FeedPost } from '../types';
import { getNextFeedCursor } from '../useFeed';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function makePosts(count: number): FeedPost[] {
  return Array.from({ length: count }, (_, index) => ({
    id: 100 - index,
    title: 'Título',
    content: 'Texto',
    status: 'visible',
    created_at: '2026-11-15T00:00:00Z',
    edited_at: null,
    author: { id: 'usuario-1', display_name: 'farol-veloz', color: null },
    replyCount: 0,
  }));
}

describe('getNextFeedCursor', () => {
  test('página completa: sigue desde el id de la última', () => {
    const page = makePosts(FEED_PAGE_SIZE);
    expect(getNextFeedCursor(page)).toBe(page[page.length - 1].id);
  });

  test('página incompleta: ya no hay más', () => {
    expect(getNextFeedCursor(makePosts(3))).toBeUndefined();
    expect(getNextFeedCursor([])).toBeUndefined();
  });
});
