// Entrada de la prueba de carga: node load-tests/run.ts <pool|seed|run|clean> [opciones]
// Se corre desde app/ con los scripts load:* de package.json. Nunca contra un proyecto con usuarios reales.
import { parseArgs } from 'node:util';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readTestEnv } from '../db-tests/helpers/env.ts';
import { runIteration, type ScenarioState } from './actions.ts';
import { createAdminClient, createUserClient } from './clients.ts';
import { createMetrics, recentErrorRate, summarize } from './metrics.ts';
import { countLoadUsers, createPool, deleteLoadUsers, readPool, removePoolFile, savePool } from './pool.ts';
import { checkThresholds, printStage, readLatestBaseline, saveResult, type StageResult } from './report.ts';
import { runStages } from './scheduler.ts';
import { seedForum } from './seed.ts';
import { isProfileName, LOAD_PROFILES, type ProfileName } from './stages.ts';

const ERROR_WINDOW_MS = 15_000;
// más vueltas abiertas que esto = ya no da (la laptop o el servidor); se cuentan como saltadas
const MAX_IN_FLIGHT = 200;
// una vuelta que arranca más tarde que esto: la laptop no alcanza a generar la carga
const MAX_RELIABLE_START_DELAY_MS = 100;

type Options = {
  profile: ProfileName;
  users: number | null;
  posts: number;
  replies: number;
};

function readOptions(args: string[]): { command: string; options: Options } {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      perfil: { type: 'string', default: 'humo' },
      usuarios: { type: 'string' },
      posts: { type: 'string', default: '2000' },
      respuestas: { type: 'string', default: '3' },
    },
  });
  const profile = values.perfil;
  if (!isProfileName(profile)) {
    throw new Error(`Perfil desconocido "${profile}". Usa humo, clase o estres.`);
  }
  return {
    command: positionals[0] ?? '',
    options: {
      profile,
      users: values.usuarios === undefined ? null : Number(values.usuarios),
      posts: Number(values.posts),
      replies: Number(values.respuestas),
    },
  };
}

async function commandPool(options: Options): Promise<void> {
  const env = readTestEnv();
  const admin = createAdminClient(env);
  const leftover = await countLoadUsers(admin);
  if (leftover > 0) {
    throw new Error(`Ya hay ${leftover} usuarios de carga de otra corrida. Corre primero: npm run load:clean`);
  }
  const size = options.users ?? LOAD_PROFILES[options.profile].poolSize;
  console.log(`Creando ${size} usuarios (cada uno cuenta para el límite de inicios anónimos por hora)…`);
  const metrics = createMetrics();
  const users = await createPool(env, admin, size, metrics);
  savePool({ createdAt: new Date().toISOString(), users, seededPosts: [] });
  printStage('Entrar (sesión anónima)', summarize(metrics));
  console.log(`\nListo: ${users.length} usuarios. Los tokens duran una hora: corre seed y run antes.`);
}

async function commandSeed(options: Options): Promise<void> {
  const env = readTestEnv();
  const admin = createAdminClient(env);
  const pool = readPool();
  console.log(`Creando ${options.posts} publicaciones con ${options.replies} respuestas cada una…`);
  const result = await seedForum(admin, pool.users, { posts: options.posts, repliesPerPost: options.replies }, Math.random);
  savePool({ ...pool, seededPosts: [...pool.seededPosts, ...result.posts] });
  console.log(`\nListo: ${result.posts.length} publicaciones y ${result.commentCount} respuestas.`);
}

