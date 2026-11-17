import { readEnv } from '../env';

describe('readEnv', () => {
  test('devuelve la url y la llave', () => {
    const env = readEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://ejemplo.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
    });

    expect(env).toEqual({
      supabaseUrl: 'https://ejemplo.supabase.co',
      supabasePublishableKey: 'sb_publishable_123',
    });
  });

  test('avisa cuál variable falta', () => {
    expect(() => readEnv({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123' })).toThrow(
      'EXPO_PUBLIC_SUPABASE_URL',
    );
    expect(() => readEnv({ EXPO_PUBLIC_SUPABASE_URL: 'https://ejemplo.supabase.co' })).toThrow(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  });
});
