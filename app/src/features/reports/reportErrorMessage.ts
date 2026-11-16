type DatabaseError = {
  code?: string;
  message?: string;
};

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error);
}

// Convierte el error de Supabase en un mensaje para la persona.
export function getReportErrorMessage(error: unknown): string {
  if (!isDatabaseError(error)) {
    return 'Algo salió mal. Inténtalo otra vez.';
  }
  // RLS rechazó el insert: se borró o se ocultó mientras leías
  if (error.code === '42501') {
    return 'Esto ya no está, así que no se puede reportar.';
  }
  // sin internet, fetch falla antes de llegar a Supabase
  if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
    return 'No hay conexión. Revisa tu red e inténtalo otra vez.';
  }
  return 'Algo salió mal. Inténtalo otra vez.';
}
