import { formatTimeAgo } from '../time';

const now = new Date('2026-11-15T12:00:00Z');

function secondsAgo(seconds: number): string {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

describe('formatTimeAgo', () => {
  test('menos de un minuto es "ahora"', () => {
    expect(formatTimeAgo(secondsAgo(0), now)).toBe('ahora');
    expect(formatTimeAgo(secondsAgo(59), now)).toBe('ahora');
  });

  test('si el reloj del teléfono va atrasado también es "ahora"', () => {
    expect(formatTimeAgo(secondsAgo(-120), now)).toBe('ahora');
  });

  test('minutos', () => {
    expect(formatTimeAgo(secondsAgo(60), now)).toBe('hace 1 min');
    expect(formatTimeAgo(secondsAgo(59 * 60), now)).toBe('hace 59 min');
  });

  test('horas', () => {
    expect(formatTimeAgo(secondsAgo(60 * 60), now)).toBe('hace 1 h');
    expect(formatTimeAgo(secondsAgo(23 * 60 * 60), now)).toBe('hace 23 h');
  });

  test('ayer y días', () => {
    expect(formatTimeAgo(secondsAgo(24 * 60 * 60), now)).toBe('ayer');
    expect(formatTimeAgo(secondsAgo(2 * 24 * 60 * 60), now)).toBe('hace 2 d');
    expect(formatTimeAgo(secondsAgo(6 * 24 * 60 * 60), now)).toBe('hace 6 d');
  });

  test('más de una semana muestra la fecha', () => {
    // a mediodía UTC para que la zona horaria no cambie el día
    expect(formatTimeAgo('2026-11-02T12:00:00Z', now)).toBe('2 nov');
  });
});
