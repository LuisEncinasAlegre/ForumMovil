// La sesión desde afuera: tokens alterados, esquemas que no se exponen, GraphQL y cerrar sesión.
import { createClientWithAccessToken, createTestClient } from './helpers/clients';
import { testEnv } from './helpers/env';
import { signInAsNewUser, type TestUser } from './helpers/users';

// Cambia el usuario (sub) del token sin volver a firmarlo, como haría alguien que lo edita a mano.
function withChangedUser(accessToken: string, otherUserId: string): string {
  const [header, payload, signature] = accessToken.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const changedPayload = Buffer.from(JSON.stringify({ ...claims, sub: otherUserId })).toString('base64url');
  return `${header}.${changedPayload}.${signature}`;
}

describe('sesión', () => {
  let ana: TestUser;
  let beto: TestUser;

  beforeAll(async () => {
    ana = await signInAsNewUser();
    beto = await signInAsNewUser();
  });

  test('un token editado a mano no sirve', async () => {
    const forged = createClientWithAccessToken(withChangedUser(ana.accessToken, beto.userId));
    const result = await forged.from('profiles').select('id').eq('id', beto.userId);

    expect(result.status).toBe(401);
    expect(result.data).toBeNull();
  });

  test('el esquema private no se puede pedir por la api', async () => {
    const { error } = await ana.client.schema('private').from('bans').select('id');

    expect(error?.code).toBe('PGRST106');
  });

  test('GraphQL está apagado', async () => {
    const response = await fetch(`${testEnv.supabaseUrl}/graphql/v1`, {
      method: 'POST',
      headers: { apikey: testEnv.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    const body = await response.json();

    expect(body.data).toBeUndefined();
    expect(body.errors[0].message).toMatch(/pg_graphql/);
  });

  // Supabase no revoca el token de acceso al cerrar sesión: solo el de refresco. El de acceso
  // sigue sirviendo hasta que vence (1 hora). Es un límite conocido, anotado en SECURITY.md.
  test('cerrar sesión revoca el refresco, pero el token de acceso sirve hasta que vence', async () => {
    const carla = await signInAsNewUser();
    const { data: before } = await carla.client.auth.getSession();
    const refreshToken = before.session?.refresh_token ?? '';
    const { error: signOutError } = await carla.client.auth.signOut();
    const sameToken = createClientWithAccessToken(carla.accessToken);
    const afterSignOut = await sameToken.from('profiles').select('id').eq('id', carla.userId);
    // el de refresco sí queda revocado: la sesión no se puede renovar
    const refresh = await createTestClient().auth.refreshSession({ refresh_token: refreshToken });

    expect(signOutError).toBeNull();
    expect(afterSignOut.data).toEqual([{ id: carla.userId }]);
    expect(refresh.error).not.toBeNull();
  });
});
