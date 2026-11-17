// Los tres resultados posibles de un intento contra la api.
// - allowed: la base hizo lo que se pidió (o devolvió la fila).
// - denied: la base respondió con un error de permisos.
// - noEffect: no hubo error, pero RLS filtró la fila: la lectura vino vacía o el cambio no pasó.
//   Un update que RLS bloquea no da error, devuelve 0 filas; por eso esto es un resultado aparte.
import type { PostgrestError } from '@supabase/supabase-js';

import { RLS_ERROR } from './errors';

export type Outcome = 'allowed' | 'denied' | 'noEffect';

// esquema que no expone la api (por ejemplo private): también es un "no"
const SCHEMA_NOT_EXPOSED = 'PGRST106';

// Un error que no es de permisos significa que la prueba armó mal la petición: mejor fallar
// con el mensaje que contar el intento como "denegado".
export function deniedOrThrow(error: PostgrestError): Outcome {
  if (error.code === RLS_ERROR || error.code === SCHEMA_NOT_EXPOSED) {
    return 'denied';
  }
  throw new Error(`Error inesperado ${error.code}: ${error.message}`);
}

export function outcomeFromRead(result: { error: PostgrestError | null; data: unknown[] | null }): Outcome {
  if (result.error) {
    return deniedOrThrow(result.error);
  }
  return result.data && result.data.length > 0 ? 'allowed' : 'noEffect';
}
