import { createClient } from '@supabase/supabase-js';

// La llave secreta solo vive en el servidor. Supabase la pone en SUPABASE_SECRET_KEYS como JSON.
function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!url || !secretKeys) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEYS en el entorno de la función.');
  }

  const secretKey = JSON.parse(secretKeys)['default'];
  if (typeof secretKey !== 'string') {
    throw new Error('SUPABASE_SECRET_KEYS no tiene una llave llamada "default".');
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const adminClient = createAdminClient();

// Los errores de las funciones mod_* traen un código corto; aquí van en palabras y con qué hacer.
const databaseErrorMessages: Record<string, string> = {
  token_invalido: 'El token de moderación no es válido o está desactivado.',
  objetivo_invalido: 'Manda post_id o comment_id, solo uno de los dos.',
  no_existe: 'No existe esa publicación o respuesta. Revisa el id con ver_pendientes.',
  esta_borrado: 'Su autor ya lo borró; no hace falta moderarlo.',
  ya_esta_oculto: 'Ya está oculto por moderación. Usa restaurar si fue un error.',
  no_esta_oculto: 'No está oculto, así que no hay nada que restaurar.',
  sin_pendiente: 'No está en la cola de revisión. Usa ver_pendientes para ver lo que falta.',
  categoria_invalida: 'La categoría debe ser spam, acoso, inapropiado u otro.',
  mensaje_invalido: 'El mensaje para el autor debe tener entre 1 y 300 caracteres.',
  alias_no_existe: 'No hay nadie con ese alias. Copia el alias tal como sale en ver_pendientes.',
  motivo_invalido: 'El motivo debe tener entre 1 y 300 caracteres.',
  duracion_invalida: 'La suspensión va de 1 a 720 horas (30 días).',
  ya_tiene_baneo: 'Ya tiene una suspensión o un baneo vigente. Usa quitar_ban primero si quieres cambiarlo.',
  sin_baneo: 'No tiene ninguna suspensión ni baneo vigente.',
};

export async function callModerationFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await adminClient.rpc(name, args);
  if (error) {
    throw new Error(databaseErrorMessages[error.message] ?? `La base de datos respondió: ${error.message}`);
  }
  return data;
}
