import { runStages } from '../scheduler.ts';

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('runStages', () => {
  test('arranca a su hora aunque las vueltas anteriores no hayan terminado', async () => {
    const pending: Deferred[] = [];
    const run = runStages(
      [{ iterationsPerSecond: 2, seconds: 3 }],
      () => {
        const next = deferred();
        pending.push(next);
        return next.promise;
      },
      { maxInFlight: 100, shouldStop: () => false },
    );

    await jest.advanceTimersByTimeAsync(3_000);
    // las 6 arrancaron y ninguna ha terminado: modelo abierto
    expect(pending).toHaveLength(6);

    for (const item of pending) {
      item.resolve();
    }
    const stats = await run;
    expect(stats).toMatchObject({ started: 6, skippedBecauseFull: 0, stoppedEarly: false });
    expect(stats.windows).toHaveLength(1);
  });

  test('cuenta como saltadas las que no caben en maxInFlight', async () => {
    const pending: Deferred[] = [];
    const run = runStages(
      [{ iterationsPerSecond: 5, seconds: 1 }],
      () => {
        const next = deferred();
        pending.push(next);
        return next.promise;
      },
      { maxInFlight: 2, shouldStop: () => false },
    );

    await jest.advanceTimersByTimeAsync(1_000);
    for (const item of pending) {
      item.resolve();
    }
    const stats = await run;

    expect(stats.started).toBe(2);
    expect(stats.skippedBecauseFull).toBe(3);
  });

  test('pasa por cada etapa y para cuando shouldStop dice que sí', async () => {
    let calls = 0;
    const run = runStages(
      [
        { iterationsPerSecond: 1, seconds: 2 },
        { iterationsPerSecond: 4, seconds: 10 },
      ],
      async () => {
        calls += 1;
      },
      { maxInFlight: 10, shouldStop: () => calls >= 5 },
    );

    await jest.advanceTimersByTimeAsync(20_000);
    const stats = await run;

    expect(stats.started).toBe(5);
    expect(stats.stoppedEarly).toBe(true);
    expect(stats.windows).toHaveLength(2);
  });

  test('una vuelta que lanza no detiene la carga', async () => {
    const run = runStages(
      [{ iterationsPerSecond: 2, seconds: 1 }],
      async () => {
        throw new Error('falló');
      },
      { maxInFlight: 10, shouldStop: () => false },
    );

    await jest.advanceTimersByTimeAsync(1_000);
    const stats = await run;

    expect(stats).toMatchObject({ started: 2, crashedIterations: 2 });
  });
});
