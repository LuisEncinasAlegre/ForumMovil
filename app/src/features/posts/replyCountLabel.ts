// "1 respuesta", "14 respuestas". Con cero no se muestra nada, así que no hay texto para eso.
export function formatReplyCount(count: number): string {
  if (count === 1) {
    return '1 respuesta';
  }
  return count + ' respuestas';
}
