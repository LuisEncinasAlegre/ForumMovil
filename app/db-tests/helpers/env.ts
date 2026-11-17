// Lee app/.env y app/db-tests/.env.test a mano: Jest le da a cada prueba su propia copia de
// process.env y Expo reemplaza process.env.EXPO_PUBLIC_X al compilar, así que ahí quedaría vacío.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export type TestEnv = {
  supabaseUrl: string;
  publishableKey: string;
  // vacías si falta db-tests/.env.test; las pruebas que las usan fallan con un mensaje claro
  secretKey: string;
  moderatorToken: string;
};

function readEnvFile(path: string): Record<string, string | undefined> {
  if (!existsSync(path)) {
    return {};
  }
  return parseEnv(readFileSync(path, 'utf8'));
}

export function readTestEnv(): TestEnv {
  if (!existsSync('.env')) {
    throw new Error('Falta app/.env. Cópialo de .env.example y pon la URL y la llave publicable.');
  }
  const env = readEnvFile('.env');
  const testEnv = readEnvFile('db-tests/.env.test');
  return {
    supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    publishableKey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    secretKey: testEnv.SUPABASE_SECRET_KEY ?? '',
    moderatorToken: testEnv.MODERATOR_TEST_TOKEN ?? '',
  };
}

export const testEnv = readTestEnv();
