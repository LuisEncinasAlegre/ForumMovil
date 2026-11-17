// Guarda cuánto tardó cada llamada y calcula percentiles. El promedio esconde a los lentos,
// por eso el reporte usa p50/p95/p99.
import { classifyResponse, errorCode, UNEXPECTED_OUTCOMES, type Outcome, type ResponseError } from './errors.ts';

export type Sample = {
  name: string;
  startedAt: number; // Date.now() al empezar
  milliseconds: number;
  outcome: Outcome;
  code?: string;
};

export type Metrics = {
  samples: Sample[];
};

export type ActionSummary = {
  name: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  outcomes: Partial<Record<Outcome, number>>;
  // cuántas veces salió cada código de error (42501, 503, …), para saber qué buscar
  errorCodes: Record<string, number>;
};

type TimedResponse = {
  error: ResponseError | null;
  status?: number;
};

export function createMetrics(): Metrics {
  return { samples: [] };
}

export function recordSample(metrics: Metrics, sample: Sample): void {
  metrics.samples.push(sample);
}

// Mide una llamada de supabase-js. Nunca lanza: un error (o una excepción) se vuelve una muestra.
// Devuelve la respuesta para quien necesite los datos, o null si la llamada lanzó.
export async function timeCall<T extends TimedResponse>(
  metrics: Metrics,
  name: string,
  call: () => PromiseLike<T>,
  expectedCodes: string[] = [],
): Promise<T | null> {
  const startedAt = Date.now();
  const start = performance.now();
  try {
    const response = await call();
    recordSample(metrics, {
      name,
      startedAt,
      milliseconds: performance.now() - start,
      outcome: classifyResponse(response.error, response.status, expectedCodes),
      code: errorCode(response.error, response.status),
    });
    return response;
  } catch (thrown) {
    const error: ResponseError =
      thrown instanceof Error ? { name: thrown.name, message: `${thrown.name}: ${thrown.message}` } : { message: String(thrown) };
    recordSample(metrics, {
      name,
      startedAt,
      milliseconds: performance.now() - start,
      outcome: classifyResponse(error, undefined, expectedCodes),
      code: error.name,
    });
    return null;
  }
}

// Percentil por rango más cercano sobre una lista ya ordenada. 0 si no hay datos.
export function percentile(sortedMilliseconds: number[], p: number): number {
  if (sortedMilliseconds.length === 0) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedMilliseconds.length);
  const index = Math.min(Math.max(rank - 1, 0), sortedMilliseconds.length - 1);
  return sortedMilliseconds[index];
}

// Una fila por nombre de llamada, solo con las muestras que empezaron dentro de [fromMs, toMs).
export function summarize(metrics: Metrics, fromMs: number = 0, toMs: number = Infinity): ActionSummary[] {
  const samplesByName = new Map<string, Sample[]>();
  for (const sample of metrics.samples) {
    if (sample.startedAt < fromMs || sample.startedAt >= toMs) {
      continue;
    }
    const list = samplesByName.get(sample.name) ?? [];
    list.push(sample);
    samplesByName.set(sample.name, list);
  }

  const summaries: ActionSummary[] = [];
  for (const [name, samples] of samplesByName) {
    const sorted = samples.map((sample) => sample.milliseconds).sort((a, b) => a - b);
    const outcomes: Partial<Record<Outcome, number>> = {};
    const errorCodes: Record<string, number> = {};
    for (const sample of samples) {
      outcomes[sample.outcome] = (outcomes[sample.outcome] ?? 0) + 1;
      if (sample.code) {
        errorCodes[sample.code] = (errorCodes[sample.code] ?? 0) + 1;
      }
    }
    summaries.push({
      name,
      count: samples.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted[sorted.length - 1],
      outcomes,
      errorCodes,
    });
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

export function countUnexpected(summary: ActionSummary): number {
  let total = 0;
  for (const outcome of UNEXPECTED_OUTCOMES) {
    total += summary.outcomes[outcome] ?? 0;
  }
  return total;
}

// Parte de las muestras de los últimos windowMs que salieron con un error inesperado (0 a 1).
export function recentErrorRate(metrics: Metrics, windowMs: number, now: number): number {
  let total = 0;
  let unexpected = 0;
  // se recorren todas: se guardan al terminar, así que una lenta que empezó antes puede quedar al final
  for (const sample of metrics.samples) {
    if (sample.startedAt < now - windowMs || sample.startedAt > now) {
      continue;
    }
    total += 1;
    if (UNEXPECTED_OUTCOMES.includes(sample.outcome)) {
      unexpected += 1;
    }
  }
  return total === 0 ? 0 : unexpected / total;
}
