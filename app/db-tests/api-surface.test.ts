// Lo que la API deja ver o hacer a anon y authenticated: grants, políticas, rls y funciones.
// La instantánea falla con cualquier cambio de permisos. Si el cambio es a propósito, actualízala
// con `npm run test:db -- -u api-surface` y revisa la diferencia en el PR (ver SECURITY.md).
import { createAdminClient } from './helpers/clients';

type SurfaceRow = {
  kind: string;
  object_name: string;
  role_name: string | null;
  detail: string;
};

const admin = createAdminClient();

function sortRows(rows: SurfaceRow[]): SurfaceRow[] {
  return [...rows].sort((a, b) => {
    const left = `${a.kind}|${a.object_name}|${a.role_name ?? ''}|${a.detail}`;
    const right = `${b.kind}|${b.object_name}|${b.role_name ?? ''}|${b.detail}`;
    return left.localeCompare(right);
  });
}

describe('superficie de la api', () => {
  let rows: SurfaceRow[] = [];

  beforeAll(async () => {
    const { data, error } = await admin.rpc('audit_api_surface');
    if (error) {
      throw new Error('audit_api_surface falló: ' + error.message);
    }
    rows = sortRows(data);
  });

  test('lo nuevo en public no nace abierto para anon, authenticated ni public', () => {
    const openDefaults = rows.filter(
      (row) => row.kind === 'default_privilege' && row.role_name !== 'postgres',
    );
    // sin esta fila, Postgres usa su valor de fábrica: execute para public en toda función nueva
    const globalFunctionDefaults = rows.filter(
      (row) => row.kind === 'default_privilege' && row.object_name === '* functions',
    );

    expect(openDefaults).toEqual([]);
    expect(globalFunctionDefaults).not.toEqual([]);
  });

  test('todas las tablas tienen rls', () => {
    const withoutRls = rows.filter((row) => row.kind === 'rls' && row.detail !== 'enabled');

    expect(withoutRls).toEqual([]);
  });

  test('anon no puede leer ni llamar nada', () => {
    const anonAccess = rows.filter(
      (row) => row.role_name === 'anon' && row.kind !== 'schema' && row.kind !== 'default_privilege',
    );

    expect(anonAccess).toEqual([]);
  });

  test('una sesión no puede llamar a las funciones de moderación', () => {
    const moderationFunctions = rows.filter(
      (row) => row.kind === 'function' && row.object_name.startsWith('public.mod_'),
    );

    expect(moderationFunctions).toEqual([]);
  });

  test('nada cambió sin que alguien lo revisara', () => {
    expect(rows).toMatchSnapshot();
  });
});
