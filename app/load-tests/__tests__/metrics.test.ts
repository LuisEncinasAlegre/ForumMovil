import { createMetrics, percentile, recentErrorRate, recordSample, summarize, timeCall } from '../metrics.ts';

describe('percentile', () => {
  test('sin datos da 0', () => {
    expect(percentile([], 95)).toBe(0);
  });

  test('con un solo valor da ese valor', () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 99)).toBe(42);
  });

  test('rango más cercano sobre 1 a 100', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 99)).toBe(99);
    expect(percentile(values, 100)).toBe(100);
  });
});

describe('summarize', () => {
  test('agrupa por nombre, cuenta resultados y respeta la ventana', () => {
    const metrics = createMetrics();
    recordSample(metrics, { name: 'foro', startedAt: 1000, milliseconds: 100, outcome: 'ok' });
    recordSample(metrics, { name: 'foro', startedAt: 1100, milliseconds: 300, outcome: 'server_error', code: '503' });
    recordSample(metrics, { name: 'hilo', startedAt: 1200, milliseconds: 50, outcome: 'ok' });
    recordSample(metrics, { name: 'foro', startedAt: 5000, milliseconds: 900, outcome: 'ok' });

    const rows = summarize(metrics, 0, 2000);

    expect(rows.map((row) => row.name)).toEqual(['foro', 'hilo']);
    expect(rows[0]).toMatchObject({ count: 2, p50: 100, max: 300, outcomes: { ok: 1, server_error: 1 } });
    expect(rows[1]).toMatchObject({ count: 1, p95: 50 });
  });
});

describe('recentErrorRate', () => {
  test('solo cuenta errores inesperados dentro de la ventana, aunque lleguen desordenados', () => {
    const metrics = createMetrics();
    recordSample(metrics, { name: 'foro', startedAt: 9_000, milliseconds: 10, outcome: 'ok' });
    recordSample(metrics, { name: 'reportar', startedAt: 9_500, milliseconds: 10, outcome: 'expected' });
    // empezó antes de la ventana pero terminó al final: no cuenta
    recordSample(metrics, { name: 'foro', startedAt: 1_000, milliseconds: 9000, outcome: 'timeout' });
    recordSample(metrics, { name: 'foro', startedAt: 9_800, milliseconds: 10, outcome: 'server_error' });
    // quedó en la lista después de una muestra vieja, pero se cuenta igual
    recordSample(metrics, { name: 'hilo', startedAt: 9_900, milliseconds: 10, outcome: 'ok' });

    expect(recentErrorRate(metrics, 5_000, 10_000)).toBe(1 / 4);
  });

  test('sin muestras es 0', () => {
    expect(recentErrorRate(createMetrics(), 1000, 5000)).toBe(0);
  });
});

describe('timeCall', () => {
  test('guarda la respuesta como muestra y la devuelve', async () => {
    const metrics = createMetrics();
    const response = await timeCall(
      metrics,
      'reportar',
      async () => ({ data: null, error: { code: '23505', message: 'duplicate key' }, status: 409 }),
      ['23505'],
    );

    expect(response?.status).toBe(409);
    expect(metrics.samples).toEqual([expect.objectContaining({ name: 'reportar', outcome: 'expected', code: '23505' })]);
  });

  test('una excepción no se escapa: queda como muestra', async () => {
    const metrics = createMetrics();
    const response = await timeCall(metrics, 'foro', async () => {
      throw new TypeError('fetch failed');
    });

    expect(response).toBeNull();
    expect(metrics.samples[0]).toMatchObject({ outcome: 'network_error', code: 'TypeError' });
  });
});
