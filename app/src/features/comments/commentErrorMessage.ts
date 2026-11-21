import { CommentNotEditableError } from './api';

type DatabaseError = {
  code?: string;
  message?: string;
};

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error);
}

// Convierte el error de Supabase en un mensaje para la persona.
export function getCommentErrorMessage(error: unknown): string {
  if (error instanceof CommentNotEditableError) {
    return 'Esta respuesta ya no se puede editar.';
  }
  if (!isDatabaseError(error)) {
    return 'Algo salió mal. Inténtalo otra vez.';
  }
  // el trigger de límite por minuto (código P0001 de raise exception)
  if (error.message === 'demasiadas_respuestas') {
    return 'Vas muy rápido. Espera un minuto antes de responder otra vez.';
  }
  // RLS rechazó el insert: la publicación ya no acepta respuestas o la cuenta está restringida
  if (error.code === '42501') {
    return 'No pudimos enviar tu respuesta. Puede que la publicación ya no esté o que tu cuenta esté restringida.';
  }
  // no cumple el check del largo del texto
  if (error.code === '23514') {
    return 'Tu respuesta está fuera de los límites.';
  }
  // sin internet, fetch falla antes de llegar a Supabase
  if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
    return 'No hay conexión. Revisa tu red e inténtalo otra vez.';
  }
  return 'Algo salió mal. Inténtalo otra vez.';
}
