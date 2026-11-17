// Un intento por operación, como lo haría la app (o alguien que copió su llave publicable).
// Cada uno devuelve un Outcome. Los cambios se confirman releyendo la fila con la llave secreta:
// así "no hubo error" no se confunde con "sí cambió".
import type { SupabaseClient } from '@supabase/supabase-js';

import { deniedOrThrow, outcomeFromRead, type Outcome } from '../helpers/outcomes';

export type TableName =
  | 'posts'
  | 'comments'
  | 'post_edits'
  | 'comment_edits'
  | 'reports'
  | 'moderation_notices'
  | 'profiles'
  | 'profile_private'
  | 'user_devices';

export type Values = Record<string, unknown>;

// la columna con la que se busca la fila de prueba en cada tabla
const keyColumnByTable: Record<TableName, string> = {
  posts: 'id',
  comments: 'id',
  post_edits: 'post_id',
  comment_edits: 'comment_id',
  reports: 'post_id', // nadie los lee; se buscan por la publicación reportada
  moderation_notices: 'id',
  profiles: 'id',
  profile_private: 'user_id',
  user_devices: 'user_id',
};

async function readRowAsAdmin(admin: SupabaseClient, table: TableName, targetId: number | string): Promise<Values | null> {
  // en *_edits y user_devices hay varias filas por clave; con la primera basta para comparar
  const { data, error } = await admin
    .from(table)
    .select('*')
    .eq(keyColumnByTable[table], targetId)
    .limit(1);
  if (error) {
    throw new Error(`No se pudo releer ${table}: ${error.message}`);
  }
  return data[0] ?? null;
}

export async function attemptSelect(client: SupabaseClient, table: TableName, targetId: number | string): Promise<Outcome> {
  const keyColumn = keyColumnByTable[table];
  const result = await client.from(table).select(keyColumn).eq(keyColumn, targetId);
  return outcomeFromRead(result);
}

// Sin .select() a propósito: reports no tiene permiso de lectura y el insert igual debe poder pasar.
export async function attemptInsert(client: SupabaseClient, table: TableName, values: Values): Promise<Outcome> {
  const { error } = await client.from(table).insert(values);
  if (error) {
    return deniedOrThrow(error);
  }
  return 'allowed';
}

export async function attemptUpdate(
  admin: SupabaseClient,
  client: SupabaseClient,
  table: TableName,
  targetId: number | string,
  values: Values,
): Promise<Outcome> {
  const before = await readRowAsAdmin(admin, table, targetId);
  const { error } = await client.from(table).update(values).eq(keyColumnByTable[table], targetId);
  if (error) {
    return deniedOrThrow(error);
  }
  const after = await readRowAsAdmin(admin, table, targetId);
  // los triggers pueden reescribir el valor (deleted_at = now()), así que solo vemos si cambió
  const changed = Object.keys(values).some((column) => before?.[column] !== after?.[column]);
  return changed ? 'allowed' : 'noEffect';
}

export async function attemptDelete(
  admin: SupabaseClient,
  client: SupabaseClient,
  table: TableName,
  targetId: number | string,
): Promise<Outcome> {
  const { error } = await client.from(table).delete().eq(keyColumnByTable[table], targetId);
  if (error) {
    return deniedOrThrow(error);
  }
  const after = await readRowAsAdmin(admin, table, targetId);
  return after ? 'noEffect' : 'allowed';
}

export async function attemptRpc(
  client: SupabaseClient,
  schema: 'public' | 'private',
  functionName: string,
  args: Values,
): Promise<Outcome> {
  const { error } = await client.schema(schema).rpc(functionName, args);
  if (error) {
    return deniedOrThrow(error);
  }
  return 'allowed';
}
