// La matriz de permisos (matrix/cases.ts) contra la api real, una petición por fila.
// Necesita db-tests/.env.test (llave secreta y token de moderación), igual que moderation.test.ts.
import { createAdminClient } from './helpers/clients';
import type { Outcome } from './helpers/outcomes';
import { buildActors, type Actors } from './matrix/actors';
import { attemptDelete, attemptInsert, attemptRpc, attemptSelect, attemptUpdate } from './matrix/attempts';
import { matrixCases, type MatrixCase } from './matrix/cases';

const admin = createAdminClient();

async function runCase(actors: Actors, matrixCase: MatrixCase): Promise<Outcome> {
  const client = actors.clients[matrixCase.actor];
  const fixtures = actors.fixtures;

  if (matrixCase.operation === 'select') {
    return attemptSelect(client, matrixCase.table, fixtures[matrixCase.target]);
  }
  if (matrixCase.operation === 'insert') {
    return attemptInsert(client, matrixCase.table, matrixCase.values(fixtures));
  }
  if (matrixCase.operation === 'update') {
    return attemptUpdate(admin, client, matrixCase.table, fixtures[matrixCase.target], matrixCase.values(fixtures));
  }
  if (matrixCase.operation === 'delete') {
    return attemptDelete(admin, client, matrixCase.table, fixtures[matrixCase.target]);
  }
  return attemptRpc(client, matrixCase.schema, matrixCase.table, matrixCase.values(fixtures));
}

describe('matriz de permisos', () => {
  let actors: Actors;

  beforeAll(async () => {
    actors = await buildActors();
  }, 60000);

  // las filas corren en orden: algunas cambian datos que las siguientes ya no usan
  test.each(matrixCases)('$table $operation como $actor: $why', async (matrixCase) => {
    await expect(runCase(actors, matrixCase)).resolves.toBe(matrixCase.expected);
  });
});
