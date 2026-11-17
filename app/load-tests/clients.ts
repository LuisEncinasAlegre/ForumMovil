// Clientes de Supabase para la prueba de carga. Ninguno guarda ni refresca la sesión: el grupo de
// usuarios dura menos de una hora (lo que dura un token) y refrescar 100 tokens desde una sola IP
// chocaría con el límite de /token (150 cada 5 minutos).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { TestEnv } from '../db-tests/helpers/env.ts';

// supabase-js no corta las peticiones que tardan; sin esto una petición colgada nunca sería muestra
const REQUEST_TIMEOUT_MS = 15_000;

const withoutStoredSession = { persistSession: false, autoRefreshToken: false };

function fetchWithTimeout(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

// Con la llave publicable, como el teléfono. Con accessToken, actúa como ese usuario.
export function createUserClient(env: TestEnv, accessToken?: string): SupabaseClient {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return createClient(env.supabaseUrl, env.publishableKey, {
    auth: withoutStoredSession,
    global: { headers, fetch: fetchWithTimeout },
  });
}

// Con la llave secreta: solo para llenar el foro rápido y para borrar a los usuarios de carga.
export function createAdminClient(env: TestEnv): SupabaseClient {
  if (!env.secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY en app/db-tests/.env.test (ver db-tests/.env.example).');
  }
  return createClient(env.supabaseUrl, env.secretKey, { auth: withoutStoredSession });
}
