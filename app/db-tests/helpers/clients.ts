// Clientes de Supabase para las pruebas. Ninguno guarda la sesión ni la refresca solo.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { testEnv } from './env';

const withoutStoredSession = { persistSession: false, autoRefreshToken: false };

// Con la llave publicable, como la app. Sin sesión hasta que la prueba inicie una.
export function createTestClient(): SupabaseClient {
  return createClient(testEnv.supabaseUrl, testEnv.publishableKey, { auth: withoutStoredSession });
}

// Manda un token de acceso hecho a mano, para probar tokens alterados.
export function createClientWithAccessToken(accessToken: string): SupabaseClient {
  return createClient(testEnv.supabaseUrl, testEnv.publishableKey, {
    auth: withoutStoredSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Con la llave secreta: salta RLS. Hace lo que hace la Edge Function y prepara datos de prueba.
export function createAdminClient(): SupabaseClient {
  if (!testEnv.secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY en app/db-tests/.env.test (ver db-tests/.env.example).');
  }
  return createClient(testEnv.supabaseUrl, testEnv.secretKey, { auth: withoutStoredSession });
}
