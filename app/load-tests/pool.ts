// El grupo de usuarios simulados. Cada uno entra como el teléfono: sesión anónima, reglas
// aceptadas y un teléfono registrado. El teléfono empieza con "carga-": así se encuentran y se
// borran aunque la corrida se haya caído o el archivo local ya no exista.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { TestEnv } from '../db-tests/helpers/env.ts';
import { createUserClient } from './clients.ts';
import { timeCall, type Metrics } from './metrics.ts';
import type { SeededPost } from './seed.ts';

export const LOAD_DEVICE_PREFIX = 'carga-';
export const POOL_FILE = 'load-tests/.pool.json';

// Un token dura 1 h; con 55 min queda margen para terminar la corrida.
const POOL_MAX_AGE_MS = 55 * 60 * 1000;
// De cinco en cinco, como una clase que abre la app casi al mismo tiempo, sin pegarle todo de golpe.
const SIGN_IN_BATCH_SIZE = 5;

export type LoadUser = {
  userId: string;
  alias: string;
  accessToken: string;
  deviceId: string;
};

export type PoolFile = {
  createdAt: string;
  users: LoadUser[];
  seededPosts: SeededPost[];
};

export async function createLoadUser(env: TestEnv, admin: SupabaseClient, metrics: Metrics): Promise<LoadUser> {
  const client = createUserClient(env);
  // "entrar" mide lo que más pesa cuando todos abren la app: sesión anónima + trigger del alias
  const signIn = await timeCall(metrics, 'entrar', () => client.auth.signInAnonymously());
  if (!signIn || signIn.error || !signIn.data.user || !signIn.data.session) {
    throw new Error('No se pudo iniciar sesión anónima: ' + (signIn?.error?.message ?? 'sin respuesta'));
  }
  const userId = signIn.data.user.id;
  try {
    return await finishMembership(client, userId, signIn.data.session.access_token);
  } catch (error) {
    // sin teléfono "carga-" load:clean no lo encontraría: se borra aquí mismo
    await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

// Lo que hace la bienvenida después de entrar: aceptar reglas y registrar el teléfono.
async function finishMembership(client: SupabaseClient, userId: string, accessToken: string): Promise<LoadUser> {
  const deviceId = LOAD_DEVICE_PREFIX + userId;
  const rules = await client
    .from('profile_private')
    .update({ rules_accepted_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (rules.error) {
    throw new Error('No se pudieron aceptar las reglas: ' + rules.error.message);
  }
  const device = await client.from('user_devices').insert({ device_id: deviceId, platform: 'android' });
  if (device.error) {
    throw new Error('No se pudo registrar el teléfono: ' + device.error.message);
  }
  const profile = await client.from('profiles').select('display_name').eq('id', userId).single();
  if (profile.error) {
    throw new Error('No se pudo leer el perfil: ' + profile.error.message);
  }

  return { userId, alias: profile.data.display_name, accessToken, deviceId };
}

export async function createPool(
  env: TestEnv,
  admin: SupabaseClient,
  size: number,
  metrics: Metrics,
): Promise<LoadUser[]> {
  const users: LoadUser[] = [];
  while (users.length < size) {
    const batchSize = Math.min(SIGN_IN_BATCH_SIZE, size - users.length);
    const batch = await Promise.all(Array.from({ length: batchSize }, () => createLoadUser(env, admin, metrics)));
    users.push(...batch);
    console.log(`  ${users.length}/${size} usuarios`);
  }
  return users;
}

export async function countLoadUsers(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from('user_devices')
    .select('user_id', { count: 'exact', head: true })
    .like('device_id', `${LOAD_DEVICE_PREFIX}%`);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

// Borra cada usuario de carga. on delete cascade se lleva su perfil, publicaciones, respuestas,
// reportes y teléfono. Devuelve cuántos borró.
export async function deleteLoadUsers(admin: SupabaseClient): Promise<number> {
  let deleted = 0;
  while (true) {
    const { data, error } = await admin
      .from('user_devices')
      .select('user_id')
      .like('device_id', `${LOAD_DEVICE_PREFIX}%`)
      .limit(100);
    if (error) {
      throw error;
    }
    if (data.length === 0) {
      return deleted;
    }
    for (const row of data) {
      const result = await admin.auth.admin.deleteUser(row.user_id);
      if (result.error) {
        throw new Error(`No se pudo borrar ${row.user_id}: ${result.error.message}`);
      }
      deleted += 1;
    }
    console.log(`  ${deleted} borrados`);
  }
}

export function savePool(pool: PoolFile): void {
  mkdirSync(dirname(POOL_FILE), { recursive: true });
  writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
}

export function readPool(): PoolFile {
  if (!existsSync(POOL_FILE)) {
    throw new Error('No hay grupo de usuarios. Corre primero: npm run load:pool');
  }
  const pool = JSON.parse(readFileSync(POOL_FILE, 'utf8')) as PoolFile;
  if (Date.now() - Date.parse(pool.createdAt) > POOL_MAX_AGE_MS) {
    throw new Error('Los tokens del grupo ya vencieron. Corre npm run load:clean y luego npm run load:pool.');
  }
  return pool;
}

export function removePoolFile(): void {
  rmSync(POOL_FILE, { force: true });
}
