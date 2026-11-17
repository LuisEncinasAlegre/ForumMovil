// Pruebas de las reglas de seguridad (RLS) de la tabla profiles.
// Hablan con el proyecto de Supabase que está en .env, por eso no corren con `npm test`
// sino con `npm run test:db`. Cada corrida crea dos usuarios anónimos nuevos.
import { createTestClient } from './helpers/clients';
import { signInAsNewUser, type TestUser } from './helpers/users';

describe('tabla profiles', () => {
  let ana: TestUser;
  let beto: TestUser;

  beforeAll(async () => {
    ana = await signInAsNewUser();
    beto = await signInAsNewUser();
  });

  test('al crear la sesión se crea un perfil con alias y su fila privada', async () => {
    const { data, error } = await ana.client
      .from('profiles')
      .select('display_name, color, profile_private(rules_accepted_at, created_at)')
      .eq('id', ana.userId)
      .single();

    expect(error).toBeNull();
    expect(data?.display_name).toMatch(/^[a-z]+-[a-z]+$/);
    expect(data?.color).toBeNull(); // todavía no elige color
    expect(data?.profile_private).toEqual({ rules_accepted_at: null, created_at: expect.any(String) });
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

  test('el hex va en minúsculas (la app siempre lo manda así)', async () => {
    const { error } = await ana.client.from('profiles').update({ color: '#3D7FD9' }).eq('id', ana.userId);

    expect(error?.code).toBe('23514');
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
    await ana.client
      .from('profile_private')
      .update({ rules_accepted_at: '2000-01-01T00:00:00Z' })
      .eq('user_id', ana.userId);
    const accepted = await ana.client
      .from('profile_private')
      .select('rules_accepted_at')
      .eq('user_id', ana.userId)
      .single();
    const acceptedAt = new Date(accepted.data?.rules_accepted_at);

    // aceptó hace menos de 5 minutos, no en el año 2000
    expect(Math.abs(Date.now() - acceptedAt.getTime())).toBeLessThan(5 * 60 * 1000);

    await ana.client.from('profile_private').update({ rules_accepted_at: null }).eq('user_id', ana.userId);
    const afterClear = await ana.client
      .from('profile_private')
      .select('rules_accepted_at')
      .eq('user_id', ana.userId)
      .single();

    expect(afterClear.data?.rules_accepted_at).toBe(accepted.data?.rules_accepted_at);
  });

  test('las fechas de tu perfil no las ve nadie más', async () => {
    const othersRow = await beto.client.from('profile_private').select('*').eq('user_id', ana.userId);
    const oldColumns = await beto.client.from('profiles').select('created_at').eq('id', ana.userId);

    expect(othersRow.error).toBeNull();
    expect(othersRow.data).toEqual([]); // RLS: solo tu fila
    expect(oldColumns.error).not.toBeNull(); // la columna ya no existe en profiles
  });

  test('no puedo cambiar la fila privada de otra persona ni la fecha en que se creó', async () => {
    const othersRules = await beto.client
      .from('profile_private')
      .update({ rules_accepted_at: new Date().toISOString() })
      .eq('user_id', ana.userId)
      .select();
    const myCreatedAt = await beto.client
      .from('profile_private')
      .update({ created_at: '2000-01-01T00:00:00Z' })
      .eq('user_id', beto.userId);
    const insert = await beto.client.from('profile_private').insert({ user_id: beto.userId });

    expect(othersRules.data).toEqual([]);
    expect(myCreatedAt.error?.code).toBe('42501'); // sin permiso sobre esa columna
    expect(insert.error?.code).toBe('42501');
  });

  test('sin sesión no se puede leer ningún perfil', async () => {
    const noSession = createTestClient();
    const { error } = await noSession.from('profiles').select('id');

    expect(error?.code).toBe('42501');
  });
});
