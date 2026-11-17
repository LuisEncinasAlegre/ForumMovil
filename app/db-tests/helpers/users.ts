// Usuarios de prueba. Cada sesión anónima cuenta para el límite por hora de Supabase,
// así que cada archivo crea solo los que necesita.
import type { SupabaseClient } from '@supabase/supabase-js';

import { createTestClient } from './clients';
import { testEnv } from './env';

export type TestUser = {
  client: SupabaseClient;
  userId: string;
  alias: string;
  accessToken: string;
};

export async function signInAsNewUser(): Promise<TestUser> {
  const client = createTestClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user || !data.session) {
    throw new Error('No se pudo iniciar sesión anónima: ' + error?.message);
  }
  // el trigger crea el perfil con su alias, solo lo leemos
  const profile = await client.from('profiles').select('display_name').eq('id', data.user.id).single();
  if (profile.error) {
    throw new Error('No se pudo leer el perfil nuevo: ' + profile.error.message);
  }
  return {
    client,
    userId: data.user.id,
    alias: profile.data.display_name,
    accessToken: data.session.access_token,
  };
}

export async function acceptRules(user: TestUser): Promise<void> {
  const { error } = await user.client
    .from('profile_private')
    .update({ rules_accepted_at: new Date().toISOString() })
    .eq('user_id', user.userId);
  if (error) {
    throw new Error('No se pudieron aceptar las reglas: ' + error.message);
  }
}

export async function registerDevice(user: TestUser, deviceId: string): Promise<void> {
  const { error } = await user.client.from('user_devices').insert({ device_id: deviceId, platform: 'android' });
  if (error) {
    throw new Error('No se pudo registrar el teléfono: ' + error.message);
  }
}

// Reglas aceptadas pero sin teléfono: cada prueba decide si lo registra.
export async function signInWithRulesAccepted(): Promise<TestUser> {
  const user = await signInAsNewUser();
  await acceptRules(user);
  return user;
}

// Como la app después de la bienvenida: reglas aceptadas y teléfono registrado.
export async function signInAsMember(): Promise<TestUser> {
  const user = await signInWithRulesAccepted();
  await registerDevice(user, `prueba-${user.userId}`);
  return user;
}

export async function fetchTestModeratorId(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.rpc('mod_whoami', { token: testEnv.moderatorToken });
  if (error) {
    throw new Error('MODERATOR_TEST_TOKEN no sirve: ' + error.message);
  }
  return data;
}
