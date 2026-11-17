import { banEndLabel, banTitle } from '../banText';

describe('banEndLabel', () => {
  // fechas locales: la etiqueta usa la hora del teléfono
  const now = new Date(2026, 10, 16, 9, 0);

  test('sin fecha de fin es un baneo', () => {
    expect(banEndLabel(null, now)).toBe('Sin fecha de fin');
  });

  test('día, mes y hora con dos dígitos', () => {
    expect(banEndLabel(new Date(2026, 10, 20, 14, 5).toISOString(), now)).toBe('20 de noviembre, 14:05');
  });

  test('si termina otro año, lo dice', () => {
    expect(banEndLabel(new Date(2027, 0, 3, 8, 30).toISOString(), now)).toBe('3 de enero de 2027, 08:30');
  });
});

describe('banTitle', () => {
  test('con fecha de fin es una suspensión; sin fecha, un baneo', () => {
    expect(banTitle({ reason: 'x', endsAt: '2026-11-20T14:30:00Z' })).toBe('Tu cuenta está suspendida');
    expect(banTitle({ reason: 'x', endsAt: null })).toBe('Tu cuenta está baneada');
  });
});
