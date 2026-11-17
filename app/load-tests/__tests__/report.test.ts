import type { ActionSummary } from '../metrics.ts';
import { checkThresholds } from '../report.ts';

function summary(name: string, p95: number, outcomes: ActionSummary['outcomes']): ActionSummary {
  let count = 0;
  for (const value of Object.values(outcomes)) {
    count += value ?? 0;
  }
  return { name, count, p50: p95 / 2, p95, p99: p95, max: p95, outcomes, errorCodes: {} };
}

describe('checkThresholds', () => {
  const baseline = [summary('foro', 200, { ok: 30 }), summary('hilo:respuestas', 150, { ok: 10 })];

  test('pasa si las lecturas no pasan de 3× la línea base y no hay errores', () => {
    const run = [summary('foro', 590, { ok: 500 }), summary('publicar', 2000, { ok: 20 })];

    expect(checkThresholds(run, baseline)).toEqual([]);
  });

  test('falla por lectura lenta, por 5xx y por más de 1 % de errores', () => {
    const run = [
      summary('foro', 700, { ok: 90, server_error: 2 }),
      summary('hilo:respuestas', 100, { ok: 8 }),
    ];

    expect(checkThresholds(run, baseline)).toEqual([
      'foro: 2 errores 5xx',
      'foro: p95 700 ms es más de 3× la línea base (200 ms)',
      'errores inesperados: 2.0 % (máximo 1 %)',
    ]);
  });

  test('sin línea base solo revisa errores', () => {
    const run = [summary('foro', 9000, { ok: 100, expected: 5 })];

    expect(checkThresholds(run, null)).toEqual([]);
  });

  test('los límites de nuestros triggers cuentan como error inesperado', () => {
    const run = [summary('publicar', 100, { ok: 90, rate_limited: 10 })];

    expect(checkThresholds(run, null)).toEqual(['errores inesperados: 10.0 % (máximo 1 %)']);
  });
});
