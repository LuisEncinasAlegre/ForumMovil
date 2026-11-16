import { PostNotEditableError } from './api';

type DatabaseError = {
  code?: string;
  message?: string;
};

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error);
}

// Convierte el error de Supabase en un mensaje para la persona.
export function getPostErrorMessage(error: unknown): string {
  if (error instanceof PostNotEditableError) {
    return 'Esta publicación ya no se puede editar.';
  }
  if (!isDatabaseError(error)) {
    return 'Algo salió mal. Inténtalo otra vez.';
  }
  // el trigger de límite por minuto (código P0001 de raise exception)
  if (error.message === 'demasiadas_publicaciones') {
    return 'Vas muy rápido. Espera un minuto antes de publicar otra vez.';
  }
  // no cumple un check (largo del título o del texto)
  if (error.code === '23514') {
    return 'Revisa el título y el texto: algo está fuera de los límites.';
  }
  // sin internet, fetch falla antes de llegar a Supabase
  if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
    return 'No hay conexión. Revisa tu red e inténtalo otra vez.';
  }
  return 'Algo salió mal. Inténtalo otra vez.';
}
