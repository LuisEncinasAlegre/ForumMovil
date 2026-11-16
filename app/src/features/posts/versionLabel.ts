import { formatTimeAgo } from '@/lib/time';

// Etiqueta de una versión anterior: "Versión de hace 2 h", "Versión de ayer", "Versión del 12 nov".
export function formatVersionLabel(writtenAt: string, now: Date = new Date()): string {
  const timeAgo = formatTimeAgo(writtenAt, now);
  if (timeAgo === 'ahora') {
    return 'Versión de hace un momento';
  }
  if (timeAgo.startsWith('hace') || timeAgo === 'ayer') {
    return `Versión de ${timeAgo}`;
  }
  return `Versión del ${timeAgo}`;
}
