import { formatReplyCount } from '../replyCountLabel';

describe('formatReplyCount', () => {
  test('una respuesta va en singular', () => {
    expect(formatReplyCount(1)).toBe('1 respuesta');
  });

  test('varias van en plural', () => {
    expect(formatReplyCount(14)).toBe('14 respuestas');
  });
});
