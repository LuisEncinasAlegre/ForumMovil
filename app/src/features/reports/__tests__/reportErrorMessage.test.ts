import { getReportErrorMessage } from '../reportErrorMessage';

describe('getReportErrorMessage', () => {
  test('RLS: ya no está', () => {
    expect(getReportErrorMessage({ code: '42501', message: 'row-level security' })).toBe(
      'Esto ya no está, así que no se puede reportar.',
    );
  });

  test('sin conexión', () => {
    expect(getReportErrorMessage({ message: 'TypeError: Network request failed' })).toBe(
      'No hay conexión. Revisa tu red e inténtalo otra vez.',
    );
  });

  test('cualquier otro error', () => {
    expect(getReportErrorMessage({ code: '23514', message: 'check' })).toBe('Algo salió mal. Inténtalo otra vez.');
    expect(getReportErrorMessage('raro')).toBe('Algo salió mal. Inténtalo otra vez.');
  });
});
