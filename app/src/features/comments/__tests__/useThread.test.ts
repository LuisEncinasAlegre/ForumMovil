import { COMMENTS_PAGE_SIZE } from '../api';
import type { ThreadComment } from '../types';
import { getNextCommentsCursor } from '../useThread';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function makeComments(count: number): ThreadComment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    post_id: 7,
    content: 'Texto',
    created_at: '2026-11-16T00:00:00Z',
    edited_at: null,
    author: { id: 'usuario-1', display_name: 'farol-veloz', color: null, restriction: null },
  }));
}

describe('getNextCommentsCursor', () => {
  test('página completa: sigue después del id de la última', () => {
    expect(getNextCommentsCursor(makeComments(COMMENTS_PAGE_SIZE))).toBe(COMMENTS_PAGE_SIZE);
  });

  test('página incompleta: ya no hay más', () => {
    expect(getNextCommentsCursor(makeComments(3))).toBeUndefined();
  });
});