async function commandRun(options: Options): Promise<void> {
  const env = readTestEnv();
  const pool = readPool();
  if (pool.seededPosts.length === 0) {
    throw new Error('El foro no tiene publicaciones de carga. Corre primero: npm run load:seed');
  }
  const profile = LOAD_PROFILES[options.profile];
  if (pool.users.length < profile.poolSize) {
    console.log(`Aviso: el perfil pide ${profile.poolSize} usuarios y el grupo tiene ${pool.users.length}.`);
  }

  const clients = new Map<string, SupabaseClient>();
  for (const user of pool.users) {
    clients.set(user.userId, createUserClient(env, user.accessToken));
  }
  const metrics = createMetrics();
  const state: ScenarioState = {
    users: pool.users,
    clients,
    seededPosts: pool.seededPosts,
    cooldowns: new Map(),
    metrics,
    random: Math.random,
    nextUserIndex: 0,
  };
  const runStartedAt = Date.now();

  console.log(`Perfil ${options.profile}: ${profile.stages.map((s) => `${s.iterationsPerSecond}/s × ${s.seconds} s`).join(' → ')}`);
  const stats = await runStages(profile.stages, () => runIteration(state), {
    maxInFlight: MAX_IN_FLIGHT,
    shouldStop: () =>
      Date.now() - runStartedAt > ERROR_WINDOW_MS &&
      recentErrorRate(metrics, ERROR_WINDOW_MS, Date.now()) > profile.stopAtErrorRate,
  });

  const baseline = options.profile === 'humo' ? null : readLatestBaseline();
  const stageResults: StageResult[] = [];
  stats.windows.forEach((window, index) => {
    // las llamadas de una vuelta que siguen después del cambio de etapa cuentan para la siguiente
    const nextStart = stats.windows[index + 1]?.startedAt ?? Infinity;
    const summaries = summarize(metrics, window.startedAt, nextStart);
    stageResults.push({ stage: window.stage, summaries });
    printStage(`Etapa ${index + 1}: ${window.stage.iterationsPerSecond} vueltas/s`, summaries);
    if (options.profile !== 'humo') {
      const failures = checkThresholds(summaries, baseline);
      console.log(failures.length === 0 ? '✓ cumple' : failures.map((line) => `✗ ${line}`).join('\n'));
    }
  });

  console.log(
    `\nVueltas: ${stats.started} arrancadas, ${stats.skippedBecauseFull} saltadas, ${stats.crashedIterations} con excepción.`,
  );
  if (stats.stoppedEarly) {
    console.log(`Se detuvo antes: más del ${profile.stopAtErrorRate * 100} % de errores en ${ERROR_WINDOW_MS / 1000} s.`);
  }
  if (stats.maxStartDelayMs > MAX_RELIABLE_START_DELAY_MS) {
    console.log(`Ojo: una vuelta arrancó ${Math.round(stats.maxStartDelayMs)} ms tarde; la laptop no alcanzó a generar la carga.`);
  }
  if (!baseline && options.profile !== 'humo') {
    console.log('Sin línea base: corre el perfil humo primero para comparar.');
  }

  const path = saveResult({
    profile: options.profile,
    finishedAt: new Date().toISOString(),
    stats: {
      started: stats.started,
      skippedBecauseFull: stats.skippedBecauseFull,
      crashedIterations: stats.crashedIterations,
      stoppedEarly: stats.stoppedEarly,
      maxStartDelayMs: stats.maxStartDelayMs,
    },
    stages: stageResults,
  });
  console.log(`Guardado en ${path}`);
}

async function commandClean(): Promise<void> {
  const env = readTestEnv();
  const admin = createAdminClient(env);
  console.log('Borrando usuarios de carga (y todo lo que escribieron)…');
  const deleted = await deleteLoadUsers(admin);
  removePoolFile();
  console.log(`Listo: ${deleted} usuarios borrados.`);
}

async function main(): Promise<void> {
  const { command, options } = readOptions(process.argv.slice(2));
  if (command === 'pool') {
    await commandPool(options);
  } else if (command === 'seed') {
    await commandSeed(options);
  } else if (command === 'run') {
    await commandRun(options);
  } else if (command === 'clean') {
    await commandClean();
  } else {
    throw new Error('Uso: node load-tests/run.ts <pool|seed|run|clean> [--perfil humo|clase|estres] [--usuarios N] [--posts N] [--respuestas N]');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
