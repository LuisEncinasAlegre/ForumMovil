// "hace 4 min", "ayer", "12 nov"... Lo escribimos a mano porque Intl.RelativeTimeFormat
// no está garantizado en Hermes y no vale la pena un polyfill para esto.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatTimeAgo(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const elapsed = now.getTime() - date.getTime();

  // si el reloj del teléfono va atrasado la diferencia sale negativa: también es "ahora"
  if (elapsed < MINUTE) {
    return 'ahora';
  }
  if (elapsed < HOUR) {
    return `hace ${Math.floor(elapsed / MINUTE)} min`;
  }
  if (elapsed < DAY) {
    return `hace ${Math.floor(elapsed / HOUR)} h`;
  }
  if (elapsed < 2 * DAY) {
    return 'ayer';
  }
  if (elapsed < 7 * DAY) {
    return `hace ${Math.floor(elapsed / DAY)} d`;
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
