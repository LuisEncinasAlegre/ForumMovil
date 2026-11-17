// Clasifica cada respuesta para que el reporte separe lo esperado de lo que sí es un problema.
// Node corre este archivo directo (sin compilar), por eso solo TypeScript que se puede borrar.

export type Outcome =
  | 'ok'
  | 'expected' // un error que la prueba espera, p. ej. 23505 al reportar dos veces
  | 'rate_limited' // nuestros triggers: demasiadas_publicaciones / demasiadas_respuestas
  | 'gateway_limited' // 429 de Supabase, antes de llegar a la base de datos
  | 'server_error' // 5xx
  | 'timeout'
  | 'network_error' // la petición ni siquiera llegó (status 0)
  | 'other_error';

// Lo que devuelven supabase-js (PostgrestError) y supabase-js auth (AuthError), sin depender de sus clases.
export type ResponseError = {
  message?: string;
  code?: string;
  name?: string;
  status?: number;
};

export const UNEXPECTED_OUTCOMES: Outcome[] = [
  'rate_limited',
  'gateway_limited',
  'server_error',
  'timeout',
  'network_error',
  'other_error',
];

export function classifyResponse(
  error: ResponseError | null,
  status: number | undefined,
  expectedCodes: string[],
): Outcome {
  if (!error) {
    return 'ok';
  }
  if (error.code && expectedCodes.includes(error.code)) {
    return 'expected';
  }
  const message = error.message ?? '';
  // el texto viene de raise exception en limit_post_rate / limit_comment_rate
  if (message.startsWith('demasiadas_')) {
    return 'rate_limited';
  }
  // 57014 = la base de datos canceló la consulta por statement_timeout
  if (error.code === '57014' || message.includes('TimeoutError') || message.includes('AbortError')) {
    return 'timeout';
  }
  const httpStatus = status ?? error.status;
  if (httpStatus === 429) {
    return 'gateway_limited';
  }
  if (httpStatus !== undefined && httpStatus >= 500) {
    return 'server_error';
  }
  // postgrest-js devuelve status 0 cuando fetch falló (sin red, conexión cortada)
  if (httpStatus === 0 || message.includes('fetch failed')) {
    return 'network_error';
  }
  return 'other_error';
}

// El código que se guarda junto a la muestra para poder buscar el error después.
export function errorCode(error: ResponseError | null, status: number | undefined): string | undefined {
  if (!error) {
    return undefined;
  }
  if (error.code) {
    return error.code;
  }
  const httpStatus = status ?? error.status;
  return httpStatus === undefined ? error.name : String(httpStatus);
}
