// Pruebas de las reglas de seguridad (RLS) de la tabla profiles.
// Hablan con el proyecto de Supabase que está en .env, por eso no corren con `npm test`
// sino con `npm run test:db`. Cada corrida crea dos usuarios anónimos nuevos.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TestUser = {
  client: SupabaseClient;
  userId: string;
};

if (!existsSync('.env')) {
  throw new Error('Falta app/.env. Cópialo de .env.example y pon la URL y la llave publicable.');
}
// Leemos el .env a mano: Jest le da a cada prueba su propia copia de process.env
// y Expo reemplaza process.env.EXPO_PUBLIC_X al compilar, así que ahí quedaría vacío.
const env = parseEnv(readFileSync('.env', 'utf8'));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

function createTestClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInAsNewUser(): Promise<TestUser> {
  const client = createTestClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error('No se pudo iniciar sesión anónima: ' + error?.message);
  }
  return { client, userId: data.user.id };
}

describe('tabla profiles', () => {
  let ana: TestUser;
  let beto: TestUser;

  beforeAll(async () => {
    ana = await signInAsNewUser();
    beto = await signInAsNewUser();
  });

  test('al crear la sesión se crea un perfil con alias', async () => {
    const { data, error } = await ana.client
      .from('profiles')
      .select('display_name, color, rules_accepted_at')
      .eq('id', ana.userId)
      .single();

    expect(error).toBeNull();
    expect(data?.display_name).toMatch(/^[a-z]+-[a-z]+$/);
    expect(data?.color).toBeNull(); // todavía no elige color
    expect(data?.rules_accepted_at).toBeNull();
  });

  test('una sesión puede leer el perfil de otra', async () => {
    const { data, error } = await ana.client.from('profiles').select('display_name').eq('id', beto.userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test('puedo cambiar mi color', async () => {
    const { data, error } = await ana.client
      .from('profiles')
      .update({ color: '#3d7fd9' })
      .eq('id', ana.userId)
      .select('color');

    expect(error).toBeNull();
    expect(data).toEqual([{ color: '#3d7fd9' }]);
  });

  test('el color tiene que ser un hex #rrggbb', async () => {
    const { error } = await ana.client.from('profiles').update({ color: 'rojo' }).eq('id', ana.userId);

    expect(error?.code).toBe('23514'); // no cumple el check
  });

  test('no puedo cambiar el color de otra persona', async () => {
    const before = await beto.client.from('profiles').select('color').eq('id', beto.userId).single();
    const newColor = before.data?.color === '#000000' ? '#ffffff' : '#000000';

    // RLS no da error aquí: simplemente no encuentra filas que pueda editar.
    const { data } = await ana.client.from('profiles').update({ color: newColor }).eq('id', beto.userId).select();
    const after = await beto.client.from('profiles').select('color').eq('id', beto.userId).single();

    expect(data).toEqual([]);
    expect(after.data?.color).toBe(before.data?.color);
  });

  test('no puedo cambiar mi alias', async () => {
    const { error } = await ana.client.from('profiles').update({ display_name: 'falso-alias' }).eq('id', ana.userId);

    expect(error?.code).toBe('42501'); // permiso denegado
  });

  test('no puedo crear ni borrar perfiles', async () => {
    const insert = await ana.client
      .from('profiles')
      .insert({ id: ana.userId, display_name: 'otro-alias' });
    const remove = await ana.client.from('profiles').delete().eq('id', ana.userId);

    expect(insert.error?.code).toBe('42501');
    expect(remove.error?.code).toBe('42501');
  });

  test('la hora de aceptar las reglas la pone el servidor y no se puede borrar', async () => {
    await ana.client.from('profiles').update({ rules_accepted_at: '2000-01-01T00:00:00Z' }).eq('id', ana.userId);
    const accepted = await ana.client.from('profiles').select('rules_accepted_at').eq('id', ana.userId).single();
    const acceptedAt = new Date(accepted.data?.rules_accepted_at);

    // aceptó hace menos de 5 minutos, no en el año 2000
    expect(Math.abs(Date.now() - acceptedAt.getTime())).toBeLessThan(5 * 60 * 1000);

    await ana.client.from('profiles').update({ rules_accepted_at: null }).eq('id', ana.userId);
    const afterClear = await ana.client.from('profiles').select('rules_accepted_at').eq('id', ana.userId).single();

    expect(afterClear.data?.rules_accepted_at).toBe(accepted.data?.rules_accepted_at);
  });

  test('sin sesión no se puede leer ningún perfil', async () => {
    const noSession = createTestClient();
    const { error } = await noSession.from('profiles').select('id');

    expect(error?.code).toBe('42501');
  });
});
