import { parseReportTarget } from '../parseReportTarget';

describe('parseReportTarget', () => {
  test('una publicación', () => {
    expect(parseReportTarget({ postId: '7' })).toEqual({ kind: 'post', postId: 7 });
  });

  test('una respuesta', () => {
    expect(parseReportTarget({ commentId: '30' })).toEqual({ kind: 'comment', commentId: 30 });
  });

  test('las dos o ninguna no sirven', () => {
    expect(parseReportTarget({ postId: '7', commentId: '30' })).toBeNull();
    expect(parseReportTarget({})).toBeNull();
  });

  test('solo enteros positivos', () => {
    expect(parseReportTarget({ postId: 'abc' })).toBeNull();
    expect(parseReportTarget({ postId: '0' })).toBeNull();
    expect(parseReportTarget({ postId: '-3' })).toBeNull();
    expect(parseReportTarget({ postId: '1.5' })).toBeNull();
    expect(parseReportTarget({ commentId: '' })).toBeNull();
  });
});
