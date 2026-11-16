import type { ActiveBan } from './types';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "20 de noviembre, 14:30" en la hora del teléfono; con año si no es el de ahora.
export function banEndLabel(endsAt: string | null, now: Date = new Date()): string {
  if (endsAt === null) {
    return 'Sin fecha de fin';
  }
  const end = new Date(endsAt);
  const year = end.getFullYear() === now.getFullYear() ? '' : ` de ${end.getFullYear()}`;
  const hours = String(end.getHours()).padStart(2, '0');
  const minutes = String(end.getMinutes()).padStart(2, '0');
  return `${end.getDate()} de ${MONTHS[end.getMonth()]}${year}, ${hours}:${minutes}`;
}

// Sin fecha de fin es un baneo; con fecha, una suspensión.
export function banTitle(ban: ActiveBan): string {
  return ban.endsAt === null ? 'Tu cuenta está baneada' : 'Tu cuenta está suspendida';
}
