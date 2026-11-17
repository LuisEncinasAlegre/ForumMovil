import { COMMENT_MAX_LENGTH, isCommentValid } from '../validation';

describe('isCommentValid', () => {
  test('vacía o solo espacios no vale', () => {
    expect(isCommentValid('')).toBe(false);
    expect(isCommentValid('   \n ')).toBe(false);
  });

  test('hasta el límite vale, uno más no', () => {
    expect(isCommentValid('a'.repeat(COMMENT_MAX_LENGTH))).toBe(true);
    expect(isCommentValid('a'.repeat(COMMENT_MAX_LENGTH + 1))).toBe(false);
  });

  test('un emoji cuenta como un carácter, como en Postgres', () => {
    expect(isCommentValid('🌵'.repeat(COMMENT_MAX_LENGTH))).toBe(true);
  });
});
