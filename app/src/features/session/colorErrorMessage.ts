type DatabaseError = {
  code?: string;
  message?: string;
};

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && ('code' in error || 'message' in error);
}

// Convierte el error al guardar tu color en un mensaje para la persona.
export function getColorErrorMessage(error: unknown): string {
  if (
    isDatabaseError(error) &&
    (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch'))
  ) {
    return 'No hay conexión. Tu color no cambió.';
  }
  return 'No pudimos guardar tu color. Inténtalo otra vez.';
}
