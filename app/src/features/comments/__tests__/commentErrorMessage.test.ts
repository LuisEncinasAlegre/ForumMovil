import { CommentNotEditableError } from '../api';
import { getCommentErrorMessage } from '../commentErrorMessage';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('getCommentErrorMessage', () => {
  test('límite por minuto', () => {
    expect(getCommentErrorMessage({ code: 'P0001', message: 'demasiadas_respuestas' })).toBe(
      'Vas muy rápido. Espera un minuto antes de responder otra vez.',
    );
  });

  test('la publicación ya no acepta respuestas', () => {
    expect(getCommentErrorMessage({ code: '42501', message: 'new row violates row-level security policy' })).toBe(
      'Esta publicación ya no acepta respuestas.',
    );
  });

  test('fuera de los límites', () => {
    expect(getCommentErrorMessage({ code: '23514', message: 'check' })).toBe('Tu respuesta está fuera de los límites.');
  });

  test('la respuesta ya no se puede editar', () => {
    expect(getCommentErrorMessage(new CommentNotEditableError())).toBe('Esta respuesta ya no se puede editar.');
  });

  test('sin conexión', () => {
    expect(getCommentErrorMessage(new TypeError('Network request failed'))).toBe(
      'No hay conexión. Revisa tu red e inténtalo otra vez.',
    );
  });

  test('cualquier otra cosa', () => {
    expect(getCommentErrorMessage('raro')).toBe('Algo salió mal. Inténtalo otra vez.');
  });
});
