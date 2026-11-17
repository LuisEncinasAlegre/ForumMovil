// Reloj de carga con "modelo abierto": cada vuelta empieza a su hora, aunque las anteriores no
// hayan terminado. Si esperáramos a que terminen, un servidor lento recibiría menos carga y se
// vería más rápido de lo que es (lo que en pruebas de carga se llama coordinated omission).

export type Stage = {
  iterationsPerSecond: number;
  seconds: number;
};

export type StageWindow = {
  stage: Stage;
  startedAt: number;
  endedAt: number;
};

export type RunStats = {
  started: number;
  skippedBecauseFull: number; // demasiadas vueltas abiertas: la laptop o el servidor ya no dan
  crashedIterations: number; // una vuelta lanzó una excepción (las acciones no deberían)
  stoppedEarly: boolean;
  maxStartDelayMs: number; // cuánto tarde arrancó la vuelta más atrasada; > 100 ms = la laptop no da
  windows: StageWindow[];
};

export type SchedulerOptions = {
  maxInFlight: number;
  shouldStop: () => boolean;
};

function sleepUntil(time: number): Promise<void> {
  const wait = Math.max(0, time - Date.now());
  return new Promise((resolve) => setTimeout(resolve, wait));
}

export async function runStages(
  stages: Stage[],
  startIteration: () => Promise<void>,
  options: SchedulerOptions,
): Promise<RunStats> {
  const stats: RunStats = {
    started: 0,
    skippedBecauseFull: 0,
    crashedIterations: 0,
    stoppedEarly: false,
    maxStartDelayMs: 0,
    windows: [],
  };
  const inFlight = new Set<Promise<void>>();

  for (const stage of stages) {
    const stageStart = Date.now();
    const total = Math.round(stage.iterationsPerSecond * stage.seconds);
    const intervalMs = 1000 / stage.iterationsPerSecond;

    for (let index = 0; index < total; index += 1) {
      // hora fija desde el inicio de la etapa, no "intervalo después de la anterior": no se acumula atraso
      const scheduledAt = stageStart + index * intervalMs;
      await sleepUntil(scheduledAt);
      if (options.shouldStop()) {
        stats.stoppedEarly = true;
        break;
      }
      stats.maxStartDelayMs = Math.max(stats.maxStartDelayMs, Date.now() - scheduledAt);
      if (inFlight.size >= options.maxInFlight) {
        stats.skippedBecauseFull += 1;
        continue;
      }
      stats.started += 1;
      const iteration = startIteration()
        .catch(() => {
          stats.crashedIterations += 1;
        })
        .finally(() => {
          inFlight.delete(iteration);
        });
      inFlight.add(iteration);
    }

    stats.windows.push({ stage, startedAt: stageStart, endedAt: Date.now() });
    if (stats.stoppedEarly) {
      break;
    }
  }

  // las últimas vueltas terminan antes de devolver los números
  await Promise.all(inFlight);
  return stats;
}
