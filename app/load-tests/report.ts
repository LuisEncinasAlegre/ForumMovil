// Imprime la tabla de resultados, la compara con la última corrida "humo" y la guarda en JSON.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { countUnexpected, type ActionSummary } from './metrics.ts';
import type { RunStats, Stage } from './scheduler.ts';

const RESULTS_DIR = 'load-tests/results';
// Las lecturas pueden tardar hasta 3 veces lo de la línea base (la mayor parte es la red).
const MAX_P95_RATIO = 3;
const MAX_UNEXPECTED_RATE = 0.01;
const READ_CALLS = ['foro', 'hilo:publicacion', 'hilo:respuestas'];

export type StageResult = {
  stage: Stage;
  summaries: ActionSummary[];
};

export type RunResult = {
  profile: string;
  finishedAt: string;
  stats: Omit<RunStats, 'windows'>;
  stages: StageResult[];
};

export function printStage(title: string, summaries: ActionSummary[]): void {
  console.log(`\n${title}`);
  console.table(
    summaries.map((summary) => ({
      llamada: summary.name,
      veces: summary.count,
      p50_ms: Math.round(summary.p50),
      p95_ms: Math.round(summary.p95),
      p99_ms: Math.round(summary.p99),
      max_ms: Math.round(summary.max),
      errores: countUnexpected(summary),
      detalle: JSON.stringify(summary.outcomes),
      codigos: Object.keys(summary.errorCodes).length === 0 ? '' : JSON.stringify(summary.errorCodes),
    })),
  );
}

// Una línea por cada cosa que no cumple. Lista vacía = pasa.
export function checkThresholds(summaries: ActionSummary[], baseline: ActionSummary[] | null): string[] {
  const failures: string[] = [];
  let total = 0;
  let unexpected = 0;
  for (const summary of summaries) {
    total += summary.count;
    unexpected += countUnexpected(summary);
    const serverErrors = summary.outcomes.server_error ?? 0;
    if (serverErrors > 0) {
      failures.push(`${summary.name}: ${serverErrors} errores 5xx`);
    }
    const base = baseline?.find((row) => row.name === summary.name);
    if (base && READ_CALLS.includes(summary.name) && summary.p95 > base.p95 * MAX_P95_RATIO) {
      failures.push(
        `${summary.name}: p95 ${Math.round(summary.p95)} ms es más de ${MAX_P95_RATIO}× la línea base (${Math.round(base.p95)} ms)`,
      );
    }
  }
  if (total > 0 && unexpected / total >= MAX_UNEXPECTED_RATE) {
    failures.push(`errores inesperados: ${((unexpected / total) * 100).toFixed(1)} % (máximo 1 %)`);
  }
  return failures;
}

export function saveResult(result: RunResult): string {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = result.finishedAt.replace(/[:.]/g, '-');
  const path = join(RESULTS_DIR, `${result.profile}-${stamp}.json`);
  writeFileSync(path, JSON.stringify(result, null, 2));
  return path;
}

// La última etapa de la corrida "humo" más reciente, o null si nunca se ha corrido.
export function readLatestBaseline(): ActionSummary[] | null {
  if (!existsSync(RESULTS_DIR)) {
    return null;
  }
  const files = readdirSync(RESULTS_DIR)
    .filter((name) => name.startsWith('humo-') && name.endsWith('.json'))
    .sort();
  const latest = files[files.length - 1];
  if (!latest) {
    return null;
  }
  const result = JSON.parse(readFileSync(join(RESULTS_DIR, latest), 'utf8')) as RunResult;
  return result.stages[result.stages.length - 1]?.summaries ?? null;
}
