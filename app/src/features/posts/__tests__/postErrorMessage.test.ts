import { PostNotEditableError } from '../api';
import { getPostErrorMessage } from '../postErrorMessage';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('getPostErrorMessage', () => {
  test('límite por minuto', () => {
    expect(getPostErrorMessage({ code: 'P0001', message: 'demasiadas_publicaciones' })).toMatch(/Vas muy rápido/);
  });

  test('fuera de los límites de largo', () => {
    expect(getPostErrorMessage({ code: '23514', message: 'violates check constraint' })).toMatch(/Revisa el título/);
  });

  test('sin conexión', () => {
    expect(getPostErrorMessage({ code: '', message: 'TypeError: Network request failed' })).toMatch(/No hay conexión/);
  });

  test('publicación que ya no se puede editar', () => {
    expect(getPostErrorMessage(new PostNotEditableError())).toBe('Esta publicación ya no se puede editar.');
  });

  test('cualquier otra cosa', () => {
    expect(getPostErrorMessage({ code: '42501', message: 'permission denied' })).toBe('Algo salió mal. Inténtalo otra vez.');
    expect(getPostErrorMessage('raro')).toBe('Algo salió mal. Inténtalo otra vez.');
  });
});
